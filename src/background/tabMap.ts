// tabMap.js

import { UrlPrefix } from '../connectors/urls'
import { Messages } from '../shared/messages'
import { BidOrigin, TabBiddingData, serializeTabsMap } from '../shared/types'
import { setActiveTab } from './sessionStorage';
import { handleMessageDeliveryError } from './errorHandling';
import { sendLog } from './log';

// Create a tab map to store tabIds and bidding data for each URL prefix
const tabMap: Map<UrlPrefix, Map<number, TabBiddingData>> = new Map();

// Export the tabMap variable
export { tabMap };

// resetTabMap resets the tabMap and sets the map's keys with url prefixes
export function resetTabMap() {
  tabMap.clear();
  // Iterate through the UrlPrefix enum and add each URL prefix to the tabMap
  for (const urlPrefix of Object.values(UrlPrefix)) {
    tabMap.set(urlPrefix, new Map());
  }
}

// getTabBiddingData is used to initialize a tabBiddingData object
export function getTabBiddingData(
  isActive: boolean,
  lastAmount?: number | undefined,
  lastBidOrigin?: BidOrigin | undefined,
  LiveBidderId?: string | undefined,
  nextBidAmountSuggestion?: number | undefined,
  startingPrice?: number | undefined,
  currentLot?: string | undefined) {
  const tabBiddingData: TabBiddingData = {
    lastUpdate: new Date(),
    lastAmount: lastAmount,
    lastBidOrigin: lastBidOrigin,
    LiveBidderId: LiveBidderId,
    nextBidAmountSuggestion: nextBidAmountSuggestion,
    startingPrice: startingPrice,
    currentLot: currentLot,
    isActive: isActive
  };
  return tabBiddingData;
}

// handleOnInstalled is called when the background script starts.
// It resets the tabMap and fills it with the currently opened tabs based on their urls
// It also sends a TabsUpdateRequest to the content scripts to get their current tabStatus
export function handleOnInstalled() {
  resetTabMap();
  // Loop through all tabs and add them to the tabMap based on their URLs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      const url = tab.url;
      if (url) {
        for (const urlPrefix of Object.values(UrlPrefix)) {
          if (url.startsWith(urlPrefix)) {
            if (tab.id) {
              setActiveTab(tab.id, true);
              addTabToMap(urlPrefix, tab.id, getTabBiddingData(true));
            }
            break;
          }
        }
      }
    });
    const tabsUpdateRequest = new Messages.TabsUpdateRequest(
      Messages.Endpoints.Background,
      Messages.Endpoints.Context);
    sendActionToTabs(tabsUpdateRequest);
  });
}

// handleOnUpdated is called when a tab changes url.
// The method will remove the tab from the tabMap and re-add it
// in another url prefix key if necessary
export function handleOnUpdated(tabId: number, tab: chrome.tabs.Tab) {
  // Check if the tab URL matches any of the URL prefixes in the map
  for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
    if (tab.url && tab.url.startsWith(urlPrefix)) {
      // If the tab URL matches a URL prefix, update the bidding data for the tab
      const tabBiddingData = tabDataMap.get(tabId);
      if (!tabBiddingData) {
        // If the tab is not in the map, add it with initial bidding 
        if (!(process.env.NODE_ENV === 'production' && tabDataMap.size > 0)) {
          setActiveTab(tabId, true);
          tabDataMap.set(tabId, getTabBiddingData(true));
        }
      }
    } else {
      // If the tab URL does not match a URL prefix, remove the tab from the map
      tabDataMap.delete(tabId);
    }
  }
}

// handleOnRemoved is called when a tab is closed.
// The method will remove the tab from the tabMap
export function handleOnRemoved(tabId: number) {
  // Remove the tab from all URL prefixes in the map
  for (const [, tabDataMap] of tabMap.entries()) {
    setActiveTab(tabId, false);
    tabDataMap.delete(tabId);
  }
  sendCurrentTabsToPopup();
}

// getUrlPrefixFromTabId returns the UrlPrefix key of the map it's stored in
export function getUrlPrefixFromTabId(tabId: number) : UrlPrefix {
  // Check if the tab URL matches any of the URL prefixes in the map
  for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
    if (tabDataMap.get(tabId)) {
      return urlPrefix;
    }
  }
  throw new Error("Unexpected tab id revieved for getUrlPrefixFromTabId");
}

// updateTabBiddingData updates the tabBiddingData of a tab in the tabMap
// Note that in production, only one tab per UrlPrefix is allowed in the tabMap
export function updateTabBiddingData(tabId: number, tab: chrome.tabs.Tab, data: TabBiddingData) {
  // Check if the tab URL matches any of the URL prefixes in the map
  for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
    if (tab.url && tab.url.startsWith(urlPrefix)) {

      const tabBiddingData = tabDataMap.get(tabId);
      if (!tabBiddingData) {
        // If the tab is not in the map, add it with initial bidding data
        if (process.env.NODE_ENV === 'production' && tabDataMap.size > 0) {
          return;
        }
      }
      tabDataMap.set(tabId, data);
    }
  }
}
// getCurrentTabStatus returns the tabStatus of a given tabId stored in the tabMap
export function getCurrentTabStatus(tabId: number) {
  // Check if the tab URL matches any of the URL prefixes in the map
  for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
    const tabBiddingData = tabDataMap.get(tabId);
    if (tabBiddingData) {
      return tabBiddingData;
    }
  }
  return undefined;
}

// updateTabIsActive will update the active property of a tabStatus stored in the tabMap based on the given tabId
export function updateTabIsActive(tabId: number, isActive: boolean) {
  // Check if the tab URL matches any of the URL prefixes in the map
  for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
    const tabBiddingData = tabDataMap.get(tabId);
    if (tabBiddingData) {
      tabBiddingData.isActive = isActive
      tabDataMap.set(tabId, tabBiddingData);
      break;
    }
  }
}



// addTabToMap will add a tabBiddingData to the tabMap
function addTabToMap(urlPrefix: UrlPrefix, tabId: number, biddingData: TabBiddingData) {
  if (!tabMap.has(urlPrefix)) {
    tabMap.set(urlPrefix, new Map());
  }
  const tabDataMap = tabMap.get(urlPrefix);
  if (tabDataMap) {
    if (!(process.env.NODE_ENV === 'production' && tabDataMap.size > 0)) {
      tabDataMap.set(tabId, biddingData);
    }
  }
}

// sendActionToTabs will inject a function call into all tabs based on a clerkMessage
// It's possible to exclude a tab based by specifying the excludingTabId param
export function sendActionToTabs(msg: any, excludingTabId?: number) {
  const message = Messages.ClerkMessage.CastMessage(msg);
  switch (message.getType()) {
    case Messages.MessageTypes.SetStartingPrice: {
      let setStartingPriceMessage = Messages.SetStartingPrice.CastMessage(msg);
      for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
        for (const [tabId, tabDataMap] of tabMap.get(urlPrefix)?.entries() ?? []) {
          if ((typeof excludingTabId !== undefined &&
            excludingTabId === tabId) ||
            !tabDataMap.isActive) {
            continue;
          }
          // The timeout ensures that all tabs recieve the actions successively, as quickly as possible
          // That prevents a potential autobid from injecting a floor bid in another tab before the
          // setStartingPrice is sent to the other tab
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId },
              args: [setStartingPriceMessage.value],
              // @ts-ignore
              func: (...args) => window.connector.setStartingPrice(args[0]),
            });
          }, 0);
        }

      }
      break;
    }
    case Messages.MessageTypes.PlaceBid: {
      let placeBidMessage = Messages.PlaceBid.CastMessage(msg);
      for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
        for (const [tabId, tabDataMap] of tabMap.get(urlPrefix)?.entries() ?? []) {
          if ((typeof excludingTabId !== undefined &&
            excludingTabId === tabId) ||
            !tabDataMap.isActive) {
            continue;
          }

          // If the message comes from the background (automatic bid generated after a live bid occured)
          // We first check that the tab we are sending it to is not already in the correct state
          // This will prevent issues during bid deletions 

          if (placeBidMessage.from == Messages.Endpoints.Background &&
            tabDataMap.lastBidOrigin == placeBidMessage.bidOrigin &&
            tabDataMap.lastAmount == placeBidMessage.bidValue) {
            continue;
          }

          // The timeout ensures that all tabs recieve the actions successively, as quickly as possible
          // That prevents a potential autobid from injecting a floor bid in another tab before the
          // placeBid is sent to the other tab
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId },
              args: [placeBidMessage.bidValue],
              // @ts-ignore
              func: (...args) => window.connector.placeBid(args[0]),
            });
          }, 0);
        }
      }
      break;
    }
    case Messages.MessageTypes.RemoveLastBid: {
      for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
        for (const [tabId, tabDataMap] of tabMap.get(urlPrefix)?.entries() ?? []) {
          if ((typeof excludingTabId !== undefined &&
            excludingTabId === tabId) ||
            !tabDataMap.isActive) {
            continue;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            // @ts-ignore
            func: () => window.connector.removeLastBid(),
          });
        }
      }
      break;
    }
    case Messages.MessageTypes.UnsoldLot: {
      for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
        for (const [tabId, tabDataMap] of tabMap.get(urlPrefix)?.entries() ?? []) {
          if ((typeof excludingTabId !== undefined &&
            excludingTabId === tabId) ||
            !tabDataMap.isActive) {
            continue;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            // @ts-ignore
            func: () => window.connector.unsoldLot(),
          });
        }
      }
      break;
    }
    case Messages.MessageTypes.Adjudicate: {
      let adjudicateMessage = Messages.Adjudicate.CastMessage(msg);
      for (const [urlPrefix, tabDataMap] of adjudicateMessage.tabsScreenshotMap.entries()) {
        for (const [tabId, tabDataMap] of adjudicateMessage.tabsScreenshotMap.get(urlPrefix)?.entries() ?? []) {
          if ((typeof excludingTabId !== undefined &&
            excludingTabId === tabId) ||
            !tabDataMap.isActive) {
            continue;
          }
          if (tabDataMap.lastBidOrigin && tabDataMap.lastAmount) {
            chrome.scripting.executeScript({
              target: { tabId },
              args: [tabDataMap.lastBidOrigin, tabDataMap.lastAmount],
              // @ts-ignore
              func: (...args) => window.connector.adjudicateLot(args[0], args[1]),
            });
            // Sending message to analytics
            chrome.tabs.get(tabId, tab => {
              sendLog(tab.url);
            });

          }
        }
      }
      break;
    }
    case Messages.MessageTypes.SetFixedIncrement: {
      let setFixedIncrementMessage = Messages.SetFixedIncrement.CastMessage(msg);
      for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
        for (const [tabId, tabDataMap] of tabMap.get(urlPrefix)?.entries() ?? []) {
          if ((typeof excludingTabId !== undefined &&
            excludingTabId === tabId) ||
            !tabDataMap.isActive) {
            continue;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            args: [setFixedIncrementMessage.value],
            // @ts-ignore
            func: (...args) => window.connector.setIncrementToFixValue(args[0]),
          });
        }
      }
      break;
    }
    case Messages.MessageTypes.SetAutoIncrement: {
      for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
        for (const [tabId, tabDataMap] of tabMap.get(urlPrefix)?.entries() ?? []) {
          if ((typeof excludingTabId !== undefined &&
            excludingTabId === tabId) ||
            !tabDataMap.isActive) {
            continue;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            // @ts-ignore
            func: () => window.connector.setIncrementToAuto(),
          });
        }
      }
      break;
    }
    case Messages.MessageTypes.FairWarning: {
      for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
        for (const [tabId, tabDataMap] of tabMap.get(urlPrefix)?.entries() ?? []) {
          if ((typeof excludingTabId !== undefined &&
            excludingTabId === tabId) ||
            !tabDataMap.isActive) {
            continue;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            // @ts-ignore
            func: () => window.connector.sendFairWarning(),
          });
        }
      }
      break;
    }
    case Messages.MessageTypes.TabsUpdateRequest: {
      for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
        for (const [tabId, tabDataMap] of tabMap.get(urlPrefix)?.entries() ?? []) {
          if (typeof excludingTabId !== undefined &&
            excludingTabId === tabId) {
            continue;
          }
          chrome.scripting.executeScript({
            target: { tabId },
            // @ts-ignore
            func: () => window.forceTabUpdate(true),
          });
        }
      }
      break;
    }
  }
}

// sendCurrentTabsToPopup serializes the tabMap and sends it via an updateTabMessage message to the popup
export function sendCurrentTabsToPopup() {
  const serializedMap = serializeTabsMap(tabMap);
  var updateTabMessage = new Messages.TabsUpdate(
    Messages.Endpoints.Background,
    Messages.Endpoints.Popup,
    serializedMap
  );
  chrome.runtime.sendMessage(updateTabMessage, (response) => {
    // Check for an error in the last runtime API call
    if (chrome.runtime.lastError) {
      handleMessageDeliveryError(chrome.runtime.lastError);
    }
  });
}
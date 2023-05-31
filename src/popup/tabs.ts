import { UrlPrefix } from '../connectors/urls';
import { Toolbox } from '../content/toolbox';
import { Messages } from '../shared/messages';
import { BidOrigin, TabBiddingData, deserializeTabsMap } from "../shared/types";
import { nextBidAmountSuggestionButton, numberWithSeparator, updateStoredNextBidAmount } from "./popup"

// LOCAL_STORAGE_CURRENT_SOURCE_TAB is the name of the storage key used to store the current active tab
const LOCAL_STORAGE_CURRENT_SOURCE_TAB = "sourceTabId";

// currentTabMap is the tab status map recieved from the background
export let currentTabMap: Map<UrlPrefix, Map<number, TabBiddingData>>;

// initializeTabTableView sends a TabsUpdateRequest to the background
// This will trigger an other message in response, handled in initMessageBackgroundMessageListners (popup.ts)
export function initializeTabTableView(): void {
  const tabsUpdateRequest = new Messages.TabsUpdateRequest(
    Messages.Endpoints.Popup,
    Messages.Endpoints.Background);
  chrome.runtime.sendMessage(tabsUpdateRequest);
}

// updateTabsMapAndSuggestedBid generates the html for the stored tab map
// It retrieves the current source tab from the local storage 
// and not in the session storage (because the background doesn't need it)
// if no active tab is set, we initilize it with the first tab of the map.
// Then, the method generates all HTML elements for tabs and injects it into the statusContainer 
export function updateTabsMapAndSuggestedBid(tabMap: Map<UrlPrefix, Map<number, TabBiddingData>>): void {
  let statusContainerElement = document.getElementById("statusContainer")
  if (!statusContainerElement) {
    console.error("could not find element with id statusContainer");
    return
  }

  // Retrieving the current source tabId from local storage and making sure that the tab still exists
  const sourceTabIdString = localStorage.getItem(LOCAL_STORAGE_CURRENT_SOURCE_TAB);
  let sourceTabId: number | undefined;
  if (sourceTabIdString) {
    let tmpSourceTabId = parseInt(sourceTabIdString);
    if (tmpSourceTabId) {
      let tabFound = false;
      for (const [, tabDataMap] of tabMap.entries()) {
        for (const [tabId,] of tabDataMap.entries() ?? []) {
          if (tabId === tmpSourceTabId) {
            tabFound = true;
            sourceTabId = tmpSourceTabId;
            break;
          }
        }
        if (tabFound) break;
      }
      if (!tabFound) {
        localStorage.removeItem(LOCAL_STORAGE_CURRENT_SOURCE_TAB);
      }
    }
  }
  statusContainerElement.innerHTML = '';
  for (const [urlPrefix, tabDataMap] of tabMap.entries()) {
    for (const [tabId, TabBiddingData] of tabDataMap.entries() ?? []) {
      if (!sourceTabId) {
        sourceTabId = tabId;
        localStorage.setItem(LOCAL_STORAGE_CURRENT_SOURCE_TAB, String(tabId));
      }
      if (sourceTabId && tabId == sourceTabId) updateNextBidAmountSuggestion(TabBiddingData.nextBidAmountSuggestion)
      let statusElement = generateStatusElement(urlPrefix,
        TabBiddingData,
        sourceTabId == tabId,
        tabId);
      statusContainerElement.appendChild(statusElement);
    }
  }
}

function updateNextBidAmountSuggestion(nextBidAmountSuggestion: number | undefined) {
  if (nextBidAmountSuggestion) {
    if (nextBidAmountSuggestionButton) {
      updateStoredNextBidAmount(nextBidAmountSuggestion);
    }
  } else {
    nextBidAmountSuggestion = undefined;
  }
  var getI18nMsg = chrome.i18n.getMessage;
  if (nextBidAmountSuggestionButton && nextBidAmountSuggestion !== undefined) nextBidAmountSuggestionButton.innerHTML = getI18nMsg('nextBidAmountSuggestionButton', [numberWithSeparator(nextBidAmountSuggestion, ' ')]);
  if (nextBidAmountSuggestionButton && nextBidAmountSuggestion === undefined) nextBidAmountSuggestionButton.innerHTML = getI18nMsg('nextBidAmountSuggestionButtonEmpty');
}

export function deserializeAndStoreTabMap(serializedTabMap: string): Map<UrlPrefix, Map<number, TabBiddingData>> {

  // Deserialize the Map of Maps from the JSON-serializable data
  const deserializedTabMap = deserializeTabsMap(serializedTabMap);
  currentTabMap = deserializedTabMap;
  return deserializedTabMap;
}

// generateStatusElement generates the HTML of a tab status line with actions (set active tab and go to tab)
function generateStatusElement(urlPrefix: string,
  tabBiddingData: TabBiddingData,
  issourceTab: boolean,
  tabId: number): HTMLDivElement {

  var getI18nMsg = chrome.i18n.getMessage;
  const provider = getUrlPrefixDisplayName(urlPrefix);
  const lastAmount = tabBiddingData.lastAmount !== undefined ? numberWithSeparator(tabBiddingData.lastAmount, ' ') : '';
  const currentLot = tabBiddingData.currentLot ? tabBiddingData.currentLot : '';
  const startingPrice = tabBiddingData.startingPrice !== undefined ? numberWithSeparator(tabBiddingData.startingPrice, ' ') : '';
  let origin = "";
  let liveBidderId = "";
  if (startingPrice) {
    origin = getI18nMsg('TabStatusStartingPrice');
  } else {
    if (tabBiddingData.lastBidOrigin) {
      if (tabBiddingData.lastBidOrigin === BidOrigin.Live) {
        origin = getI18nMsg('TabStatusBidWithOriginLive');
        liveBidderId = "(" + tabBiddingData.LiveBidderId + ")";
      } else {
        origin = getI18nMsg('TabStatusBidWithOriginLocal');
      }
    }
  }
  let nextBidAmountSuggestion = '';
  if (tabBiddingData.nextBidAmountSuggestion !== undefined) {
    nextBidAmountSuggestion = getI18nMsg('TabStatusSuggestedNextBid', [numberWithSeparator(tabBiddingData.nextBidAmountSuggestion, ' ')]);
  }

  let template = `
  <div class="statusLineLabelContainer">
  <span class="statusSource">${provider}</span>
  <span class="statusCurrentLot">${currentLot}</span>
  <div class="statusOriginContainer">
    <span class="statusOrigin ${tabBiddingData.lastBidOrigin}">${origin}<span class="statusLiveBidderId">${liveBidderId}</span></span>
  </div>
  <span class="statusLastAmount">${startingPrice !== '' ? startingPrice : lastAmount}</span>
  </div>
  
  `;
  if (tabBiddingData.nextBidAmountSuggestion !== undefined) {
    if (issourceTab) {
      template += `
      <div class="statusSuggestedBidContainerSource">
        <span class="statusNextBidAmountSuggestionSource">${nextBidAmountSuggestion}</span>
      </div>
      <div class='toggleContainerSource'>
        <div class='toggle-obj' id='switch'>
          <div class='toggle-text-off'>OFF</div>
          <div class='glow-comp'></div>
          <div class='toggle-button'></div>
          <div class='toggle-text-on'>ON</div>
        </div>
      </div>
      <div class="gotoIcon">
        <img src="icons/goto.png" width="28" height="28" alt="goto">
      </div>
      `
    } else {
      template += `
      <div class="statusSuggestedBidContainerNotSource">
        <button class="statusNextBidAmountSuggestionNotSource" tabId=${tabId}>${nextBidAmountSuggestion}</button>
      </div>
      <div class='toggleContainerNotSource'>
        <div class='toggle-obj' id='switch'>
          <div class='toggle-text-off'>OFF</div>
          <div class='glow-comp'></div>
          <div class='toggle-button'></div>
          <div class='toggle-text-on'>ON</div>
        </div>
      </div>
      <div class="gotoIcon">
        <img src="icons/goto.png" width="28" height="28" alt="goto">
      </div>
      `
    }
  }

  const newStatusElement = document.createElement('div');
  newStatusElement.classList.add('statusLine');
  newStatusElement.setAttribute("tabId", tabId.toString())

  newStatusElement.innerHTML = template;
  if (tabBiddingData.isActive) {
    newStatusElement.classList.add('toggle-on');
    Toolbox.findFirstElementByClassNameContainingString("toggle-obj", newStatusElement)?.classList.add('toggle-on');

  }
  if (!issourceTab && tabBiddingData.nextBidAmountSuggestion !== undefined) {
    newStatusElement.getElementsByClassName("statusNextBidAmountSuggestionNotSource")[0].addEventListener("click", (event) => {
      const tabId = newStatusElement.getAttribute("tabId");
      if (tabId) {
        localStorage.setItem(LOCAL_STORAGE_CURRENT_SOURCE_TAB, tabId);
        initializeTabTableView();
      }
    });

  }

  if (tabBiddingData.nextBidAmountSuggestion !== undefined) {
    newStatusElement.getElementsByClassName("toggle-obj")[0].addEventListener("click", (event) => {
      newStatusElement.classList.toggle("toggle-on");
      Toolbox.findFirstElementByClassNameContainingString("toggle-obj", newStatusElement)?.classList.toggle('toggle-on');
      const isActive = newStatusElement.classList.contains("toggle-on")
      const tabId = newStatusElement.getAttribute("tabId");
      if (tabId) {
        const tabOnOffMessage = new Messages.TabOnOff(Messages.Endpoints.Popup,
          Messages.Endpoints.Background, parseInt(tabId), isActive)
        chrome.runtime.sendMessage(tabOnOffMessage);
      }
    });

    newStatusElement.getElementsByClassName("gotoIcon")[0].addEventListener("click", (event) => {
      const tabId = newStatusElement.getAttribute("tabId");
      if (tabId) {
        const gotoTabMessage = new Messages.GotoTab(Messages.Endpoints.Popup,
          Messages.Endpoints.Background, parseInt(tabId))
        chrome.runtime.sendMessage(gotoTabMessage);
      }
    });
  }

  return newStatusElement;
}

// getUrlPrefixDisplayName returns the display name of a tab url prefix based on the key value of the UrlPrefix enum
export function getUrlPrefixDisplayName(url: string): string | undefined {
  return Object.keys(UrlPrefix)[Object.values(UrlPrefix).indexOf(url as UrlPrefix)]
}
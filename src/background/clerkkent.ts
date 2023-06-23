
// content.ts
import { Messages } from '../shared/messages';
import { BidOrigin, serializeTabsMap } from '../shared/types';
import { isExtensionOn, isTabActive, setActiveTab, setExtensionOnOff } from './sessionStorage';
import { debugStorage } from './log';
import {
  handleOnInstalled,
  handleOnRemoved,
  handleOnUpdated,
  sendActionToTabs,
  updateTabBiddingData,
  getTabBiddingData,
  sendCurrentTabsToPopup,
  tabMap,
  updateTabIsActive,
  getCurrentTabStatus,
  checkForOtherExistingLiveBidAtAtLeast,
} from './tabMap'
import { handleMessageDeliveryError } from './errorHandling';

// On background initialization
chrome.runtime.onInstalled.addListener(() => {
  debugStorage();
  handleOnInstalled();
});

// Add an event listener for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  handleOnUpdated(tabId, tab);
});

// Add an event listener for when a tab is removed
chrome.tabs.onRemoved.addListener((tabId) => {
  handleOnRemoved(tabId);
});

// Listening for messages from content scripts and popups
chrome.runtime.onMessage.addListener(function (msg: any, sender, sendResponse) {
  const message = Messages.ClerkMessage.CastMessage(msg);
  switch (message.getType()) {

    case Messages.MessageTypes.TabsUpdateRequest: {
      if (tabMap.size == 0) {
        // detecting empty map in background because the background service was restarted due to inactivity. 
        // Therefore the background service requests tabs to update
        handleOnInstalled();
      } else {
        const serializedMap = serializeTabsMap(tabMap);
        sendCurrentTabsToPopup();
      }
      break;
    }
    case Messages.MessageTypes.ExtensionOnOffRequest: {
      // The popup requests the current status of the extension's killswitch
      isExtensionOn().then(isActive => {
        const extensionOnOffMessage = new Messages.ExtensionOnOff(
          Messages.Endpoints.Background,
          Messages.Endpoints.Popup,
          isActive
        );
        chrome.runtime.sendMessage(extensionOnOffMessage, (response) => {
          // Check for an error in the last runtime API call
          if (chrome.runtime.lastError) {
            handleMessageDeliveryError(chrome.runtime.lastError);
          }
        });
      });
      break;
    }
    case Messages.MessageTypes.ExtensionOnOff: {
      // The popup notifies the background that the killswitch was triggered
      const extensionOnOffMessage = Messages.ExtensionOnOff.CastMessage(msg);
      setExtensionOnOff(extensionOnOffMessage.isActive).then((isActive) => {
        const extensionOnOffMessageResponse = new Messages.ExtensionOnOff(
          Messages.Endpoints.Background,
          Messages.Endpoints.Popup,
          isActive
        );
        // the script sends back the state of the killswitch to the popup so that
        // we are sure the popup and the background are aligned
        chrome.runtime.sendMessage(extensionOnOffMessageResponse, (response) => {
          // Check for an error in the last runtime API call
          if (chrome.runtime.lastError) {
            handleMessageDeliveryError(chrome.runtime.lastError);
          }
        });
      });
      break;
    }
    case Messages.MessageTypes.Ping: {
      // the content script sends a periodic ping to keep it and the background service alive
      break;
    }
    case Messages.MessageTypes.TabUpdate: {
      // the content script sends a tabUpdate when it's tab status changed.
      // Occures instead of a ping if there was any change in the tab status or if the
      // connector's element to watch has changed
      if (!sender.tab) {
        console.error('unexpected message : lastBidUpdate has no tab');
        break;
      }
      const tabId = sender.tab ? sender.tab.id : null;
      if (!tabId) {
        console.error('unexpected message : lastBidUpdate has no tab origin');
        break;
      }
      const tabUpdateMessage = Messages.TabUpdate.CastMessage(msg);
      // if the tab sending the update is active, the background might need to send actions
      // to other tabs
          if (sender.tab) {
            const currentTabStatus = getCurrentTabStatus(tabId);
            if (currentTabStatus && currentTabStatus.isActive) {
              updateTabBiddingData(tabId, sender.tab, getTabBiddingData(
                currentTabStatus.isActive,
                tabUpdateMessage.bidValue,
                tabUpdateMessage.bidOrigin,
                tabUpdateMessage.LiveBidderId,
                tabUpdateMessage.nextBidAmountSuggestion,
                tabUpdateMessage.startingPrice,
                tabUpdateMessage.currentLot));
              // If the updated tab has a live bid and no other provider has a live bid at this value or more, we push a local bid to them
              if (               
                tabUpdateMessage.bidValue != undefined &&
                tabUpdateMessage.bidOrigin == BidOrigin.Live &&
                sender.tab.id && 
                !checkForOtherExistingLiveBidAtAtLeast(sender.tab.id, tabUpdateMessage.bidValue)) {
                
                // If the recieved update message is a live bid, we place a floor bid in other tabs
                if (tabUpdateMessage.bidValue && currentTabStatus.isActive) {
                  const placeBidMessage = new Messages.PlaceBid(
                    Messages.Endpoints.Background,
                    Messages.Endpoints.Context,
                    tabUpdateMessage.bidValue,
                    BidOrigin.Local);
                  isExtensionOn().then(isOn => {
                    if (isOn) {
                      sendActionToTabs(placeBidMessage, tabId);
                    }
                  })
                }
              }
              // we update the popup even if the tab is not active or the extension killswitch is off
              sendCurrentTabsToPopup();
            }
          }
      break;
    }
    case Messages.MessageTypes.TabOnOff: {
      // The popup sends a TabOnOff message if the user clicks ON / OFF on a tab
      const tabOnOffMessage = Messages.TabOnOff.CastMessage(msg);
      setActiveTab(tabOnOffMessage.tabId, tabOnOffMessage.isActive).then(() => {
        updateTabIsActive(tabOnOffMessage.tabId, tabOnOffMessage.isActive);

        // We update the tab after 300ms so that we can see the transition effect in the popup
        // Otherwise the tab status is refreshed too quickly and we don't see it
        setTimeout(() => {
          sendCurrentTabsToPopup();
        }, 300)
      })
      break;
    }
    case Messages.MessageTypes.GotoTab: {
      // The popup sends a gotoTab message to the background if the user clicks on the ">" of a tab
      // The background script changes the active tab of the browser (changes tab) and reopens the popup
      const gotoTabMessage = Messages.GotoTab.CastMessage(msg);
      chrome.tabs.query({ active: false }, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id == gotoTabMessage.tabId) {
            chrome.tabs.update(tab.id, { active: true });
            setTimeout(() => {
              chrome.action.openPopup();
            }, 100);
          }
        });
      });
      break;
    }
    // All following messages require to dispatch actions to tabs
    case Messages.MessageTypes.RemoveLastBid:
    case Messages.MessageTypes.SetStartingPrice:
    case Messages.MessageTypes.UnsoldLot:
    case Messages.MessageTypes.FairWarning:
    case Messages.MessageTypes.Adjudicate:
    case Messages.MessageTypes.SetFixedIncrement:
    case Messages.MessageTypes.SetAutoIncrement:
    case Messages.MessageTypes.PlaceBid: {
      isExtensionOn().then(isOn => {
        if (isOn) {
          sendActionToTabs(msg);
        }
      })
      break;
    }
    default: {
      console.error('unexpected message type : ', message.getType());
    }
  }
});


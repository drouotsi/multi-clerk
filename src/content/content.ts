// content.ts
import { Messages } from '../shared/messages';
import { Connector } from '../interfaces/interface';


// Initializing the connector
let connector: Connector;
// @ts-ignore
connector = window.connector;
if (!connector) {
  throw new Error('no connector was found, please make sure to add window.connector = connector in your connector file.');
}

// Initializing observers 

const lastBidChangedElementToWatch = connector.getBidActivityElementToWatch();
let lastBidObserver = new MutationObserver(() => {
  sendTabUpdateMessage(false);
});

// Function to start observing the element to watch for changes
const startObservingElements = () => {
  // Set up the MutationObserver to watch for changes in the last bid
  if (lastBidChangedElementToWatch) {
    lastBidObserver.observe(lastBidChangedElementToWatch, { attributes: true, childList: true, characterData: true });
  } else {
    throw new Error('the getBidActivityElementToWatch method of the connector does not return an HTML element.');
  }

  // Listning to messages from background
  chrome.runtime.onMessage.addListener(function (msg: any, sender, sendResponse) {
    const message = Messages.ClerkMessage.CastMessage(msg);
    switch (message.getType()) {
      case Messages.MessageTypes.TabsUpdateRequest: {
        sendTabUpdateMessage(true);
        break;
      }
    }
  });
};

// Function to stop observing the target element for changes
const stopObservingElements = () => {
  // Check if lastBidObserver is already observing
  if (lastBidChangedElementToWatch && lastBidObserver) {
    lastBidObserver.disconnect();
  }
};

// Initializing currentTabStatus
var currentTabStatus = getCurrentTabStatus();

// statusHasChanged detects if two tabUpdate statuses are equal
function statusHasChanged(newStatus: Messages.TabUpdate): boolean {
  return !(newStatus.bidOrigin == currentTabStatus.bidOrigin
    && newStatus.LiveBidderId == currentTabStatus.LiveBidderId
    && newStatus.bidValue == currentTabStatus.bidValue
    && newStatus.nextBidAmountSuggestion == currentTabStatus.nextBidAmountSuggestion
    && newStatus.startingPrice == currentTabStatus.startingPrice
    && newStatus.currentLot == currentTabStatus.currentLot)
}

// This method is called on background startup to force the tab to send a status update
// even if the tabStatus hasn't changed
// @ts-ignore
window.forceTabUpdate = sendTabUpdateMessage(true);

// sendTabUpdateMessage will send a tabUpdate message if the tabStatus has changed
// By setting force to true, the tabUpdate will be sent even if the tabStatus is unchanged
function sendTabUpdateMessage(force?: boolean) {
  let statusChanged = false;
  
  // Call the function to send event to the background script
  var tabUpdateMessage = getCurrentTabStatus();
  statusChanged = statusHasChanged(tabUpdateMessage);
  if (force || statusChanged) {
    currentTabStatus = tabUpdateMessage;
    try {
      chrome.runtime.sendMessage(tabUpdateMessage);
    } catch (error) {
      console.error("the extension's background script is not reachable, please reload the extension and the current tab. error : ", error);
    }
  }
  return statusChanged
}

// getCurrentTabStatus uses the connector functions to get the current tabStatus
function getCurrentTabStatus() : Messages.TabUpdate{
  return new Messages.TabUpdate(
    Messages.Endpoints.Context,
    Messages.Endpoints.Background,
    connector.getLastBidAmount(),
    connector.getLastBidOrigin(),
    connector.getLastLiveBidderId(),
    connector.getNextBidAmountSuggestion(),
    connector.getCurentStartingPrice(),
    connector.getCurentLot(),
  );
}

// If the status of the tab has changed, we send the updated status, otherwise we send a ping
// This handles changes in the next suggested bid changed by user directly inside a platform
function sendPingMessage() {
  const statusChanged = sendTabUpdateMessage(false);
  if (!statusChanged) {
    var pingMessage = new Messages.Ping(
      Messages.Endpoints.Context,
      Messages.Endpoints.Background
    );
    try {
      chrome.runtime.sendMessage(pingMessage);
    } catch (error) {
      console.log("the extension's background script is not reachable, please reload the extension and the current tab. error : ", error);
      return false;
    }
  }
  return true;
}

// Create a wrapper function to handle the execution
function startPingRoutine(): void {
  const intervalId = setInterval(() => {
    if (!sendPingMessage()) {
      clearInterval(intervalId);
    }
  }, 2000); // Execute sendPingMessage every two seconds (2000 milliseconds)
}

// send ping messages to background to keep the content script alive
startPingRoutine();

// @ts-ignore
window.forceTabUpdate = () => sendTabUpdateMessage(true);

// We wait for 200ms before sending the initial tab status to the backoffice
// to make sure all elements that need some time to appear on the page are ready
window.setTimeout(() => sendTabUpdateMessage(), 200);

// Starting observers
startObservingElements();

// Function to be executed before content script is unloaded
function onContentUnload() {
  // Clean observers
  stopObservingElements()
}

// Add event listener for beforeunload event
window.addEventListener('beforeunload', onContentUnload);
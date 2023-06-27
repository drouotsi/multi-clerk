import { UrlPrefix } from '../connectors/urls';
import { Toolbox } from '../content/toolbox';
import { Messages } from '../shared/messages';
import { TabBiddingData } from "../shared/types";
import {
  extensionIsOn,
  forceExtensionIsActive,
  sendAutoIncrement,
  sendFairWarning,
  sendFixedIncrement,
  sendNextBidSuggestedAmount,
  sendPlaceBidMessage,
  sendRemoveLastBid,
  sendSetStartingPrice,
  sendUnsoldLot,
  toogleKillSwitch
} from './actions';
import {
  adjudicatePopupDisplayed,
  closeAdjudicationContainer,
  handleAdjudicate
} from './adjudication';
import {
  toggleIncrementDisplay,
  incrementPopupDisplayed
} from './increment';
import {
  deserializeAndStoreTabMap,
  updateTabsMapAndSuggestedBid,
  initializeTabTableView,
  currentTabMap
} from "./tabs";
import { toggleUnsoldLotDisplay, unsoldLotDisplayed } from './unsoldLot';


// Actions elements
export let amountInput: HTMLInputElement | null;
let bidButton: HTMLElement | null;
let removeLastBidButton: HTMLElement | null;
let adjudicateButton: HTMLElement | null;
let setStartingPriceButton: HTMLElement | null;
let setIncrementButton: HTMLElement | null;
let unsoldLotButton: HTMLElement | null;
let sendFairWarningButton: HTMLElement | null;
export let nextBidAmountSuggestionButton: HTMLButtonElement | null;
export let storedNextBidAmountSuggestion: number | undefined;

// Adjudication elements
export let validateAdjudicationButton: HTMLButtonElement | null;
let cancelAdjudicationButton: HTMLButtonElement | null;

// Increment elements
export let incrementInput: HTMLInputElement | null;
let fixedIncrementButton: HTMLButtonElement | null;
let autoIncrementButton: HTMLButtonElement | null;
let cancelIncrementButton: HTMLButtonElement | null;

// Unsold lot elements
let unsoldLotConfirmButton: HTMLButtonElement | null;
let unsoldLotCancelButton: HTMLButtonElement | null;

let storedTabMap: Map<UrlPrefix, Map<number, TabBiddingData>> | null;

// Wait for the popup window to finish loading
window.addEventListener('load', function () {

  // Request killswitch state from background and inits click listner
  initializeKillSwitch();

  // Recieve messages from background (tabUpdate and ExtensionOnOff)
  initMessageBackgroundMessageListners();

  // Initialize the tab section with prefix and amount and bid origin
  initializeTabTableView();

  // removing . + - from inputs 
  preventInputsFromRecievingSpecificChars();

  // get all HTMLElements from popup
  getAllHTMLElementsFromPopup();

  // set language based on chrome.i18n
  setLanguage();

  // display the tab status container
  if (storedTabMap) updateTabsMapAndSuggestedBid(storedTabMap);

  // handle all clicks on buttons
  addClickEventListners();

  // add keyboard listners
  addKeyboardListners();

});

// setLanguage will use google chrome i18n to set the language on all buttons and placeholders
function setLanguage() {

  var getI18nMsg = chrome.i18n.getMessage;
  // actions
  if (bidButton) bidButton.innerHTML = getI18nMsg('bidButton')
  if (removeLastBidButton) removeLastBidButton.innerHTML = getI18nMsg('removeLastBidButton')
  
  if (nextBidAmountSuggestionButton && storedNextBidAmountSuggestion === undefined) 
  nextBidAmountSuggestionButton.innerHTML = getI18nMsg('nextBidAmountSuggestionButtonEmpty');
  
  if (setStartingPriceButton) setStartingPriceButton.innerHTML = getI18nMsg('setStartingPriceButton');
  if (setIncrementButton) setIncrementButton.innerHTML = getI18nMsg('setIncrementButton');
  if (adjudicateButton) adjudicateButton.innerHTML = getI18nMsg('adjudicateButton');
  if (unsoldLotButton) unsoldLotButton.innerHTML = getI18nMsg('unsoldLotButton');
  if (sendFairWarningButton) sendFairWarningButton.innerHTML = getI18nMsg('sendFairWarningButton');
  // adjudication
  if (validateAdjudicationButton) validateAdjudicationButton.innerHTML = getI18nMsg('validateAdjudicationButton');
  if (cancelAdjudicationButton) cancelAdjudicationButton.innerHTML = getI18nMsg('cancelAdjudicationButton');
  // increment
  if (fixedIncrementButton) fixedIncrementButton.innerHTML = getI18nMsg('fixedIncrementButton');
  if (autoIncrementButton) autoIncrementButton.innerHTML = getI18nMsg('autoIncrementButton');
  if (cancelIncrementButton) cancelIncrementButton.innerHTML = getI18nMsg('cancelIncrementButton');
  if (incrementInput) incrementInput.placeholder = getI18nMsg('incrementInputPlaceholder');
  // global killswitch
  const globalKillSwitchLabel = document.getElementById('globalKillSwitchLabel') as HTMLSpanElement
  if (globalKillSwitchLabel) globalKillSwitchLabel.innerHTML = getI18nMsg('globalKillSwitchLabel');
  // unsold lot
  if (unsoldLotConfirmButton) unsoldLotConfirmButton.innerHTML = getI18nMsg('unsoldLotConfirmButton');
  if (unsoldLotCancelButton) unsoldLotCancelButton.innerHTML = getI18nMsg('unsoldLotCancelButton');
}

// initializeKillSwitch will require the stored value of the killswitch from background and add an onClick listner to it
function initializeKillSwitch() {
  const globalKillSwitch = Toolbox.getElementBySelector("#globalKillSwitch")
  if (globalKillSwitch) {
    initializeExtensionOnOff();
    Toolbox.findFirstElementByClassNameContainingString("toggle-obj", globalKillSwitch)?.addEventListener("click", (event) => {
      toogleKillSwitch();
    });
  }
}

// initializeExtensionOnOff sends an ExtensionOnOffRequest to the background to ask for the stored killswitch value
function initializeExtensionOnOff(): void {
  const ExtensionOnOffRequest = new Messages.ExtensionOnOffRequest(
    Messages.Endpoints.Popup,
    Messages.Endpoints.Background)
  chrome.runtime.sendMessage(ExtensionOnOffRequest);
}

// initMessageBackgroundMessageListners handles messages from the background
function initMessageBackgroundMessageListners() {
  chrome.runtime.onMessage.addListener(function (msg: any, sender, sendResponse) {
    const message = Messages.ClerkMessage.CastMessage(msg);
    switch (message.getType()) {
      case Messages.MessageTypes.TabsUpdate: {
        const tabsUpdateMessage = Messages.TabsUpdate.CastMessage(msg);
        storedTabMap = deserializeAndStoreTabMap(tabsUpdateMessage.serializedTabMap)
        updateTabsMapAndSuggestedBid(storedTabMap);
        break;
      }
      case Messages.MessageTypes.ExtensionOnOff: {
        const extensionOnOffMessage = Messages.ExtensionOnOff.CastMessage(msg);
        forceExtensionIsActive(extensionOnOffMessage.isActive, true);
        break;
      }
    }
  });
}

// preventInputsFromRecievingSpecificChars will intercept keypress events on the two inputs
// and prevent + - and . chars from being applied
function preventInputsFromRecievingSpecificChars() {
  // find the amount input and remove dot(.) and (+) and (-) from possible chars in the input
  amountInput = (<HTMLInputElement>document.getElementById('amountInput'));
  amountInput.addEventListener('keypress', (event) => {
    if (event.key === '.' || event.key === '+' || event.key === '-') {
      event.preventDefault();
      return false;
    }
  });

  // find the increment input and do the same
  incrementInput = (<HTMLInputElement>document.getElementById('incrementInput'));
  incrementInput.addEventListener('keypress', (event) => {
    if (event.key === '.' || event.key === '+' || event.key === '-') {
      event.preventDefault();
      return false;
    }
  });
}

// getAllHTMLElementsFromPopup gets all elements from the popup.
// this enables setting the language as well getting some elements once and for all
function getAllHTMLElementsFromPopup() {

  // find all other inputs
  bidButton = document.getElementById('bidButton');
  removeLastBidButton = document.getElementById('removeLastBidButton');
  adjudicateButton = document.getElementById('adjudicateButton');
  setStartingPriceButton = document.getElementById('setStartingPriceButton');
  setIncrementButton = document.getElementById('setIncrementButton');
  unsoldLotButton = document.getElementById('unsoldLotButton');
  sendFairWarningButton = document.getElementById('sendFairWarningButton');
  nextBidAmountSuggestionButton = document.getElementById('nextBidAmountSuggestionButton') as HTMLButtonElement | null;

  // adjuducation inputs
  validateAdjudicationButton = document.getElementById('validateAdjudicationButton') as HTMLButtonElement | null;
  cancelAdjudicationButton = document.getElementById('cancelAdjudicationButton') as HTMLButtonElement | null;

  // increment inputs
  fixedIncrementButton = document.getElementById('fixedIncrementButton') as HTMLButtonElement | null;
  autoIncrementButton = document.getElementById('autoIncrementButton') as HTMLButtonElement | null;
  cancelIncrementButton = document.getElementById('cancelIncrementButton') as HTMLButtonElement | null;

  // Unsold lot inputs
  unsoldLotConfirmButton = document.getElementById('unsoldLotConfirmButton') as HTMLButtonElement | null;
  unsoldLotCancelButton = document.getElementById('unsoldLotCancelButton') as HTMLButtonElement | null;
}

// addClickEventListners adds all click event listners from the actions, adjudication and increment containers.
// Tabstatus container actions are not handled here, see tabs.ts
function addClickEventListners() {
  bidButton?.addEventListener('click', function () {
    sendPlaceBidMessage();
  });
  setStartingPriceButton?.addEventListener('click', function () {
    sendSetStartingPrice();
  });
  removeLastBidButton?.addEventListener('click', function () {
    sendRemoveLastBid();
  });
  adjudicateButton?.addEventListener('click', function () {
    handleAdjudicate();
  });
  validateAdjudicationButton?.addEventListener('click', function () {
    handleAdjudicate();
  });
  setIncrementButton?.addEventListener('click', function () {
    toggleIncrementDisplay();
  });
  fixedIncrementButton?.addEventListener('click', function () {
    sendFixedIncrement();
  });
  autoIncrementButton?.addEventListener('click', function () {
    sendAutoIncrement();
  });
  cancelIncrementButton?.addEventListener('click', function () {
    toggleIncrementDisplay();
  });
  unsoldLotButton?.addEventListener('click', function () {
    toggleUnsoldLotDisplay();
  });
  nextBidAmountSuggestionButton?.addEventListener('click', function () {
    sendNextBidSuggestedAmount();
  });
  cancelAdjudicationButton?.addEventListener('click', function () {
    closeAdjudicationContainer();
  });
  sendFairWarningButton?.addEventListener('click', function () {
    sendFairWarning();
  });
  unsoldLotConfirmButton?.addEventListener('click', function () {
    toggleUnsoldLotDisplay();
    sendUnsoldLot();
  });
  unsoldLotCancelButton?.addEventListener('click', function () {
    toggleUnsoldLotDisplay();
  });
}

// addKeyboardListners sets the all in one keyboard event listner.
// Depending on adjudicatePopupDisplayed, incrementPopupDisplayed and extensionIsOn,
// pressed keys will have different actions.
// Note that when a digit or a backspace is detected, depending on the current focused element, the listner will
// alter or not the value of the amountInput and the incrementInput.
function addKeyboardListners() {

  // handle keyboard shortcuts
  window.addEventListener('keydown', function (event) {
    // If extension is off, we only unable setting the extension back on
    if (event.key === 'k' || event.key === 'K') {
      if (!adjudicatePopupDisplayed && !incrementPopupDisplayed) {
        toogleKillSwitch();
      }
    }
    // If the extension is on, we accept keyboard keys
    // Shortcuts for actions are only accepted depending on what is dispayed in the popup
    if (extensionIsOn) {
      if (event.key === 'Enter') {
        if (!adjudicatePopupDisplayed && !incrementPopupDisplayed && !unsoldLotDisplayed) {
          sendPlaceBidMessage();
        } else if (incrementPopupDisplayed) {
          sendFixedIncrement();
        } else if (adjudicatePopupDisplayed) {
          handleAdjudicate();
        }
      } else if (event.key === 's' || event.key === 'S') {
        if (!adjudicatePopupDisplayed && !incrementPopupDisplayed && !unsoldLotDisplayed) sendSetStartingPrice();
      } else if (event.key === '-') {
        if (adjudicatePopupDisplayed) {
          closeAdjudicationContainer();
        } else if (incrementPopupDisplayed) {
          toggleIncrementDisplay();
        } else if (unsoldLotDisplayed){
          toggleUnsoldLotDisplay();
        } else {
          sendRemoveLastBid();
        }
      } else if (event.key === '*') {
        if (!incrementPopupDisplayed) handleAdjudicate();
      } else if (event.key === '/') {
        if (unsoldLotDisplayed) {
          toggleUnsoldLotDisplay();
          sendUnsoldLot();
        } else if (!unsoldLotDisplayed) {
          toggleUnsoldLotDisplay();
        } if (incrementPopupDisplayed) {
          sendAutoIncrement();
        }
      } else if (event.key === '+') {
        if (!adjudicatePopupDisplayed && !incrementPopupDisplayed && !unsoldLotDisplayed) sendNextBidSuggestedAmount();
      } else if (event.key === 'm' || event.key === 'M') {
        if (!adjudicatePopupDisplayed && !incrementPopupDisplayed && !unsoldLotDisplayed) sendFairWarning();
      } else if (event.key === '.') {
        if (!adjudicatePopupDisplayed && !incrementPopupDisplayed && !unsoldLotDisplayed) {
          toggleIncrementDisplay();
        } else if (incrementPopupDisplayed) {
          sendFixedIncrement();
        }
      } else if (!isNaN(parseInt(event.key))) {
        if (!adjudicatePopupDisplayed && !incrementPopupDisplayed) {
          // only add to key to amountInput if it is not already focused
          amountInput = (<HTMLInputElement>document.getElementById('amountInput'));
          if (event.target !== amountInput) {
            amountInput.value += event.key;
          }
        } else if (incrementPopupDisplayed) {
          // only add to key to incrementInput if it is not already focused
          incrementInput = (<HTMLInputElement>document.getElementById('incrementInput'));
          if (event.target !== incrementInput) {
            incrementInput.value += event.key;
          }
        }
      } else if (event.key === 'Backspace') {
        if (!adjudicatePopupDisplayed && !incrementPopupDisplayed) {
          // only remove a char from amountInput if it is not already focused
          amountInput = (<HTMLInputElement>document.getElementById('amountInput'));
          if (event.target !== amountInput) {
            amountInput.value = amountInput.value.slice(0, -1);
          }
        }
        else if (incrementPopupDisplayed) {
          // only remove a char from incrementInput if it is not already focused
          incrementInput = (<HTMLInputElement>document.getElementById('incrementInput'));
          if (event.target !== incrementInput) {
            incrementInput.value = incrementInput.value.slice(0, -1);
          }
        }
      }
    }
  });
}

// updateStoredNextBidAmount is a setter for exported variable storedNextBidAmountSuggestion
export function updateStoredNextBidAmount(amount: number | undefined) {
  storedNextBidAmountSuggestion = amount;
}

// numberWithSeparator returns a number as a string that is separated every 3 digits
// 1000 => '1 000'
export function numberWithSeparator(number: number, separator: string): string {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

// showContainer will hide or display flex an element with a specific id
export function showContainer(containerId: string, visible: boolean) {
  const container = document.getElementById(containerId);
  if (container && visible) {
    container.style.display = 'flex';
  } else if (container && !visible) {
    container.style.display = 'none';
  } else {
    console.error('container not found : ', containerId);
  }
}
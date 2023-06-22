import { UrlPrefix } from "../connectors/urls";
import { Toolbox } from "../content/toolbox";
import { Messages } from "../shared/messages";
import { BidOrigin, TabBiddingData, serializeTabsMap } from "../shared/types";
import { adjudicatePopupDisplayed } from "./adjudication";
import { incrementPopupDisplayed, toggleIncrementDisplay } from "./increment";
import { amountInput, incrementInput, showContainer, storedNextBidAmountSuggestion } from "./popup";


// Extension state (globalKillSwitch ON / OFF)
export let extensionIsOn: boolean = false;

// sendFixedIncrement will send to the background the fixed increment 
// or auto increment if fixed increment is NaN or 0
export function sendFixedIncrement(): void {
    if (incrementInput) {
        const fixedIncrementValue = parseInt(incrementInput.value);
        if (isNaN(fixedIncrementValue) || fixedIncrementValue == 0) {
            sendAutoIncrement();
        } else {
            const sendFixedIncrementMessage = new Messages.SetFixedIncrement(
                Messages.Endpoints.Popup,
                Messages.Endpoints.Background,
                fixedIncrementValue);
            chrome.runtime.sendMessage(sendFixedIncrementMessage);
            toggleIncrementDisplay();
        }
    }
}

// sendAutoIncrement will send to the background the set auto increment message
export function sendAutoIncrement(): void {
    const autoIncrementMessage = new Messages.SetAutoIncrement(
        Messages.Endpoints.Popup,
        Messages.Endpoints.Background);
    chrome.runtime.sendMessage(autoIncrementMessage);
    toggleIncrementDisplay();
}

// sendExtensionIsActive sends a message to the background to specify the new state
// of the global killswitch. 
// (We could have just stored directly the value of the killswitch in the storage
// but that way the background stores is and sends back the new state to the popup.
// This way we are sure the background is in the same state as the popup)
export function sendExtensionIsActive(): void {
    const extensionIsOnOffMessage = new Messages.ExtensionOnOff(
        Messages.Endpoints.Popup,
        Messages.Endpoints.Background,
        extensionIsOn);
    chrome.runtime.sendMessage(extensionIsOnOffMessage);
}

// toogleKillSwitch will only work if no adjudication or increment containers are displayed
// If toogles extensionIsOn, switches the graphical state of the killswitch, 
// disables all action buttons and sends the new extension state to the background
export function toogleKillSwitch(): void {
    if (adjudicatePopupDisplayed || incrementPopupDisplayed) {
        return;
    }
    extensionIsOn = !extensionIsOn;
    setGlobalKillSwitchOnOff(extensionIsOn);
    enableExtensionButtonsAndInputs(extensionIsOn);
    sendExtensionIsActive();
}

// setGlobalKillSwitchOnOff graphicly sets the globalkillswitch to on or off using css
export function setGlobalKillSwitchOnOff(isActive: boolean): void {
    const globalKillSwitch = Toolbox.getElementBySelector("#globalKillSwitch");
    if (globalKillSwitch) {
        const toggleObj = Toolbox.findFirstElementByClassNameContainingString("toggle-obj", globalKillSwitch);
        if (toggleObj) {
            if (isActive) {
                toggleObj.classList.add('toggle-on');
            } else {
                toggleObj.classList.remove('toggle-on');
            }
        }
    }
}

// forceExtensionIsActive will enable or disable all buttons and inputs of the extension
// The setSwitch param, if set to true, will also graphicly update the killswitch.
// When the toggle is clicked, we don't want to force its graphical state again...
export function forceExtensionIsActive(isActive: boolean, setSwitch?: boolean): void {
    const actionsContainer = document.getElementById("actionsContainer");
    if (actionsContainer) {
        extensionIsOn = isActive;
        if (setSwitch) setGlobalKillSwitchOnOff(isActive);
        let buttons = actionsContainer.getElementsByTagName('button');
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i] as HTMLButtonElement;
            button.disabled = !isActive;
        }
        let inputs = actionsContainer.getElementsByTagName('input');
        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i] as HTMLInputElement;
            input.disabled = !isActive;
        }
    }
}

// enableExtensionButtonsAndInputs will add or remove the disabled attribute to all inputs and actions of the popup
export function enableExtensionButtonsAndInputs(enabled: boolean) {
    forceExtensionIsActive(enabled, false);
}

// sendPlaceBidMessage sends a placeBidMessage to the background
export function sendPlaceBidMessage(): void {
    // Check if the bidButton input element exists and has a non-empty value
    if (amountInput && amountInput.value && /^\d+(\.\d+)?$/.test(amountInput.value)) {
        // Create a message object with the value of the bidButton input
        const numericBidValue = parseFloat(amountInput.value);
        var placeBidMessage = new Messages.PlaceBid(
            Messages.Endpoints.Popup,
            Messages.Endpoints.Background,
            numericBidValue,
            BidOrigin.Local
        );
        chrome.runtime.sendMessage(placeBidMessage);
        emptyBidValue();
    }
}


// sendSetStartingPrice sends a SetStartingPrice message to the background
export function sendSetStartingPrice(): void {
    // Check if the bidButton input element exists and has a non-empty value
    if (amountInput && amountInput.value && /^\d+(\.\d+)?$/.test(amountInput.value)) {
        // Create a message object with the value of the input
        const value = parseFloat(amountInput.value);
        var setStartingPrice = new Messages.SetStartingPrice(
            Messages.Endpoints.Popup,
            Messages.Endpoints.Background,
            value);
        chrome.runtime.sendMessage(setStartingPrice);
        emptyBidValue();
    }
}

// sendRemoveLastBid sends a RemoveLastBid message to the background
export function sendRemoveLastBid(): void {
    const removeLastBidMessage = new Messages.RemoveLastBid(
        Messages.Endpoints.Popup,
        Messages.Endpoints.Background);
    chrome.runtime.sendMessage(removeLastBidMessage);
}

// sendUnsoldLot sends an UnsoldLot message to the background
export function sendUnsoldLot(): void {
    emptyBidValue();
    const unsoldLotMessage = new Messages.UnsoldLot(
        Messages.Endpoints.Popup,
        Messages.Endpoints.Background);
    chrome.runtime.sendMessage(unsoldLotMessage);
}

// sendNextBidSuggestedAmount sends a PlaceBid message to the background with the amount
// of the suggested bid amount (+)
export function sendNextBidSuggestedAmount(): void {
    if (storedNextBidAmountSuggestion) {
        var placeBidMessage = new Messages.PlaceBid(
            Messages.Endpoints.Popup,
            Messages.Endpoints.Background,
            storedNextBidAmountSuggestion,
            BidOrigin.Local
        );
        chrome.runtime.sendMessage(placeBidMessage);
        emptyBidValue();
    }
}

// sendFairWarning sends a FaiWarning message to the background
export function sendFairWarning(): void {
    const fairWarningMessage = new Messages.FaiWarning(
        Messages.Endpoints.Popup,
        Messages.Endpoints.Background);
    chrome.runtime.sendMessage(fairWarningMessage);
}

// sendAdjudicate sends an Adjudicate message to the background
export function sendAdjudicate(screenshot: Map<UrlPrefix, Map<number, TabBiddingData>>): void {
    emptyBidValue();
    const serializedMap = serializeTabsMap(screenshot);
    const adjudicateMessage = new Messages.Adjudicate(
        Messages.Endpoints.Popup,
        Messages.Endpoints.Background,
        serializedMap);
    chrome.runtime.sendMessage(adjudicateMessage);
}

// emptyBidValue empties the content of the amount input
function emptyBidValue(): void {
    if (amountInput) {
        amountInput.value = '';
    }
}
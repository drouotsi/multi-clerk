import { UrlPrefix } from "../connectors/urls";
import { BidOrigin, TabBiddingData } from "../shared/types";
import { sendAdjudicate } from "./actions";
import { numberWithSeparator, showContainer, validateAdjudicationButton } from "./popup";
import { currentTabMap, getUrlPrefixDisplayName } from "./tabs";

// tabsScreenshot is a screenshot of the tabs map that is initialized when the user clicks on adjudicate
// If the user confirms the adjudication, this screenshot will be used to send the adjudication message
// to the concerned tabs. Any new live bids comming from platorms in the meantime will therefore be ignored.
let tabsScreenshot: Map<UrlPrefix, Map<number, TabBiddingData>>;

// adjudicatePopupDisplayed is the state of the adjudication popup
// It is used for blocking and enabling keyboard shortcuts
export let adjudicatePopupDisplayed = false;

// setAdjudicateContainer will display all lines of the tabsScreenshot inside the adjudication popup
export function setAdjudicateContainer() {
  if (validateAdjudicationButton) validateAdjudicationButton.disabled = false;
  tabsScreenshot = new Map(currentTabMap);
  let statusContainerElement = document.getElementById("adjudicationStatusContainer")
  if (!statusContainerElement) {
    console.error("could not find element with id statusContainer");
    return
  }
  statusContainerElement.innerHTML = '';
  let winner: TabBiddingData | undefined = undefined;
  let liveBidderWinnerFound: boolean = false;
  let winnerUrlPrefix: UrlPrefix | undefined;
  let incoherenceFound: boolean = false;
  let liveWinningAmout: number | undefined = undefined;
  let floorWinningAmout: number | undefined = undefined;

  for (const [urlPrefix, tabDataMap] of tabsScreenshot.entries()) {
    for (const [tabId, TabBiddingData] of tabDataMap.entries() ?? []) {
      if (TabBiddingData.lastBidOrigin && TabBiddingData.isActive) {
        if (TabBiddingData.lastBidOrigin == BidOrigin.Live) {
          if (!liveBidderWinnerFound) {
            liveWinningAmout = TabBiddingData.lastAmount;
            liveBidderWinnerFound = true;
            winner = TabBiddingData;
            winnerUrlPrefix = urlPrefix;
          } else {
            incoherenceFound = true;
            break;
          }
        } else {
          if (TabBiddingData.lastAmount != undefined && TabBiddingData.lastAmount > (floorWinningAmout ? floorWinningAmout : 0)) {
            floorWinningAmout = TabBiddingData.lastAmount;
            if (!liveBidderWinnerFound) {
              winner = TabBiddingData;
              winnerUrlPrefix = urlPrefix;
            }
          }
        }
      }
    }
  }

  if (liveBidderWinnerFound && !liveWinningAmout) {
    incoherenceFound = true;
  }
  if (liveBidderWinnerFound && liveWinningAmout !== undefined &&
    floorWinningAmout != undefined && floorWinningAmout > liveWinningAmout) {
    incoherenceFound = true;
  }
  if (!liveBidderWinnerFound && floorWinningAmout === undefined) {
    let messageElement = generateAdjudicationMessage("nothingToAdjudicateMessage");
    statusContainerElement.appendChild(messageElement);
    // TODO : Disable adjudicate button
    if (validateAdjudicationButton) validateAdjudicationButton.disabled = true;
    
  } else if (incoherenceFound) {
    let messageElement = generateAdjudicationMessage("incoherenceInAdjudicationMessage");
    statusContainerElement.appendChild(messageElement);
    // TODO : Disable adjudicate button
    if (validateAdjudicationButton) validateAdjudicationButton.disabled = true;
  } else if (winner) {
    let statusElement = generateAdjudicationStatusElement(winnerUrlPrefix, winner);
    statusContainerElement.appendChild(statusElement);
  }
}

function generateAdjudicationMessage(type : string) {
  var getI18nMsg = chrome.i18n.getMessage;
  let message = getI18nMsg(type);
  let template = `<span class="${type}">${message}</span>`;
  const messageElement = document.createElement('div');
  messageElement.classList.add('adjudicationMessage');
  messageElement.innerHTML = template;
  return messageElement
}

// generateAdjudicationStatusElement generates a single tab of the tabsScreenshot
function generateAdjudicationStatusElement(urlPrefix: string | undefined,
  tabBiddingData: TabBiddingData): HTMLDivElement {

  const provider = urlPrefix && tabBiddingData.lastBidOrigin == BidOrigin.Live ? getUrlPrefixDisplayName(urlPrefix) : undefined;
  var origin = "";
  let liveBidderId = "";
  var getI18nMsg = chrome.i18n.getMessage;
  if (tabBiddingData.lastBidOrigin === BidOrigin.Live) {
    origin = getI18nMsg('TabStatusBidWithOriginLive');
    liveBidderId = "(" + tabBiddingData.LiveBidderId + ")";
  } else {
    origin = getI18nMsg('TabStatusBidWithOriginLocal');
  }
  const lastAmount = tabBiddingData.lastAmount ? numberWithSeparator(tabBiddingData.lastAmount, ' ') : "";
  const currentLot = tabBiddingData.currentLot ? tabBiddingData.currentLot : "";
  let template = `<span class="adjudicationStatusCurrentLot">${currentLot}</span>`;
  if (provider) {
    template += `<span class="adjudicationStatusSource">${provider}</span>`;
  }

  template += `
  <span class="adjudicationstatusOrigin ${origin}" style="background-color:${tabBiddingData.LiveBidderColor}">${origin}<span class="adjudicationstatusLiveBidderId">${liveBidderId}</span></span>
  <span class="adjudicationstatusLastAmount">${lastAmount}</span>
  `;
  const newStatusElement = document.createElement('div');
  newStatusElement.classList.add('adjudicationStatusLine');
  if (tabBiddingData.lastBidOrigin == BidOrigin.Live) newStatusElement.classList.add(origin);
  newStatusElement.innerHTML = template;
  return newStatusElement;
}

// handleAdjudicate will either show the adjudication popup or execute the
// adjudication and hide the popup, based on the value of adjudicatePopupDisplayed.
// It is called by the two adjudicate buttons / actions
export function handleAdjudicate(): void {
  if (adjudicatePopupDisplayed) {
    sendAdjudicate(tabsScreenshot);
    showContainer("incrementContainer", false);
    showContainer("adjudicationPopupContainer", false);
    showContainer("actionsContainer", true);
  } else {
    setAdjudicateContainer();
    showContainer("incrementContainer", false);
    showContainer("adjudicationPopupContainer", true);
    showContainer("actionsContainer", false);
  }
  adjudicatePopupDisplayed = !adjudicatePopupDisplayed;
}

// closeAdjudicationContainer will close the adjudication popup if it's canceled
export function closeAdjudicationContainer(): void {
  showContainer("adjudicationPopupContainer", false);
  showContainer("actionsContainer", true);
  adjudicatePopupDisplayed = false;
}
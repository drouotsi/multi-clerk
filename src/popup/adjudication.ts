import { UrlPrefix } from "../connectors/urls";
import { BidOrigin, TabBiddingData } from "../shared/types";
import { sendAdjudicate } from "./actions";
import { numberWithSeparator, showContainer } from "./popup";
import { currentTabMap, getUrlPrefixDisplayName } from "./tabs";

// tabsScreenshot is a screenshot of the tabs map that is initialized when the user clicks on adjudicate
// If the user confirms the adjudication, this screenshot will be used to send the adjudication message
// to the concerned tabs. Any new live bids comming from platorms in the meantime will therefore be ignored.
let tabsScreenshot : Map<UrlPrefix, Map<number, TabBiddingData>>;

// adjudicatePopupDisplayed is state of the adjudication popup
// It is used for blocking and enabling keyboard shortcuts
export let adjudicatePopupDisplayed = false;

// setAdjudicateContainer will display all lines of the tabsScreenshot inside the adjudication popup
export function setAdjudicateContainer() {
  tabsScreenshot = new Map(currentTabMap);
  let statusContainerElement = document.getElementById("adjudicationStatusContainer")
  if (!statusContainerElement) {
    console.error("could not find element with id statusContainer");
    return
  }
  statusContainerElement.innerHTML = '';
  for (const [urlPrefix, tabDataMap] of tabsScreenshot.entries()) {
    for (const [tabId, TabBiddingData] of tabDataMap.entries() ?? []) {
      if (TabBiddingData.lastBidOrigin && TabBiddingData.isActive) {
        let statusElement = generateAdjudicationStatusElement(urlPrefix,
          TabBiddingData);
        statusContainerElement.appendChild(statusElement);  
      }
    }
  }
}

// generateAdjudicationStatusElement generates a single tab of the tabsScreenshot
function generateAdjudicationStatusElement(urlPrefix: string,
  tabBiddingData: TabBiddingData): HTMLDivElement {
  const provider = getUrlPrefixDisplayName(urlPrefix);
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
  const currentLot = tabBiddingData.currentLot ? tabBiddingData.currentLot: "";

  let template = `
  <span class="adjudicationStatusSource">${provider}</span>
  <span class="adjudicationStatusCurrentLot">${currentLot}</span>
  <span class="adjudicationstatusOrigin">${origin}<span class="adjudicationstatusLiveBidderId">${liveBidderId}</span></span>
  <span class="adjudicationstatusLastAmount">${lastAmount}</span>
  `;
  const newStatusElement = document.createElement('div');
  newStatusElement.classList.add('adjudicationStatusLine');
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
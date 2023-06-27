
// unsoldLotDisplayed is the state of the unsold lot confirmation popup
export let unsoldLotDisplayed = false;

import { showContainer } from "./popup";

// toggleIncrementDisplay will toggle the increment popup and clear the increment input.
// This method does not trigger an action
export function toggleUnsoldLotDisplay(): void {
  if (unsoldLotDisplayed) {
    showContainer("incrementContainer", false);
    showContainer("adjudicationPopupContainer", false);
    showContainer("unsoldLotContainer", false);
    showContainer("actionsContainer", true);
    
  } else {
    showContainer("unsoldLotContainer", true);
    showContainer("incrementContainer", false);
    showContainer("adjudicationPopupContainer", false);
    showContainer("actionsContainer", false);
  }
  unsoldLotDisplayed = !unsoldLotDisplayed;
}
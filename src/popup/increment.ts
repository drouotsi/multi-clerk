import { showContainer } from "./popup";

// incrementPopupDisplayed is state of the increment popup
// It is used for blocking and enabling keyboard shortcuts
export let incrementPopupDisplayed = false;

// toggleIncrementDisplay will toggle the increment popup and clear the increment input.
// This method does not trigger an action
export function toggleIncrementDisplay(): void {
  if (incrementPopupDisplayed) {
    showContainer("incrementContainer", false);
    showContainer("adjudicationPopupContainer", false);
    showContainer("actionsContainer", true);
  } else {
    const incrementInput = (<HTMLInputElement>document.getElementById('incrementInput'));
    if (incrementInput) {
      incrementInput.value = '';
    }
    showContainer("incrementContainer", true);
    showContainer("adjudicationPopupContainer", false);
    showContainer("actionsContainer", false);
  }
  incrementPopupDisplayed = !incrementPopupDisplayed;
}
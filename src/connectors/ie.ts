import { Toolbox } from '../content/toolbox';
import { Connector } from '../interfaces/interface';
import { BidOrigin } from "../shared/types";

const MAX_REMOVABLE_BIDS_FOR_ADJUDICATION = 2;
const MAX_REMOVABLE_BIDS_FOR_SETTING_STARTING_PRICE = 3;

class IEConnector implements Connector {

    private amountInput: HTMLInputElement | null = null;
    // TypeElement contains the type of the amount shown (Prix départ, Interencheres Live, En salle)
    private typeElement: HTMLElement | null = null;

    constructor() {
        setTimeout(() => {
            this.amountInput = Toolbox.getElementBySelector('#encherir-montant') as HTMLInputElement;
            this.typeElement = Toolbox.getElementBySelector('#type');
        }, 500);
    };

    placeBid(value: number): void {
        if (this.amountInput) {
            Toolbox.resetInput(this.amountInput);
            Toolbox.setNumberInInput(value, this.amountInput);
            const bidButton = Toolbox.getElementBySelector("#encherir-montant-choix")
            if (bidButton) {
                Toolbox.clickOnButton(bidButton);
                Toolbox.resetInput(this.amountInput);
            }
        }
    }

    setStartingPrice(value: number): void {
        let previousTypeElementValue = '';
        let previousLastBidAmount: number | undefined = -1;
        let maxRemovableBids = MAX_REMOVABLE_BIDS_FOR_SETTING_STARTING_PRICE;

        const intervalId = setInterval(async () => {
            const typeElmnt = Toolbox.getElementBySelector('#type');
            let currentTypeElementValue = '';
            if (typeElmnt && typeElmnt.innerHTML) {
                currentTypeElementValue = typeElmnt.innerHTML;
                const currentLastBidAmount = this.getStartingPriceAmount();
                if (previousTypeElementValue !== currentTypeElementValue || previousLastBidAmount !== currentLastBidAmount) {
                    if (currentTypeElementValue === 'Prix départ' && currentLastBidAmount === 0) {
                        clearInterval(intervalId); // Stop the interval when the condition is met
                        setTimeout(() => {
                            this.placeBid(value);
                        }, 10);
                        return;
                    }
                    previousTypeElementValue = currentTypeElementValue;
                    previousLastBidAmount = currentLastBidAmount;

                    maxRemovableBids--;
                    if (maxRemovableBids < 0) {
                        clearInterval(intervalId); // Stop the interval if too many bids had to be deleted
                        return
                    }
                    this.removeLastBid();
                }
            }
        }, 50);
    }


    removeLastBid(): void {

        const removeLastBidButton = Toolbox.getElementBySelector("#encherir-moins")
        if (removeLastBidButton) {
            Toolbox.clickOnButton(removeLastBidButton);
        }
    }

    adjudicateLot(origin: BidOrigin, amount: number): void {
        let previousBidOrigin: BidOrigin | undefined;
        let previousBidAmount: number | undefined = -1;
        let maxRemovableBids = MAX_REMOVABLE_BIDS_FOR_ADJUDICATION;

        const adjudButton = Toolbox.getElementBySelector("#adjudication-valide")
        if (adjudButton) {
            Toolbox.clickOnButton(adjudButton);

            setTimeout(() => {
                const intervalId = setInterval(async () => {
                    const currentBidOrigin = this.getLastBidOrigin();
                    const currentBidAmount = this.getLastBidAmount();
                    if (previousBidOrigin !== currentBidOrigin || previousBidAmount !== currentBidAmount) {
                        if (currentBidOrigin === origin && currentBidAmount === amount) {
                            clearInterval(intervalId); // Stop the interval when the condition is met

                            const confirmButton = Toolbox.getElementBySelector(".button.rouge.suivant")
                            if (confirmButton) {
                                Toolbox.clickOnButton(confirmButton);
                            }
                            return;
                        }
                        previousBidOrigin = currentBidOrigin;
                        previousBidAmount = currentBidAmount;
                        maxRemovableBids--;
                        if (maxRemovableBids < 0) {
                            clearInterval(intervalId); // Stop the interval if too many bids had to be deleted
                            return
                        }
                        this.removeLastBid();
                    }
                }, 500);
            }, 1100)
        }
    }

    unsoldLot(): void {
        const unsoldButton = Toolbox.getElementBySelector("#adjudication-invendu")
        if (unsoldButton) {
            Toolbox.clickOnButton(unsoldButton);

            setTimeout(() => {
                const cancelButton = Toolbox.getElementBySelector(".button.rouge.invendu")
                if (cancelButton) {
                    Toolbox.clickOnButton(cancelButton);
                }
            }, 1100)
        }
    }

    sendFairWarning(): void {
        // NOT POSSIBLE
    }

    getBidActivityElementToWatch(): HTMLElement {
        const lastBid = Toolbox.findFirstElementByClassNameContainingString("resultat");
        if (lastBid) {
            return lastBid;
        }
        throw new Error('the last bid element to watch was not found !');
    }

    getLastBidOrigin(): BidOrigin | undefined {
        if (this.typeElement) {
            switch (this.typeElement.innerHTML) {
                case "Interencheres Live": {
                    return BidOrigin.Live;
                }
                case "En salle": {
                    return BidOrigin.Local;
                }
            }
        }
        return undefined
    }

    getLastBidAmount(): number | undefined {
        const bidElement = Toolbox.getElementBySelector("#enchere");
        if (bidElement) {
            return parseInt(getSubstringBeforeLastSpace(bidElement.innerHTML).replace(/\s/g, ''));
        }
        return undefined;
    }

    getStartingPriceAmount(): number | undefined {
        const bidElement = Toolbox.getElementBySelector("#enchere");
        if (bidElement) {
            return parseInt(getSubstringBeforeLastSpace(bidElement.innerHTML).replace(/\s/g, ''));
        }
        return undefined;
    }

    getCurentStartingPrice(): number | undefined {
        if (this.typeElement?.innerHTML === 'Prix départ') {
            const bidElement = Toolbox.getElementBySelector("#enchere");
            if (bidElement) {
                return parseInt(getSubstringBeforeLastSpace(bidElement.innerHTML).replace(/\s/g, ''));
            }
        }
        return undefined;
    }

    getNextBidAmountSuggestion(): number | undefined {
        const nextBidSpan = Toolbox.getElementBySelector("#pas-montant");
        if (nextBidSpan) {
            const currentStep = parseInt(Toolbox.extractDigitsFromString(nextBidSpan.innerHTML));
            const currAmount = this.getLastBidAmount()
            if (currentStep !== undefined && currAmount !== undefined) {
                return currAmount + currentStep
            }
        }
        return undefined;
    }

    getCurentLot(): string | undefined {
        const currentLot = Toolbox.getElementBySelector(".current");
        if (currentLot) {
            const lotNumberTd = Toolbox.findFirstElementByClassNameContainingString("numero", currentLot)
            if (lotNumberTd) {
                return "Lot n° " + lotNumberTd.innerHTML;
            }
        }
        return undefined;
    }

    setIncrementToFixValue(value: number): void {
        const incrementButton = Toolbox.findButtonByValue("Fixe [ . ] + [ . ]")
        if (incrementButton) {
            incrementButton.click();
            setTimeout(() => {
                const incrementValueInput = Toolbox.getElementBySelector('#custom-pas-value') as HTMLInputElement;
                if (incrementValueInput) {
                    Toolbox.setNumberInInput(value, incrementValueInput);
                    const validButton = Toolbox.getElementBySelector("#custom-pas-valider")
                    if (validButton) {
                        validButton.click();
                    }
                }
            }, 0);
        }
    }

    setIncrementToAuto(): void {
        const incrementButton = Toolbox.findButtonByValue("Fixe [ . ] + [ . ]")
        if (incrementButton) {
            incrementButton.click();
            setTimeout(() => {
                const incrementValueInput = Toolbox.getElementBySelector('#custom-pas-value') as HTMLInputElement;
                if (incrementValueInput) {
                    const validButton = Toolbox.getElementBySelector("#custom-pas-reset")
                    if (validButton) {
                        validButton.click();
                    }
                }
            }, 0);
        }
    }

    getLastLiveBidderId(): string | undefined {
        if (this.getLastBidOrigin() !== BidOrigin.Live) {
            return undefined;
        }
        const bidderIdSpan = Toolbox.getElementBySelector("#encherisseur") as HTMLSpanElement
        if (bidderIdSpan?.innerHTML) {
            return bidderIdSpan.innerHTML;
        }
    }
}

var connector = new IEConnector();

// Expose the global variable using expose-loader
// @ts-ignore
window.connector = connector;

function getSubstringBeforeLastSpace(inputString: string): string {
    const lastSpaceIndex = inputString.lastIndexOf(' ');
    if (lastSpaceIndex === -1) {
        return inputString; // No spaces found, return entire input string
    }
    return inputString.substring(0, lastSpaceIndex);
}
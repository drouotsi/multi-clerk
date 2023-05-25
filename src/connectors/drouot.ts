import { Toolbox } from '../content/toolbox';
import { Connector } from '../interfaces/interface';
import { BidOrigin } from "../shared/types";

const FRENCH_FLOOR_LABEL = 'Salle'
const ENGLISH_FLOOR_LABEL = 'Auction room ';
const FRENCH_LIVE_LABEL = 'Internet -'
const ENGLISH_LIVE_LABEL = 'Internet'


class DrouotConnector implements Connector {


    private amountInput: HTMLInputElement | null = null;
    private bidList: HTMLElement | null = null;
    constructor() {

        setTimeout(() => {
            // finding the amount input HTMLInputElement
            const elements = Toolbox.findAllElementsByClassNameContainingString("style__Input");
            if (!elements) {
                throw new Error('No element found with css class name containing style__Input');
            }
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i] as HTMLInputElement;
                if (element && element?.parentElement?.parentElement) {
                    const classNames = element.parentElement.parentElement.classList;
                    for (let j = 0; j < classNames.length; j++) {
                        if (classNames[j].includes("ContainerBoutonLeft")) {
                            this.amountInput = element;
                        }
                    }
                }
            }
            if (!this.amountInput) {
                throw new Error('No input found with css class name containing style__Input and having parent of parent with class ContainerBoutonLeft');
            }
        }, 500);
    }

    getCurentStartingPrice(): number | undefined {
        if (this.bidList) {
            let lastDiv = Toolbox.getLastDirectChildWithTagName(this.bidList, 'DIV');
            if (lastDiv) {
                const startingPriceAmount = Toolbox.findLastElementByClassNameContainingString("StartingPriceItem__Amount", lastDiv)?.getElementsByTagName('span')[0].getElementsByTagName('span')[0];
                if (startingPriceAmount) {
                    return parseInt(Toolbox.extractDigitsFromString(startingPriceAmount.innerHTML).replace(/\s/g, ''));
                }
            }
        }
        return undefined;
    }

    getCurentLot(): string | undefined {
        const currLot = Toolbox.findFirstElementByClassNameContainingString("style__LotNum");
        if (currLot) {
            return currLot.innerHTML;
        }
        return undefined;
    }

    placeBid(value: number): void {
        if (!isNaN(value) && this.amountInput) {
            const backspaces = Toolbox.getBackspaceKeysNeededToEmptyInput(this.amountInput);
            const numericArray = value.toString().split('').concat(['Enter']);
            Toolbox.pressKeys(backspaces.concat(numericArray));
        } else {
            console.error("amountInput not found");
        }
        this.clearFairWarningMessage();
    }

    setStartingPrice(value: number): void {
        if (!isNaN(value) && this.amountInput) {
            const backspaces = Toolbox.getBackspaceKeysNeededToEmptyInput(this.amountInput);
            const numericArray = value.toString().split('').concat(['.']);
            Toolbox.pressKeys(backspaces.concat(numericArray));
        } else {
            console.error("amountInput not found");
        }
    }

    removeLastBid(): void {
        Toolbox.pressKeys(["-"]);
    }

    elementIsBid(element: HTMLElement) {
        return Toolbox.findFirstElementByClassNameContainingString("BidItem__Text", element) != null
    }

    elementBidMatches(element: HTMLElement, origin: BidOrigin, amount: number): boolean {
        let originMatch = false;
        let amountMatch = false;
        let originSpan = Toolbox.findLastElementByClassNameContainingString("BidItem__Text", element)?.getElementsByTagName('span')[0];
        let amountDiv = Toolbox.findLastElementByClassNameContainingString("BidItem__Amount", element);
        if (amountDiv) {
            let amountSpan = Toolbox.getLastDirectChildWithTagName(Toolbox.getLastDirectChildWithTagName(amountDiv, 'SPAN'), 'SPAN');
            if (amountSpan?.innerHTML.length && amountSpan?.innerHTML.length >= 0) {
                if (amount === parseInt(Toolbox.extractDigitsFromString(amountSpan.innerHTML))) {
                    amountMatch = true;
                }
            }
        }
        if (originSpan?.innerHTML) {
            if ((originSpan.innerHTML === FRENCH_FLOOR_LABEL && origin === BidOrigin.Local) ||
                (originSpan.innerHTML === ENGLISH_FLOOR_LABEL && origin === BidOrigin.Local) ||
                (originSpan.innerHTML === FRENCH_LIVE_LABEL && origin === BidOrigin.Live) ||
                (originSpan.innerHTML === ENGLISH_LIVE_LABEL && origin === BidOrigin.Live)) {
                originMatch = true;
            }
        }
        return originMatch && amountMatch
    }

    adjudicateLot(origin: BidOrigin, amount: number): void {
        if (this.bidList) {
            let climbingBid = Toolbox.getLastDirectChildWithTagName(this.bidList, 'DIV');
            // We will iterate through the bid list elements, starting from the bottom, 
            // until we find the correct bid or hit an element that is not a bid (Lot / starting price)
            while (climbingBid) {

                if (this.elementIsBid(climbingBid)) {
                    if (this.elementBidMatches(climbingBid, origin, amount)) {
                        Toolbox.getLastDirectChildWithTagName(climbingBid, 'DIV')?.focus();
                        Toolbox.getLastDirectChildWithTagName(climbingBid, 'DIV')?.click();
                        setTimeout(() => Toolbox.pressKeys(["*"]), 100);
                        this.clearFairWarningMessage();
                        break;
                    } else {
                        climbingBid = Toolbox.getPreviousSibling(climbingBid) as HTMLDivElement;
                    }
                } else {
                    console.error("bid not found for adjudication");
                    break;
                }
            }
        }
    }

    unsoldLot(): void {
        Toolbox.pressKeys(["/"]);
        this.clearFairWarningMessage();
    }

    sendFairWarning(): void {
        const deleteImg = Toolbox.findImageByAlt("Delete");
        if (!deleteImg) {
            this.clickOnSendMessage();
            return;
        }
        deleteImg.parentElement?.click();
        setTimeout(() => this.clickOnSendMessage(), 100);
        return;
    }

    getBidActivityElementToWatch(): HTMLElement {
        this.bidList = <HTMLElement>Toolbox.findFirstElementByClassNameContainingString("style__ColBidAuction")?.getElementsByTagName('div')[0].getElementsByTagName('div')[2].getElementsByTagName('div')[0];
        if (this.bidList) {
            return this.bidList;
        }
        throw new Error('the bid list to watch was not found');
    }

    getLastBidOrigin(): BidOrigin | undefined {
        if (this.bidList) {
            let lastDiv = Toolbox.getLastDirectChildWithTagName(this.bidList, 'DIV');
            if (lastDiv) {
                let originSpan = Toolbox.findLastElementByClassNameContainingString("BidItem__Text", lastDiv)?.getElementsByTagName('span')[0];
                if (!originSpan) {
                    return undefined;
                }
                if (originSpan.innerHTML) {
                    switch (originSpan.innerHTML) {
                        case FRENCH_FLOOR_LABEL:
                        case ENGLISH_FLOOR_LABEL: {

                            return BidOrigin.Local;
                        }
                        case FRENCH_LIVE_LABEL:
                        case ENGLISH_LIVE_LABEL: {
                            return BidOrigin.Live;
                        }
                        default: {
                            return undefined;
                        }
                    }
                }
            }
        }
        return undefined;
    }

    getLastBidAmount(): number | undefined {
        if (this.bidList) {
            let lastDiv = Toolbox.getLastDirectChildWithTagName(this.bidList, 'DIV');
            if (lastDiv) {
                let amountDiv = Toolbox.findLastElementByClassNameContainingString("BidItem__Amount", lastDiv)
                if (amountDiv) {
                    let amountSpan = Toolbox.getLastDirectChildWithTagName(Toolbox.getLastDirectChildWithTagName(amountDiv, 'SPAN'), 'SPAN');
                    if (amountSpan?.innerHTML.length && amountSpan?.innerHTML.length >= 0) {
                        return parseInt(Toolbox.extractDigitsFromString(amountSpan.innerHTML));
                    }
                }
            }
        }
        return undefined;
    }

    getNextBidAmountSuggestion(): number | undefined {
        const nextBidElement = Toolbox.findLastElementByClassNameContainingString("style__Right-sc")?.getElementsByTagName('span')[0]?.getElementsByTagName('span')[0];
        const nextBidHtmlLabel = nextBidElement?.innerHTML
        if (nextBidHtmlLabel) {
            return parseInt(Toolbox.extractDigitsFromString(nextBidHtmlLabel));
        }
        return undefined;
    }

    clickOnSendMessage() {
        let sendMessageSpan = Toolbox.findFirstElementIncludingInnerHTML("span", "Envoyer un message");
        if (sendMessageSpan) {
            sendMessageSpan.parentElement?.click();
            setTimeout(() => this.selectFairWarningMessage(), 100);
        }
    }

    selectFairWarningMessage() {
        let fairWarningOptionElmt = Toolbox.findFirstElementIncludingInnerHTML("option", "Enchérissez rapidement");
        if (fairWarningOptionElmt) {
            const fairWarningOption = fairWarningOptionElmt as HTMLOptionElement;
            const selectElement = fairWarningOption.parentElement as HTMLSelectElement;
            const formDiv = selectElement.parentElement;
            if (formDiv) {
                const textArea = Toolbox.findFirstElementByClassNameContainingString("TextArea", formDiv);
                if (textArea) {
                    fairWarningOption.selected = true;
                    //fairWarningOption.click();
                    const event = new Event('change', { bubbles: true });
                    selectElement.dispatchEvent(event);
                    let sendMessageElmt = Toolbox.findFirstElementIncludingInnerHTML("button", "Envoyer", formDiv);
                    if (sendMessageElmt) {
                        sendMessageElmt.click();
                    }
                }
            }
        }
    }

    clearFairWarningMessage() {
        const deleteImg = Toolbox.findImageByAlt("Delete");
        if (deleteImg && deleteImg.parentElement?.parentElement) {
            let messageDiv = Toolbox.findFirstElementIncludingInnerHTML("div", "Enchérissez rapidement", deleteImg.parentElement.parentElement);
            if (messageDiv) {
                deleteImg.parentElement?.click();
            }
        }
    }

    setIncrementToFixValue(value : number): void {
        console.log("trying to set fixed increment in drouot connector")
        const incrementPossibleValues = [10,20,25,50,100,200,500,1000,2000,3000,5000,10000,50000];
        var closest = incrementPossibleValues.reduce(function(prev, curr) {
            return (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev);
          });
          
          const option = Toolbox.findOptionByValue(closest.toString());
          if (option) {
            const selectElement = option.parentElement as HTMLSelectElement;
            option.selected = true; 
            const event = new Event('change', { bubbles: true });
            selectElement.dispatchEvent(event);
        }
    }

    setIncrementToAuto(): void {
        let StandardStepElmt = Toolbox.findFirstElementIncludingInnerHTML("span", "Standard", document)?.parentElement?.parentElement;
        if (StandardStepElmt) {
            Toolbox.findFirstElementByClassNameContainingString("IncrementButton", StandardStepElmt)?.click();
        } else {
            console.log("StandardStepElmt not found")
        }
    }

    getLastLiveBidderId(): string | undefined{
        if (this.getLastBidOrigin() !== BidOrigin.Live) {
            return undefined;
        }
        if (this.bidList) {
            let lastDiv = Toolbox.getLastDirectChildWithTagName(this.bidList, 'DIV');
            if (lastDiv) {
                let userIdSpan = Toolbox.findLastElementByClassNameContainingString("BidItem__Text", lastDiv)?.getElementsByTagName('span')[1];
                if (userIdSpan) {
                    return userIdSpan.innerHTML;
                }
            }  
        }
        return undefined;
    }
}

var connector = new DrouotConnector();
// Expose the global variable using expose-loader
// @ts-ignore
window.connector = connector;
import { Toolbox } from '../content/toolbox';
import { Connector } from '../interfaces/interface';
import { BidOrigin } from "../shared/types";

// Value in the bidType div
const FLOOR_LABEL = 'ROOM';
const LIVE_LABEL = 'LIVE';
const STATUT_ENCHERE = 'enchere';
const STATUT_MAP = 'map';

// Usefull for detecting if a bid in the bidList is an actual bid
const FRENCH_FLOOR_LABEL = 'Salle'
const ENGLISH_FLOOR_LABEL = 'Auction room ';
const FRENCH_LIVE_LABEL = 'Internet -'
const ENGLISH_LIVE_LABEL = 'Internet'

const SEND_MESSAGE_BUTTON_ENGLISH = 'Send a message';
const SEND_MESSAGE_BUTTON_FRENCH = 'Envoyer un message';

const FAIR_WARNING_LABEL_FRENCH = 'Enchérissez rapidement';
const FAIR_WARNING_LABEL_ENGLISH = 'Bid quickly';

const FAIR_WARNING_SEND_FRENCH = 'Envoyer';
const FAIR_WARNING_SEND_ENGLISH = 'Send';

class DrouotConnector implements Connector {

    constructor() { }

    getCurentStartingPrice(): number | undefined {
        let statut = this.getStatut();
        let currentAmount = this.getCurrentAmount();
        if (statut) {
            if (statut.value === STATUT_MAP && currentAmount) {
                if (!currentAmount.value) {
                    return 0;
                }
                return parseInt(Toolbox.extractDigitsFromString(currentAmount.value).replace(/\s/g, ''));
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

        let amountInput = this.getAmountInput();
        if (!isNaN(value) && amountInput) {
            const backspaces = Toolbox.getBackspaceKeysNeededToEmptyInput(amountInput);
            const numericArray = value.toString().split('').concat(['Enter']);
            Toolbox.pressKeys(backspaces.concat(numericArray));
        }
        this.clearFairWarningMessage();
    }

    setStartingPrice(value: number): void {
        let amountInput = this.getAmountInput();
        if (!isNaN(value) && amountInput) {
            const backspaces = Toolbox.getBackspaceKeysNeededToEmptyInput(amountInput);
            const numericArray = value.toString().split('').concat(['.']);
            Toolbox.pressKeys(backspaces.concat(numericArray));
        }
    }

    removeLastBid(): void {
        Toolbox.pressKeys(["-"]);
    }

    elementIsBid(element: HTMLElement) {
        return Toolbox.findFirstElementByClassNameContainingString("BidItem__Text", element) != null
    }
    elementIsLotChange(element: HTMLElement) {
        return Toolbox.findFirstElementByClassNameContainingString("LotItem", element) != null
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
        let bidList = <HTMLElement>Toolbox.findFirstElementByClassNameContainingString("style__ColBidAuction")?.getElementsByTagName('div')[0].getElementsByTagName('div')[2].getElementsByTagName('div')[0];
        if (bidList) {
            let climbingBid = Toolbox.getLastDirectChildWithTagName(bidList, 'DIV');
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
                    if (this.elementIsLotChange(climbingBid)) {
                        console.error("bid not found for adjudication");
                        break;
                    } else {
                        climbingBid = Toolbox.getPreviousSibling(climbingBid) as HTMLDivElement;
                    }

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
        let extensionDiv = Toolbox.getElementBySelector("#extensionInputs");
        if (extensionDiv) {
            return extensionDiv;
        }
        throw new Error('the extensionDiv was not found');
    }

    getLastBidOrigin(): BidOrigin | undefined {
        let statut = this.getStatut();
        let bidType = this.getBidType();
        if (statut && statut.value == STATUT_ENCHERE && bidType) {
            switch (bidType.value) {
                case FLOOR_LABEL: {
                    return BidOrigin.Local;
                }
                case LIVE_LABEL: {
                    return BidOrigin.Live;
                }
                default: {
                    return undefined;
                }
            }
        }
        return undefined;
    }

    getLastBidAmount(): number | undefined {
        let statut = this.getStatut();
        let currentAmount = this.getCurrentAmount();
        if ((statut.value === STATUT_ENCHERE || statut.value === STATUT_MAP) && currentAmount && !currentAmount.value) {
            return 0;
        }
        if ((statut?.value === STATUT_ENCHERE || statut?.value === STATUT_MAP) && currentAmount && currentAmount.value) {
            return parseInt(Toolbox.extractDigitsFromString(currentAmount.value));
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
        let sendMessageSpanFrench = Toolbox.findFirstElementIncludingInnerHTML("span", SEND_MESSAGE_BUTTON_FRENCH);
        if (sendMessageSpanFrench) {
            sendMessageSpanFrench.parentElement?.click();
            setTimeout(() => this.selectFairWarningMessage("FR"), 100);
        } else {
            let sendMessageSpanEnglish = Toolbox.findFirstElementIncludingInnerHTML("span", SEND_MESSAGE_BUTTON_ENGLISH);
            if (sendMessageSpanEnglish) {
                sendMessageSpanEnglish.parentElement?.click();
                setTimeout(() => this.selectFairWarningMessage("EN"), 100);
            }
        }
    }

    selectFairWarningMessage(lang : string) {
        let fairWarningOptionElmt : HTMLElement | null;
        if (lang === "FR") {
            fairWarningOptionElmt = Toolbox.findFirstElementIncludingInnerHTML("option", FAIR_WARNING_LABEL_FRENCH);
        } else if (lang === "EN") {
            fairWarningOptionElmt = Toolbox.findFirstElementIncludingInnerHTML("option", FAIR_WARNING_LABEL_ENGLISH);
        } else {
            return;
        }
        
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
                    let sendMessageElmt : HTMLElement | null;
                    if (lang === "FR") {
                        sendMessageElmt = Toolbox.findFirstElementIncludingInnerHTML("button", FAIR_WARNING_SEND_FRENCH, formDiv);
                    } else if (lang === "EN") {
                        sendMessageElmt = Toolbox.findFirstElementIncludingInnerHTML("button", FAIR_WARNING_SEND_ENGLISH, formDiv);
                    } else {
                        return;
                    }
                    
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
            let messageDivFrench = Toolbox.findFirstElementIncludingInnerHTML("div", FAIR_WARNING_LABEL_FRENCH, deleteImg.parentElement.parentElement);
            if (messageDivFrench) {
                deleteImg.parentElement?.click();
            } else {
                let messageDivEnglish = Toolbox.findFirstElementIncludingInnerHTML("div", FAIR_WARNING_LABEL_ENGLISH, deleteImg.parentElement.parentElement);
                if (messageDivEnglish) {
                    deleteImg.parentElement?.click();
                } 
            }
        }
    }

    setIncrementToFixValue(value: number): void {
        const incrementPossibleValues = [10, 20, 25, 50, 100, 200, 500, 1000, 2000, 3000, 5000, 10000, 50000];
        var closest = incrementPossibleValues.reduce(function (prev, curr) {
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
        }
    }

    getLastLiveBidderId(): string | undefined {
        if (this.getLastBidOrigin() !== BidOrigin.Live) {
            return undefined;
        }
        let lastBidderId = this.getLastBidderId();
        if (lastBidderId) {
            return lastBidderId.value;
        }
        return undefined;
    }

    getCurrentAmount(): HTMLInputElement {
        return this.getInputById('currentAmount');
    }
    getLastBidderId(): HTMLInputElement {
        return this.getInputById('lastBidderId');
    }
    getBidType(): HTMLInputElement {
        return this.getInputById('bidType');
    }
    getStatut(): HTMLInputElement {
        return this.getInputById('statut');
    }
    getAmountInput(): HTMLInputElement {
        return this.getInputById('bidInput');
    }

    getInputById(inputId: string): HTMLInputElement {
        let input = Toolbox.getElementBySelector('#' + inputId) as HTMLInputElement;
        if (!input) {
            throw new Error('No input with id ' + inputId + ' was found');
        }
        return input;
    }

}

var connector = new DrouotConnector();
// Expose the global variable using expose-loader
// @ts-ignore
window.connector = connector;
import { BidOrigin } from "../shared/types";

export interface Connector {

    // actions

    // placeBid should place a floor bid of the specified value
    placeBid(value: number): void;
    // setStartingPrice should set a new starting price for the lot, by removing bids if necessary
    setStartingPrice(value: number): void;
    // removeLastBid must remove the last placed bid (floor or live bid)
    removeLastBid(): void;
    // adjudicateLot must adjudicate the current lot and make sure that it's adjudicated to the correct bid
    // using the bid origin and amout
    adjudicateLot(origin : BidOrigin, amount : number): void;
    // unsoldLot must declare the current lot as unsold and move to the next lot
    unsoldLot(): void;
    // sendFairWarning will send a fair warning message to the web users. The connector will have to remove
    // the message if necessary after a certain delay or action
    sendFairWarning(): void;
    // setIncrementToFixValue must modify the current increment to a fixed value
    setIncrementToFixValue(value : number): void;
    // setIncrementToAuto must set the current increment to the automatic value provided by the platform
    setIncrementToAuto(): void;

    // events

    // getBidActivityElementToWatch should return an HTMLElement that the content script will watch.
    // On change, the content script will call getLastBidOrigin and getLastBidAmount to get the new last bid amount and origin.
    getBidActivityElementToWatch(): HTMLElement;

    // getters

    // getLastBidOrigin returns, if the last activity is a bid, the origin of the bid, or undefined
    getLastBidOrigin(): BidOrigin | undefined;
    // getLastBidAmount returns, if the last activity is a bid, the amount of the bid
    getLastBidAmount(): number | undefined;
    // getLastLiveBidderId returns, if the last activity is a live bid, the id of the bidder
    getLastLiveBidderId(): string | undefined;
    // getCurentStartingPrice returns, if the last activity is a lot change or a starting price update, the starting price
    getCurentStartingPrice(): number | undefined;
    // getNextBidAmountSuggestion returns the suggested next bid amount
    getNextBidAmountSuggestion(): number | undefined;
    // getCurrentLot returns the current lot
    getCurrentLot(): string | undefined;
    // getCurrentLotDescription returns the description of the current lot
    getCurrentLotDescription(): string | undefined;
}
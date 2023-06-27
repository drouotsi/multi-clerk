import { UrlPrefix } from "../connectors/urls";

// TabBiddingData contains information about each tab
export type TabBiddingData = {
  lastUpdate: Date;
  lastAmount: number | undefined;
  lastBidOrigin: BidOrigin | undefined;
  LiveBidderId: string | undefined;
  LiveBidderColor: string | undefined;
  nextBidAmountSuggestion: number | undefined;
  startingPrice: number | undefined;
  currentLot: string | undefined;
  currentLotDescription: string | undefined;
  isActive: boolean;
  // We store the expected future value of the tab when we place a bid or set a starting price
  // This is used for checking if a floor bid needs to be placed in other tabs when a live bid is recieved
  expectedAmount: number | undefined;
  expectedStartingPrice: number | undefined;
};

// BidOrigin lists the two possible origins of a bid, 
// local refers to a 'Floor' bid (or another platform bidder)
// and Live refers to an internet bidder
export enum BidOrigin {
  Local = 'LOCAL',
  Live = 'LIVE',
}

// serializeTabsMap returns a serialized string of a tabMap. It's necessary to serialize the tabMap in 
// order to send it using messages
export function serializeTabsMap(tabsMap: Map<UrlPrefix, Map<number, TabBiddingData>>): string {
  let serializedMap = JSON.stringify([...tabsMap.entries()], (key, value) => {
    if (value instanceof Map) {
      return { dataType: 'Map', value: [...value.entries()] };
    }
    return value;
  });
  return serializedMap;
}

// deserializeTabsMap creates a tabMap from a serialized tabMap recieved in a message
export function deserializeTabsMap(serializedTabMap: string): Map<UrlPrefix, Map<number, TabBiddingData>> {
  const deserializedTabMap = new Map<UrlPrefix, Map<number, TabBiddingData>>(JSON.parse(serializedTabMap, (key, value) => {
    if (typeof value === 'object' && value !== null && value.dataType === 'Map') {
      return new Map(value.value);
    }
    return value;
  }));
  return deserializedTabMap;
}
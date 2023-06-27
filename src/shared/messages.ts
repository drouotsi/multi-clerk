import { BidOrigin, deserializeTabsMap, serializeTabsMap } from "../shared/types";
import { UrlPrefix } from '../connectors/urls';
import { TabBiddingData } from './types';

// Messages module contains all message types and classes used by the extension
// All messages extend ClerkMessage and therefore have a from and to endpoint that can 
// be used for debugging and understanding which context sends what type of messages
export module Messages {

    export enum MessageTypes {
        TabUpdate = 'LAST_BID_UPDATE',
        Ping = 'PING',
        PlaceBid = 'PLACE_BID',
        SetStartingPrice = 'SET_STARTING_PRICE',
        RemoveLastBid = 'REMOVE_LAST_BID',
        Adjudicate = 'ADJUDICATE',
        UnsoldLot = 'UNSOLD_LOT',
        FairWarning = 'FAIR_WARNING',
        ExtensionOnOffRequest = 'EXTENSION_ON_OFF_REQUEST',
        ExtensionOnOff = 'EXTENSION_ON_OFF',
        TabsUpdateRequest = 'TABS_UPDATE_REQUEST',
        TabsUpdate = 'TABS_UPDATE',
        TabOnOff = 'TAB_ON_OFF',
        GotoTab = 'GOTO_TAB',
        SetFixedIncrement = 'SET_FIXED_INCREMENT',
        SetAutoIncrement = 'SET_AUTO_INCREMENT'
    }

    export enum Endpoints {
        Background = 'BACKGROUND',
        Context = 'CONTEXT',
        Connector = 'CONNECTOR',
        Popup = 'POPUP',
    }

    export class ClerkMessage {

        protected type: MessageTypes;
        from: Endpoints;
        to: Endpoints;

        constructor(type: MessageTypes, from: Endpoints, to: Endpoints) {
            this.type = type;
            this.from = from;
            this.to = to;
        }

        public getType(): MessageTypes {
            return this.type;
        }

        public static CastMessage(msg: any) {
            return new ClerkMessage(msg.type, msg.from, msg.to);
        }
    }

    export class TabUpdate extends ClerkMessage {

        bidValue: number | undefined;
        bidOrigin: BidOrigin | undefined;
        LiveBidderId: string | undefined;
        nextBidAmountSuggestion: number | undefined;
        startingPrice: number | undefined;
        currentLot: string | undefined;
        currentLotDescription: string | undefined;

        constructor(from: Endpoints,
            to: Endpoints,
            bidValue: number | undefined,
            bidOrigin: BidOrigin | undefined,
            LiveBidderId: string | undefined,
            nextBidAmountSuggestion: number | undefined,
            startingPrice: number | undefined,
            currentLot: string | undefined,
            currentLotDescription: string | undefined) {
            super(MessageTypes.TabUpdate, from, to);
            this.bidValue = bidValue;
            this.bidOrigin = bidOrigin;
            this.LiveBidderId = LiveBidderId;
            this.nextBidAmountSuggestion = nextBidAmountSuggestion;
            this.startingPrice = startingPrice;
            this.currentLot = currentLot;
            this.currentLotDescription = currentLotDescription;
        }

        public static CastMessage(msg: any) {
            return new TabUpdate(msg.from, 
                msg.to, 
                msg.bidValue, 
                msg.bidOrigin, 
                msg.LiveBidderId, 
                msg.nextBidAmountSuggestion, 
                msg.startingPrice, 
                msg.currentLot,
                msg.currentLotDescription);
        }
    }

    export class Ping extends ClerkMessage {

        constructor(from: Endpoints, to: Endpoints) {
            super(MessageTypes.Ping, from, to);
        }
    }

    export class RemoveLastBid extends ClerkMessage {

        constructor(from: Endpoints, to: Endpoints) {
            super(MessageTypes.RemoveLastBid, from, to);
        }
    }

    export class Adjudicate extends ClerkMessage {

        tabsScreenshotMap: Map<UrlPrefix, Map<number, TabBiddingData>>;
        tabsScreenshot: string;

        constructor(from: Endpoints,
            to: Endpoints,
            tabsScreenshot: string) {
            super(MessageTypes.Adjudicate, from, to);
            this.tabsScreenshotMap = deserializeTabsMap(tabsScreenshot);
            this.tabsScreenshot = tabsScreenshot;
        }

        public static CastMessage(msg: any) {
            return new Adjudicate(msg.from, msg.to, msg.tabsScreenshot);
        }
    }
    export class UnsoldLot extends ClerkMessage {

        constructor(from: Endpoints, to: Endpoints) {
            super(MessageTypes.UnsoldLot, from, to);
        }
    }

    export class FaiWarning extends ClerkMessage {

        constructor(from: Endpoints, to: Endpoints) {
            super(MessageTypes.FairWarning, from, to);
        }
    }

    export class ExtensionOnOffRequest extends ClerkMessage {
        
        constructor(from: Endpoints, to: Endpoints) {
            super(MessageTypes.ExtensionOnOffRequest, from, to);
        }
    }

    export class ExtensionOnOff extends ClerkMessage {

        isActive: boolean;

        constructor(from: Endpoints, to: Endpoints, isActive: boolean) {
            super(MessageTypes.ExtensionOnOff, from, to);
            this.isActive = isActive;
        }

        public static CastMessage(msg: any) {
            return new ExtensionOnOff(msg.from, msg.to, msg.isActive);
        }
    }


    export class TabsUpdateRequest extends ClerkMessage {

        constructor(from: Endpoints, to: Endpoints) {
            super(MessageTypes.TabsUpdateRequest, from, to);
        }
    }

    export class PlaceBid extends ClerkMessage {

        bidValue: number;
        bidOrigin: BidOrigin;

        constructor(from: Endpoints, to: Endpoints, bidValue: number, bidOrigin: BidOrigin) {
            super(MessageTypes.PlaceBid, from, to);
            this.bidValue = bidValue;
            this.bidOrigin = bidOrigin;
        }

        public static CastMessage(msg: any) {
            return new PlaceBid(msg.from, msg.to, msg.bidValue, msg.bidOrigin);
        }
    }

    export class SetStartingPrice extends ClerkMessage {

        value: number;

        constructor(from: Endpoints, to: Endpoints, value: number) {
            super(MessageTypes.SetStartingPrice, from, to);
            this.value = value;
        }
        public static CastMessage(msg: any) {
            return new SetStartingPrice(msg.from, msg.to, msg.value);
        }
    }

    export class SetFixedIncrement extends ClerkMessage {

        value: number;

        constructor(from: Endpoints, to: Endpoints, value: number) {
            super(MessageTypes.SetFixedIncrement, from, to);
            this.value = value;
        }
        public static CastMessage(msg: any) {
            return new SetFixedIncrement(msg.from, msg.to, msg.value);
        }
    }

    export class SetAutoIncrement extends ClerkMessage {

        constructor(from: Endpoints, to: Endpoints) {
            super(MessageTypes.SetAutoIncrement, from, to);
        }
    }

    export class TabsUpdate extends ClerkMessage {

        serializedTabMap: string;

        constructor(from: Endpoints, to: Endpoints, serializedTabMap: string) {
            super(MessageTypes.TabsUpdate, from, to);
            this.serializedTabMap = serializedTabMap;
        }

        public static CastMessage(msg: any) {
            return new TabsUpdate(msg.from, msg.to, msg.serializedTabMap);
        }
    }

    export class TabOnOff extends ClerkMessage {

        tabId: number;
        isActive: boolean;

        constructor(from: Endpoints, to: Endpoints, tabId: number, isActive: boolean) {
            super(MessageTypes.TabOnOff, from, to);
            this.tabId = tabId;
            this.isActive = isActive;
        }

        public static CastMessage(msg: any) {
            return new TabOnOff(msg.from, msg.to, msg.tabId, msg.isActive);
        }
    }

    export class GotoTab extends ClerkMessage {

        tabId: number;

        constructor(from: Endpoints, to: Endpoints, tabId: number) {
            super(MessageTypes.GotoTab, from, to);
            this.tabId = tabId;
        }

        public static CastMessage(msg: any) {
            return new GotoTab(msg.from, msg.to, msg.tabId);
        }
    }
}
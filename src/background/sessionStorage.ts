// The key used to store in the session storage if the extension is activated or not (global killswitch)
const EXTENSION_ON_OFF_STORAGE_KEY = 'EXTENSION_ON_OFF'

// isTabActive returns true / false from value stored in the session storage
export function isTabActive(tabId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        chrome.storage.session.get(tabId.toString(), function (result) {
            if (result[tabId.toString()]) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

// setActiveTab stores the tabId as key and a boolean as active state in the session storage
export function setActiveTab(tabId: number, active: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
        if (active) {
            var obj: any = {};
            obj[tabId.toString()] = true;
            chrome.storage.session.set(obj, function () { resolve(true); });
        } else {
            chrome.storage.session.remove(tabId.toString(), function () { resolve(true); });
        }
    });
}

// isExtensionOn returns weather the global killswitch is on off based on the value stored in the session storage
export function isExtensionOn(): Promise<boolean> {
    return new Promise((resolve, reject) => {
        // If nothing is stored, we consider the default behaviour is active
        chrome.storage.session.get(EXTENSION_ON_OFF_STORAGE_KEY, function (result) {
            if (result[EXTENSION_ON_OFF_STORAGE_KEY] !== undefined && result[EXTENSION_ON_OFF_STORAGE_KEY] == false) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// setExtensionOnOff stores in the session storage the extension's killswitch value
export function setExtensionOnOff(active: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
        var obj: any = {};
        obj[EXTENSION_ON_OFF_STORAGE_KEY] = active;
        chrome.storage.session.set(obj, function () { resolve(active); });
    });
}
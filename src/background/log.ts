const url = 'https://plausible.io/api/event';

// We store the urls sent daily
// We only send the auction url if it has not already been sent that day (in order to keep a short list)
// If the current day is not equal to the one stored in storage.local.LOG_DATE, we reset the list
export function sendLog(auctionUrl: string | undefined) {
    if (auctionUrl) {
        // Retrieve the current log date
        chrome.storage.local.get('LOG_DATE', function (result) {
            let isSameDay = false;
            // Get the current date and time
            const now = new Date();
            if (result.LOG_DATE) {
                let logDate = new Date(result.LOG_DATE);
                // Check if the year, month, and day of the date to compare are equal to the year, month, and day of now
                isSameDay = logDate.getFullYear() === now.getFullYear() &&
                    logDate.getMonth() === now.getMonth() &&
                    logDate.getDate() === now.getDate();
            }
            // Retrieve the list of strings from Chrome storage
            chrome.storage.local.get('SENT_LOGS', function (result) {
                let myList: string[] = []; // Set default value to empty array if the list is not defined
                if (isSameDay) {
                    myList = result.SENT_LOGS || []
                }
                if (!myList.includes(auctionUrl)) {
                    myList.push(auctionUrl);
                    chrome.storage.local.set({ LOG_DATE: now.toISOString() }, function () {
                        chrome.storage.local.set({ SENT_LOGS: myList }, function () {
                            fetch(url, {
                                method: 'POST',
                                headers: {
                                    'User-Agent': navigator.userAgent,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(createBody(auctionUrl))
                            }).then();
                        })
                    });
                }
            });
        });
    }
}

// The log request body
function createBody(auctionUrl: string) {
    const manifest = chrome.runtime.getManifest();
    return {
        name: 'live_auction',
        url: 'multiclerk.drouot.com',
        domain: 'multiclerk.drouot.com',
        props: {
            auctionUrl: auctionUrl,
            extensionVersion: manifest.version
        }
    };
}

// If the extension is not in production mode, we debug the extension's storage on any modification
export function debugStorage() {
    if (!(process.env.NODE_ENV === 'production')) {
        // Add a listener for changes to chrome.storage.local
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            for (var key in changes) {
                var storageChange = changes[key];
                console.log('Storage key "%s" in namespace "%s" changed. ' +
                    'Old value was "%s", new value is "%s".',
                    key,
                    namespace,
                    storageChange.oldValue,
                    storageChange.newValue);
            }
        });
    }
}


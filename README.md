Multi-clerk
==========

Multi-cLerk is a Chrome extension that enables a cyber-clerk to manage multiple live auction providers at the same time. The extension sends actions using keyboard events or automatic input writing and button clicking on multiple opened tabs, it also reads information from tabs to display them back into the clerking interface.

Installation
==========

To install Multi-clerk, you have several options :

From the Chrome Store (not available yet)
------------

follow these steps:

1.  Open the Chrome Browser and go to https://chrome.google.com/webstore
2.  Search for Multi-clerk
3.  Click on "Add to Chrome"
4.  The Multi-clerk extension should now be installed and visible in the Extensions page.

From source:

follow these steps:

1.  Clone the repository to your local machine.
2.  Navigate to the project directory.
3.  Run `npm install` to install the dependencies.
4.  Run `source builder.sh`
5.a  Run `build_dev` to generate an unpacked, unminified extension with maps for debugging
5.b  Run `build_prod` to generate an unpacked, minified extension that only allows one tab of the same URL prefixes
6.  Open the Chrome browser and go to the Extensions page (`chrome://extensions`).
7.  Enable Developer mode by toggling the switch on the top-right corner.
8.  Click on "Load unpacked" and select the `dist` folder from the project directory.
9.  The Multi-clerk extension should now be installed and visible in the Extensions page.

Usage
-----

Once Multi-clerk is installed, you can use it by following these steps:

1.  Open the live auction providers that you want to manage in separate tabs in the Chrome browser.
2.  Pin the extension to the toolbar by clicking on the puzzle piece in the browser's toolbar
3.  Open the Multi-clerk extension by clicking on the Multi-clerk pictogram. The extension should not be opened on an auction provider's tab to prevent a conflict of keyboard events 


The extension will enable a user, through a unique interface, to interact with multiple live auction clerking tabs at once from different providers.

The user will be able to :

    . place a local bid (physical bid in the sale room)
    . place a suggested bid (an amount comming from a user selected tab source)
    . set the starting price of the current lot at any time
    . adjudicate the current lot
    . skip the current lot (unsold lot)
    . remove the last bid
    . set a fixed increment
    . set an automatic increment
    . Turn ON / OFF the extension
    . see the current last bid of every opened clerking interfaces

When the extension detects an internet (live) bid comming from a tab, it will automatically place a local bid in other opened tabs. This behavious doesn't happend if the extension is turned OFF.


How it works technically
-------

The Multi-clerk extension keeps an updated list of tabs that have a specific url prefix (both in the background and the popup).
Through the manifest, we also load into tabs both a content script and a connector script (based on a url prefix match).

Background and content communication :
---

The content script communicates with the background through messages and with the connector through methods of the interface the connector must implement.
Because all content scripts and connectors are only active when the tab they are loaded in is active, they will not recieve messages if the tab is innactive.
Therefore, the background script directly injects into incactive tabs javascript function calls that the connector or content will execute, even if the tab is inactive (using the chrome scripting api). All actions from the background are executed by the connector directly unless it's a request for a tab status update (this happens when the background-worker restarts due to inactivity and looses the tabs data). For this particular call it's a content script function that is called. 

Nevertheless, an inactive tab's observer is still triggered when an observed HTML element is modified, and is still able to send messages to the background on HTML modification detection. Therefore the content script always sends info to the background using messages.

To resume : 
HTML modification (ie: a new bid has been placed) is detected by the content script (watching an element that has been provided by the connector through an initial function call).
The content script alerts the background script through messages.
When the background has to send an action to tabs, it injects a JS function call into the tab, which is then executed by the connector or the content script, depending on the type of action required.

Background and popup communication :
---

The popup can only communicate with the background script, it cannot send messages to the content or the connector directly.
The popup and background only communicate using messages.
When the background recieves an update from a tab, it tries to send it to the popup (if the popup is not opened, the message will not be recieved).
When the popup opens, it requests an update from the background script to know the status of all opened tabs.
It is possible that at that moment, the background itself was unmounted by Chrome, due to innactivity (we detect this because the tabs map has a size 0 and is not prefilled with URL prefixes). In that situation, the background will request from all opened tabs to send back their current status through a message, these updates will then be pushed by the background back to the popup.

To resume : 

The popup and the background only communicate using messages. The popup can only communicate to the background. Opening the popup will send a message to the background asking for current tabs status, this may lead to the background requesting all tabs to give their current status.


Actions lifecycle
-------

User action lifecycle : popup -> background -> connector -> content -> background -> popup
---

When the popup triggers an action, it is sent to the background with a message, the background handles the action and dispatches it to the concerned tabs using a function call that is injected into all conncerned tabs. Because a tab executes the action, its HTML is modified (for example, a new bid was placed, so the last bid just changed). The tab's content script catches the HTML update, sends a message to the background with the new tab status. The background informs the popup through a message, the status of the tab is updated in the popup.

Platform event lifecycle : content -> background -> connector -> content -> background -> popup
---

When an internet user placed an online bid, the content script detects a change in the HTML element to watch, it sends a status update to the background script. The background script injects into all other tabs a function call for the connectors to place a LOCAL bid with the same amount as the LIVE bid it recieved and sends to the popup the updated tab status map (at that point, only the live bid will be displayed). Then the content script detects the change in the HTML element to watch in the other tabs, sends a message to the background with the new tab status, and finaly the background updates the popup with the local bids.

Project Structure
-----------------

The Multi-clerk source code is organized into the following directories:

### `src/background`

This directory contains TypeScript files related to the background scripts of the extension. The background scripts run in the background of the extension and handle events, actions, tabs, urls and data related to the extension's functionalities.

Key Files:

-   `clerkkent.ts`: This file contains the main logic for handling actions and events in the background of the extension.
-   `tabMap.ts`: This file contains a map and methods that handle information about the tabs that are being managed by the extension.
-   `log.ts`: This file handles the logging to plausible. It stores a list of auction urls that have already been logged, and if the url is new, it sends it to plausible. The URL list is refreshed daily.

### `src/connectors`

This directory contains TypeScript files related to the connectors of the extension. Connectors are used to communicate with live auction providers and perform actions such as input writing and button clicking on their websites. Connectors will be executed in the webextension's content script environment.

Key Files:

-   `drouot.ts`: This file contains the connector logic for communicating with the Drouot live auction provider.
-   `ie.ts`: This file contains the connector logic for communicating with the Interenchere live auction provider.

### `src/content`

This directory contains TypeScript files related to the content scripts of the extension. Content scripts are injected into web pages of live auction providers and interact with the DOM to perform actions on the websites.

Key Files:

-   `content.ts`: This file contains the main logic for interacting with the DOM of live auction provider websites. The content.ts file is the logic and relay between a connector and the background scripts.
-   `toolbox.ts`: This file contains utility functions that can be used by the connectors to perform actions on a web page, such as triggering keyboard events, clicking on buttons or getting specific HTML elements.

### `src/interfaces`

This directory contains the TypeScript interfaces that a connector needs to implement.

### `src/popup`

This directory contains TypeScript files related to the popup scripts of the extension. The popup scripts run in the popup window of the extension and handle user interactions, configurations, actions and a map with current tab information.

Key Files:

-   `popup.ts`: This file contains the main logic for handling the popup window of the extension.
-   `actions.ts`: This file contains all the code related to user actions on the popup (place bid, set starting price...)
-   `adjudication.ts`: This file contains the main logic for handling a lot adjudication (UI change, screenshot of the current tab information, validation).
-   `increment.ts`: This file contains the main logic for changing the increment value from fixed to automatic.
-   `tabs.ts`: This file handles the tabs information for the popup, creates the status elements (list of tab information at the top of the popup)

### `src/shared`

This directory contains TypeScript files that are used by multiple javascript environments (background, content, connector, popup)

Key Files:

-   `messages.ts`: This file contains message types and classes that are used to communicate between javascript environments.
-   `types.ts`: This file contains types and methods to handle types that are by multiple javascript environments.

### `public/_locales`

This directory contains language files as specified by the chrome i18n documentation

### `public/css`

This directory contains all css files of the extension's popup

### `docs`

This directory contains user guides that are published using github's Pages services. 
The french manual is accessible at : https://drouotsi.github.io/multi-clerk/manual_fr


Important Project Files
---------

-   `package.json` : The file contains information about the project's dependencies and are used by npm (Node Package Manager) for package management.

-   `public/manifest.json`: This file is the manifest file for the Chrome extension and contains metadata such as the extension's name, version, icons, and permissions.

-   `public/popup.html`: The html file for the extension's popup.

-   `src/background/clerkkent.ts`: This file contains the main logic for handling actions and events in the background of the extension, including communication with content scripts and connectors.

-   `src/background/tabMap.ts`: This file contains a map that stores information about the tabs that are being managed by the extension, such as their IDs and states.

-   `src/connectors/drouot.ts`: This file contains the connector logic for communicating with the Drouot live auction provider, including input writing and button clicking actions.

-   `src/connectors/ie.ts`: This file contains the connector logic for communicating with the Interencheres live auction provider, including input writing and button clicking actions.

-   `src/content/content.ts`: This file contains the main logic for interacting with the DOM of live auction provider websites, including parsing and handling data from the websites.

-   `src/popup/popup.ts`: This file contains the main logic for handling user interactions and configurations in the popup window of the extension, including sending messages to the background scripts.


How to add a new connector
-------

In order to add a new connector, you need to create a new connector file in src/connectors.
Your connector class must implement the Connector interface (interfaces/interface.ts).
Your ts file must set window.connector to an instance of your connector : window.connector = yourConnectorInstance;
In the webpack configuration file (webpack.config.cjs), add a new entry with your provider's .ts file.
Then, you must add the url prefix of the new provider's clerking page into the manifest (public/manifest.json) in the host_permissions section and the content_scripts section. Note that in the content_scripts section, you have to load two content scripts : the content.js that is commun to all providers, and your new connector file (.js).
Finaly, you must add the url prefix to the UrlPrefix enum (src/connectors/urls.ts). Make sure to remove any wildchar since it's a prefix and not a regex. Note that the name you pick as the enum key will be the one displayed in the tab status section in the popup.

Issues
-------

If you encounter any issues or have suggestions for improvement, please open an issue in the issue tracker.

Development
-----------

If you want to contribute to the development of Multi-clerk, follow these steps:

1.  Fork the repository to your GitHub account.
2.  Clone the forked repository to your local machine.
3.  Create a new branch for your feature or bugfix.
4.  Make changes to the code and test thoroughly.
5.  Submit a pull request to the original repository with a clear description of the changes made. 
6. Your changes will be reviewed by the project maintainers, and upon approval, your code will be merged into the main branch.

License
-------

Multi-clerk is an open source software released under the MIT License. You can find the full license text in the `LICENSE` file in the root directory of the project.

Contact
-------

For any further questions or inquiries, please contact the project maintainers at info@drouot.com.

Thank you for your interest in Multi-clerk! Happy clerking!


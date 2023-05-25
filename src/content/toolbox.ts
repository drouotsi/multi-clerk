

export module Toolbox {

    export function getElementBySelector(selector: string): HTMLElement | null {
        const element = document.querySelector(selector);
        return element as HTMLElement | null;
    }

    export function getPreviousSibling(element: HTMLElement): HTMLElement | null {
        let prevSibling = element.previousSibling;
        while (prevSibling && prevSibling.nodeType !== 1) {
            prevSibling = prevSibling.previousSibling;
        }
        return prevSibling as HTMLElement | null;
    }

    export function setNumberInInput(value: number, input: HTMLInputElement): void {
        if (!input) {
            console.error('Input element is not defined.');
            return;
        }
        if (input.type !== 'text' && input.type !== 'number') {
            console.error('Input element must have type "text" or "number".');
            return;
        }
        input.value = String(value);
    }

    export function resetInput(input: HTMLInputElement): void {
        if (!input) {
            console.error('Input element is not defined.');
            return;
        }
        if (input.type !== 'text' && input.type !== 'number') {
            console.error('Input element must have type "text" or "number".');
            return;
        }
        input.value = '';
    }

    export function getBackspaceKeysNeededToEmptyInput(input: HTMLInputElement): string[] {
        return createBackspaceArray(input.value.length);
    }

    function createBackspaceArray(n: number): string[] {
        const backspaceArray = new Array(n);
        for (let i = 0; i < n; i++) {
            backspaceArray[i] = "Backspace";
        }
        return backspaceArray;
    }


    export function clickOnButton(input: HTMLElement): void {
        input.click();
    }

    export function clickOnButtonWithSelector(selector: string): void {
        let button = Toolbox.getElementBySelector(selector);
        if (button) {
            Toolbox.clickOnButton(button);
        } else {
            console.error('button with selector ' + selector + ' was not found')
        }
    }

    export function findAllElementsByClassNameContainingString(searchString: string, origin?: Document | HTMLElement): HTMLElement[] | null {
        let elmts: HTMLCollectionOf<Element>
        if (origin) {
            elmts = origin.getElementsByTagName('*');
        } else {
            elmts = document.getElementsByTagName('*');
        }
        var allMatchingElements: HTMLElement[] = [];
        for (let i = 0; i < elmts.length; i++) {
            const element = elmts[i] as HTMLElement;
            const classNames = element.classList;
            for (let j = 0; j < classNames.length; j++) {
                if (classNames[j].includes(searchString)) {
                    allMatchingElements.push(element)
                }
            }
        }
        if (allMatchingElements.length > 0) {
            return allMatchingElements;
        }
        return null;
    }

    export function findFirstElementByClassNameContainingString(searchString: string, origin?: Document | HTMLElement): HTMLElement | null {
        let elmts: HTMLCollectionOf<Element>
        if (origin) {
            elmts = origin.getElementsByTagName('*');
        } else {
            elmts = document.getElementsByTagName('*');
        }
        for (let i = 0; i < elmts.length; i++) {
            const element = elmts[i] as HTMLElement;
            const classNames = element.classList;
            for (let j = 0; j < classNames.length; j++) {
                if (classNames[j].includes(searchString)) {
                    return element;
                }
            }
        }
        return null;
    }

    export function findLastElementByClassNameContainingString(searchString: string, origin?: Document | HTMLElement): HTMLElement | null {
        let elmts: HTMLCollectionOf<Element>
        if (origin) {
            elmts = origin.getElementsByTagName('*');
        } else {
            elmts = document.getElementsByTagName('*');
        }
        for (let i = elmts.length - 1; i >= 0; i--) {
            const element = elmts[i] as HTMLElement;
            const classNames = element.classList;
            for (let j = 0; j < classNames.length; j++) {
                if (classNames[j].includes(searchString)) {
                    return element;
                }
            }
        }
        return null;
    }

    export function getLastDirectChildWithTagName(element: HTMLElement | null, tagName: string): HTMLDivElement | null {
        if (!element) {
            return null;
        }
        let lastDivChild: HTMLDivElement | null = null;

        // Iterate over all child elements in reverse order
        for (let i = element.children.length - 1; i >= 0; i--) {
            const child = element.children[i];
            // Check if the child element is a div element
            if (child.tagName === tagName) {
                lastDivChild = child as HTMLDivElement;
                break;
            }
        }
        return lastDivChild;
    }

    export function extractDigitsFromString(input: string): string {
        const regex = /\d/g;
        const digits = input.match(regex);

        if (digits) {
            return digits.join('');
        } else {
            return '';
        }
    }

    export function findFirstElementIncludingInnerHTML(elementTagName: string, innerHTML: string, origin?: Document | HTMLElement): HTMLElement | null {
        let elmts: HTMLCollectionOf<Element>
        if (origin) {
            elmts = origin.getElementsByTagName(elementTagName);
        } else {
            elmts = document.getElementsByTagName(elementTagName);
        }
        for (let i = 0; i < elmts.length; i++) {
            const elt = elmts[i] as HTMLElement;
            if (elt.innerHTML.includes(innerHTML)) {
                return elt;
            }
        }
        return null;
    }


    export function findImageByAlt(altValue: string): HTMLImageElement | null {
        const images = document.getElementsByTagName('img');

        for (let i = 0; i < images.length; i++) {
            const img = images[i] as HTMLImageElement;

            if (img.alt === altValue) {
                return img;
            }
        }

        return null;
    }

    export function findOptionByValue(value: string, origin?: Document | HTMLElement): HTMLOptionElement | null {
        let options: HTMLCollectionOf<Element>
        if (origin) {
            options = origin.getElementsByTagName('option');
        } else {
            options = document.getElementsByTagName('option');
        }

        for (let i = 0; i < options.length; i++) {
            const option = options[i] as HTMLOptionElement;
            if (option.value == value) {
                return option;
            }
        }
        return null;
    }

    export function findButtonByValue(value: string, origin?: Document | HTMLElement): HTMLButtonElement | null {
        let buttons: HTMLCollectionOf<Element>
        if (origin) {
            buttons = origin.getElementsByTagName('input');
        } else {
            buttons = document.getElementsByTagName('input');
        }

        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i] as HTMLButtonElement;
            if (button.value == value) {
                return button;
            }
        }
        return null;
    }

    export async function pressKeys(keys: string[]) {
        const keydownEventInit: KeyboardEventInit = {
            bubbles: true,
            cancelable: true,
            shiftKey: false,
            ctrlKey: false,
            altKey: false,
            metaKey: false,
        };
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            let eventInit: KeyboardEventInit = {
                ...keydownEventInit,
                key,
                charCode: key.charCodeAt(0),
                keyCode: key.charCodeAt(0),
                code: key.toUpperCase(),
                which: key.charCodeAt(0),
            };
            if (key.length === 1 && key.toUpperCase() !== key.toLowerCase()) {
                // It's a letter
                eventInit.which = key.toUpperCase().charCodeAt(0);
            } else if (key === "*") {
                // It's the asterisk key
                eventInit.which = 56;
                eventInit.shiftKey = true;
            } else if (key === "/") {
                // It's the forward slash key
                eventInit.which = 191;
            } else if (key === ".") {
                // It's the period key
                eventInit.which = 190;
            } else if (key === "-") {
                // It's the dash key
                eventInit.which = 189;
            } else if (typeof key === "number" || /^\d+$/.test(key)) {
                // It's a number
                eventInit.which = parseInt(key, 10);
            } else if (key.startsWith("Ctrl+")) {
                // It's a control key combination
                eventInit.which = key.toUpperCase().charCodeAt(key.length - 1);
                eventInit.ctrlKey = true;
            } else if (key === "Enter") {
                // It's the enter key
                eventInit.which = 13;
            } else if (key === "Backspace") {
                // It's the backspace key
                eventInit.which = 8;
            } else {
                // It's an unknown key
                console.error(`Unknown key: ${key}`);
                return;
            }
            const keydownEvent = new KeyboardEvent("keydown", eventInit);
            const keypressEvent = new KeyboardEvent("keypress", eventInit);
            const keyupEvent = new KeyboardEvent("keyup", eventInit);
            await new Promise(resolve => {
                document.dispatchEvent(keydownEvent);
                document.dispatchEvent(keypressEvent);
                document.dispatchEvent(keyupEvent);
                setTimeout(resolve, 0);
            });
        }
    }
}
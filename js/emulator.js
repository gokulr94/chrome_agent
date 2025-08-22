/**
 * This library is the main controller for performing actions on a browser tab.
 * It injects and executes DOM manipulation logic directly in the active tab.
 */

/**
 * A helper function that returns a Promise that resolves when a specific tab has finished loading.
 * @param {number} tabId - The ID of the tab to monitor.
 * @returns {Promise<void>}
 */
function waitForTabLoad(tabId) {
    return new Promise((resolve) => {
        let timeoutId;

        const listener = (updatedTabId, changeInfo, tab) => {
            // Check if the tab has finished loading
            if (updatedTabId === tabId && changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
                // If the tab loads, clear the timeout
                clearTimeout(timeoutId);
                // Remove the listener to prevent memory leaks
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };

        // Listen for tab updates
        chrome.tabs.onUpdated.addListener(listener);

        // Set a 5-second timeout as a fallback
        timeoutId = setTimeout(() => {
            console.log(`Tab ${tabId} did not send a 'complete' status in 5 seconds. Continuing anyway.`);
            // If the timeout is reached, remove the listener
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
        }, 5000); // 5000 milliseconds = 5 seconds
    });
}

/**
 * Executes a given action on the currently active tab.
 * @param {{type: string, selector?: string, text?: string, url?: string}} action - The action object.
 * @returns {Promise<{success: boolean, message: string}>} A promise that resolves with the result.
 */
async function performActionInTab(action) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
        return { success: false, message: 'No active tab found.' };
    }
    const activeTab = tabs[0];
    const tabId = activeTab.id;

    try {
        // Handle browser-level actions that don't need content scripts
        switch (action.type) {
            case 'NAVIGATE':
                if (!action?.text) {
                    return { success: false, message: 'No URL provided for NAVIGATE.' };

                }
                await chrome.tabs.update(tabId, { url: action.text });
                await waitForTabLoad(tabId);
                return { success: true, message: `Navigated to ${action.text}` };

            case 'GO_BACK':
                await chrome.tabs.goBack(tabId);
                await waitForTabLoad(tabId);
                return { success: true, message: 'Navigated back.' };
        }

        // For DOM-level actions, inject and execute the logic
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            args: [action.type, action.selector, { text: action.text, url: action.url }],
            func: async (actionType, selector, data) => {
                // All of the following functions are now executed within the context of the web page
                let styleInjected = false;

                const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

                function findElement(selector) {
                    if (!selector) {
                        console.error('Action failed: No selector provided.');
                        return null;
                    }
                    return document.querySelector(selector);
                }

                function injectHighlightStyle() {
                    if (styleInjected) return;
                    const style = document.createElement('style');
                    style.id = 'agent-highlight-style';
                    style.textContent = `
                        .agent-highlight {
                            border: 3px solid red !important;
                            box-shadow: 0 0 10px rgba(255, 0, 0, 0.5) !important;
                            transition: border 0.2s, box-shadow 0.2s;
                        }
                    `;
                    document.head.appendChild(style);
                    styleInjected = true;
                }

                async function highlightElement(element) {
                    injectHighlightStyle(); // Ensure style is present
                    element.classList.add('agent-highlight');
                    await delay(500); // Short delay to make highlight visible
                }

                async function simulateClick(element) {
                    // A more robust click that simulates a full user interaction
                    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
                    await delay(30);
                    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                    await delay(30);
                    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                    await delay(30);
                    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    await delay(30);
                }

                async function unhighlightElement(element) {
                    element.classList.remove('agent-highlight');
                    await delay(100); // Short delay after unhighlighting
                }

                async function simulateSelect(element, value) {
                    if (element.tagName.toLowerCase() === 'select') {
                        // For select elements, set the value and trigger change event
                        element.value = value;
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        // For other elements, simulate a click
                        simulateClick(element);
                    }
                }

                async function simulateType(element, text, andEnter = false) {
                    // 1. Simulate mouse moving over and clicking the element to focus
                    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
                    await delay(50); // Brief pause to simulate human interaction
                    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                    await delay(50); // Brief pause to simulate human interaction
                    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                    await delay(50); // Brief pause to simulate human interaction
                    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    await delay(50); // Brief pause to simulate human interaction
                    element.focus();
                    await delay(50); // Brief pause to ensure focus is set
                    // 2. Clear the field before typing to ensure a clean slate
                    element.value = '';
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    await delay(50); // Brief pause after clearing

                    // 3. Simulate typing each character with a human-like delay
                    for (const char of text) {
                        element.dispatchEvent(new KeyboardEvent('keydown', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true }));
                        element.value += char;
                        element.dispatchEvent(new Event('input', { bubbles: true })); // Trigger input event for each character
                        element.dispatchEvent(new KeyboardEvent('keyup', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true }));
                        await delay(Math.random() * 70 + 40); // Random delay between 40ms and 110ms
                    }
                    element.dispatchEvent(new Event('change', { bubbles: true })); // Final change event

                    // 4. Simulate pressing Enter if required
                    if (andEnter) {
                        await delay(200); // Pause before enter
                        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
                        await delay(200); // Pause to simulate human interaction
                        element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
                        await delay(200); // Pause to simulate human interaction
                    }

                    // 5. Blur the element to signify typing is complete
                    await delay(100);
                    element.blur();
                }

                // This is the main function that gets called inside the tab
                async function performAction(actionType, selector, data) {
                    const element = findElement(selector);

                    if (!element) {
                        return { success: false, message: `Element not found for selector: ${selector}` };
                    }

                    try {
                        await highlightElement(element); // Highlight before action

                        switch (actionType) {
                            case 'CLICK':
                            case 'CHECK':
                            case 'UNCHECK':
                                await simulateClick(element);
                                break;

                            case 'SELECT':
                                if (typeof data.text !== 'string') {
                                    return { success: false, message: 'No value provided for SELECT action.' };
                                }
                                await simulateSelect(element, data.text);
                                break;

                            case 'TYPE':
                            case 'TYPE_AND_ENTER':
                                if (typeof data.text !== 'string') {
                                    return { success: false, message: 'No text provided for TYPE action.' };
                                }
                                await simulateType(element, data.text, actionType === 'TYPE_AND_ENTER');
                                break;

                            default:
                                return { success: false, message: `Unknown or unhandled action type: ${actionType}` };
                        }
                        return { success: true, message: `Action '${actionType}' performed successfully on '${selector}'.` };
                    } finally {
                        await unhighlightElement(element); // Ensure unhighlighting happens even if action fails
                    }
                }

                // Execute the action and return the result
                return await performAction(actionType, selector, data);
            },
        });

        // After the action, wait for any potential page load to complete.
        await waitForTabLoad(tabId);

        if (results && results[0] && results[0].result) {
            return results[0].result;
        } else {
            return { success: false, message: 'Action script did not return a result.' };
        }

    } catch (error) {
        console.error(`Error performing action ${action.type}:`, error);
        return { success: false, message: `An error occurred: ${error.message}` };
    }
}

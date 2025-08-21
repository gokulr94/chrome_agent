/**
 * This script is injected into the active tab to scrape its DOM content.
 */

/**
 * Main function to generate the simplified DOM JSON and the selector map.
 * @returns {{domDto: object, selectorMap: object}} An object containing both the DTO and the map.
 */
async function generateDomAndSelectorMap() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let screenshotDataUrl = '';
    let screenShotError = '';
    let domJsonError = '';
    let pageData =  null;
    // --- Validation Checks ---
    if (!tab || !tab.id) {
      throw new Error("Could not find an active tab.");
    }
    if (tab.status !== 'complete') {
      console.error("The active tab is not fully loaded. Please wait and try again.");
    }
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('https://chrome.google.com')) {
      // Open 'about:blank' on protected pages as requested
      await chrome.tabs.create({ url: 'https://duckduckgo.com' });
    }

    // --- Main Logic ---
    // 1. Capture the screenshot
    try {
      screenshotDataUrl = await chrome.tabs.captureVisibleTab({
        format: 'jpeg',
        quality: 80
      });
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      screenShotError = error.message || "Unknown error capturing screenshot.";
    }

    try {
      // 2. Execute the content script and await its result directly
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: scrapePageInTab,
      });

      if (!injectionResults || !injectionResults[0] || !injectionResults[0].result) {
        console.error("No valid result returned from the content script.");
        domJsonError = "No valid result returned from the content script.";
      }

      // 3. Process results and return the final object
      pageData = injectionResults?.[0]?.result;

    } catch (error) {
      console.error("Error during script injection:", error);
      domJsonError = error.message || "Unknown error during script injection.";
    }
    base64Screenshot = screenshotDataUrl.split(',')[1];
    return {
      domDto: pageData?.domDto,
      selectorMap: pageData?.selectorMap??{},
      screenshot: base64Screenshot,
      screenShotError,
      domJsonError,
    };

  } catch (error) {
    // Catch any errors from the entire process
    console.error("Error during DOM and screenshot generation:", error);
    // Re-throw the error to let the caller handle it
    throw error;
  }
}

function scrapePageInTab() {
  /**
 * Checks if an element is visible to the user.
 * @param {HTMLElement} el The element to check.
 * @returns {boolean} True if the element is visible.
 */
  function isElementVisible(el) {
    if (!el) return false;
    // An element with no offsetParent is not visible
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') {
      return false;
    }
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  }

  /**
 * Recursively parses a DOM node and its children into the specified DTO format.
 * @param {HTMLElement} node The DOM node to parse.
 * @param {string} parentId The unique ID of the parent element.
 * @param {string} parentSelector The CSS selector of the parent element.
 * @param {object} selectorMap A map to store uniqueId -> selector mappings.
 * @returns {Array} An array of child element DTOs.
 */
  function parseNodeChildren(node, parentId, parentSelector, selectorMap) {
    const children = [];
    if (!node.children) return children;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const tagName = child.tagName.toLowerCase();

      // Skip non-interactive or irrelevant tags
      if (['script', 'style', 'meta', 'link', 'head'].includes(tagName)) {
        continue;
      }

      const uniqueId = `${parentId}${i}_`;
      // Generate a robust CSS selector using its position relative to siblings
      const currentSelector = `${parentSelector} > :nth-child(${i + 1})`;
      selectorMap[uniqueId] = currentSelector;

      const attributes = {
      };
      // Get other relevant attributes
      ['class', 'id'].forEach(attr => {
        if (!child.hasAttribute(attr)) {
          attributes[attr] = child.getAttribute(attr);
        }
      });

      const elementDto = {
        tag: tagName,
        id: uniqueId,
        attributes: attributes,
        isDisabled: child.disabled || false,
        isVisible: isElementVisible(child),
        children: parseNodeChildren(child, uniqueId, currentSelector, selectorMap),
        innerText: child.innerText ? child.innerText.trim().substring(0, 100) : ''
      };

      children.push(elementDto);
    }
    return children;
  }

  const selectorMap = {};
  const domDto = {
    url: window.location.href,
    meta: {
      title: document.title,
    },
    // The key part: `document.body` here is the webpage's body.
    elements: parseNodeChildren(document.body, '', 'body', selectorMap),
  };
  return { domDto, selectorMap };
}

// filepath: /agent_extension/agent_extension/js/background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Agent Extension installed.');
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);

  if (message.action === 'checkSubscriptionKey') {
    const subscriptionKey = localStorage.getItem('subscriptionKey');
    if (subscriptionKey) {
      sendResponse({ valid: true });
    } else {
      sendResponse({ valid: false });
    }
  }
  return true;
});
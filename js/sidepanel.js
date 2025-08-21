// This file handles the client-side JavaScript for the side panel, including the logic for displaying the splash screen, checking for the subscription key, and navigating between different sections.

document.addEventListener('DOMContentLoaded', () => {
  const splashScreen = document.getElementById('splash-screen');
  const subscriptionScreen = document.getElementById('subscription-screen');
  const subscriptionInput = document.getElementById('subscription-key');
  const continueButton = document.getElementById('continue-button');

  // Show splash screen for 2-3 seconds
  setTimeout(() => {
    checkSubscriptionKey();
  }, 2000); // Shortened for faster testing

  function checkSubscriptionKey() {
    const subscriptionKey = localStorage.getItem('subscriptionKey');
    if (subscriptionKey) {
      // If key exists, go to the main application
      window.location.href = 'main.html';
    } else {
      // Otherwise, show the subscription screen
      splashScreen.style.display = 'none';
      subscriptionScreen.style.display = 'flex';
    }
  }

  // Event listeners
  if (continueButton) {
    continueButton.addEventListener('click', () => {
      const key = subscriptionInput?.value?.trim();
      if (key) {
        localStorage.setItem('subscriptionKey', key);
        // Go to main app after setting the key
        window.location.href = 'main.html';
      } else {
        alert('Please enter a valid subscription key.');
      }
    });
  }
});
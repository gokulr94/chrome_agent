// This file now orchestrates the API call to generate a plan.

const agentData = {
  /**
   * Generates a plan by calling the Gemini API.
   * @param {string} userQuery - The query from the user's input.
   * @returns {Promise<string[]>} A promise that resolves to an array of plan steps.
   */
  getPlan: async (userQuery) => {
    const apiKey = localStorage.getItem('subscriptionKey');
    if (!apiKey) {
      console.error('API Key not found.');
      // Return a rejected promise or throw an error to be caught
      throw new Error('Subscription Key is not set. Please set it in Settings.');
    }

    try {
      // 1. Generate the request payload
      const payload = await generatePlannerPayload(userQuery);
      console.log('Sending to Gemini:', payload);

      // 2. Call the Gemini API
      const response = await callGemini(apiKey, payload);
      console.log('Received from Gemini:', response);

      // 3. Process the response
      // The actual plan is in a JSON string within the response, so we need to parse it.
      const responseText = response.candidates[0].content.parts[0].text;
      const planObject = JSON.parse(responseText);

      if (planObject && planObject.plan) {
        return planObject.plan; // This is the array of strings we want
      } else {
        throw new Error('Invalid plan format received from API.');
      }
    } catch (error) {
      console.error('Error getting plan:', error);
      // Propagate the error to be handled by the UI
      throw error;
    }
  },
};
// This file helps prepare the data payload for the Planner API call.

async function getActiveTabInfo() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs && tabs.length > 0) {
    return { url: tabs[0].url, title: tabs[0].title };
  }
  return { url: 'N/A', title: 'N/A' };
}

/**
 * Fetches the user's geographical coordinates.
 * Note: This returns coordinates. Converting to a city name requires a reverse-geocoding API.
 * @returns {Promise<string>} A string with latitude and longitude.
 */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return resolve('Geolocation not supported.');
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
      },
      (error) => {
        // Common errors: PERMISSION_DENIED, POSITION_UNAVAILABLE
        console.warn('Geolocation error:', error.message);
        resolve('Location access denied or unavailable.');
      }
    );
  });
}

/**
 * Generates the full request payload for the Gemini Planner API using a defined schema.
 * @param {string} userQuery - The query typed by the user.
 * @returns {object} The complete request body object.
 */
async function generatePlannerPayload(userQuery) {
  // 1. Define the exact JSON structure we want Gemini to return.
  const plannerSchema = {
    type: 'OBJECT',
    properties: {
      type: { 'type': 'STRING' },
      plan: {
        'type': 'ARRAY',
        'items': { 'type': 'STRING' }
      }
    },
    required: ['type', 'plan']
  };

  const {url, title} = await getActiveTabInfo();
  const userLocation = getUserLocation();

  const plannerSystemInstruction = `
You are a master planning agent for a web automation agent chrome extension which has access to a tab. Your sole purpose is to analyze a user's request and the initial state of their browser, and then create a high-level, step-by-step plan.

RULES:
1. The steps in your plan should be simple, imperative commands (e.g., "Navigate to perplexity.com", "Find the search bar and type 'weather in Bengaluru'", "Click the search button").
2. Do NOT try to identify specific element IDs or perform actions. You are only creating the strategy.
3. Keep the plan as simple and direct as possible.
4. Your response MUST BE a single, valid JSON object and nothing else.
5. The JSON object must have a \`type\` key set to 'create_plan' and a \`plan\` key containing an array of strings.
6. Prefer using search engines like duckduckgo or perplexity.com to find information.
7. If the user asks for a specific website, include a step to navigate to that site.
8. If the user asks for information, include a step to search for it.
9. Make the plan as long as needed to cover the user's request, but keep each step simple.
10. If the user asks for a specific action, location, date or time, product or service, specific action that requires manual intervention, include a step to notify the user.
11. Sometime the agent might not have full context of the user request, so detail out thr plan in such a way.


Current Date: ${new Date().toISOString()}
User Name : krishnark@google.com
Location: ${userLocation}
Current Tab URL: ${url}
Current Tab Title: ${title}
`;

  const promptText = `
  ${plannerSystemInstruction}
  Create a step-by-step plan for the following user request. User Request: "${userQuery}".`;

  // 3. Assemble the final payload.
  return {
    contents: [{
      parts: [{ 'text': promptText }]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: plannerSchema,
    },
  };
}
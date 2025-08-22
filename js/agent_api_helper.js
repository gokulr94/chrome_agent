/**
 * This file prepares and sends the request to the "Executor" agent,
 * which decides the next single action to take.
 */

/**
 * Generates the payload and calls the Gemini API to determine the next agent action.
 *
 * @param {string[]} plan - The full, multi-step plan.
 * @param {number} currentStepIndex - The index of the plan step we are currently on.
 * @param {string[]} actionSummary - A log of actions taken so far.
 * @param {object} domJson - The simplified JSON representation of the current page.
 * @returns {Promise<object>} The structured action object from the API.
 */
async function getNextAgentAction(plan, currentStepIndex, actionSummary, domJson, screenshot, screenShotError, domJsonError) {
  const apiKey = localStorage.getItem('subscriptionKey');
  if (!apiKey) {
    throw new Error('Subscription Key is not set.');
  }

  // 1. Define the exact JSON structure we want the AI to return.
  const executorSchema = {
    type: 'OBJECT',
    properties: {
      action: {
        type: 'STRING',
        enum: ['NAVIGATE', 'CLICK', 'SELECT', 'GO_BACK', 'CHECK', 'UNCHECK', 'TYPE', 'TYPE_AND_ENTER', 'ABORT', 'REQUIRES_MANUAL_INTERVENTION', 'WAIT', 'COMPLETED',],
      },
      step: {
        type: 'STRING',
        enum: ['STAY_ON_STEP', 'NEXT_STEP', 'PREV_STEP'],
      },
      data: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' }, // Used for URL on NAVIGATE or text for TYPE
          id: { type: 'STRING' },
          summary: { type: 'STRING' },
        },
        required: ['summary'],
      },
    },
    required: ['action', 'step', 'data'],
  };

  // 2. Construct the detailed prompt for the AI.
  const promptText = `
You are an expert web automation agent. Your goal is to execute a plan step-by-step.
Analyze the provided plan, the summary of actions already taken, and the current state of the web page (as a simplified JSON).
Based on all this information, decide the single next action to perform.

**THE PLAN:**
${plan.map((step, index) => `- ${index === currentStepIndex ? `[CURRENT] ` : ''}${step}`).join('\n')}

**ACTIONS COMPLETED SO FAR:**
${actionSummary ? actionSummary : 'None.'}

**CURRENT PAGE STATE (SIMPLIFIED JSON):**
\`\`\`json
${JSON.stringify(domJson)}
\`\`\`

**YOUR TASK:**
Based on the **[CURRENT]** step of the plan and the page state, determine the next immediate action.
- Your response MUST be a valid JSON object that adheres to the provided schema.
- The 'summary' should be a human-readable sentence describing the action you are taking.
- **If the action is 'NAVIGATE', you MUST provide the full URL in the 'data.text' field.**
- For actions like 'CLICK' or 'TYPE', provide the 'id' of the target element from the page state JSON.
- The image provided is a screenshot of the current page, which may help you understand the context better.
- Try Alteast 2-3 Times before ABORTING the plan to ensure robustness. But if you are unable to proceed, return 'ABORT' action with the reason in summary. Dont keep on trying.
- When ever manual intervention is required such as filling a form for which you dont have enough information, return 'REQUIRES_MANUAL_INTERVENTION' action with the reason in summary.
- When comes to filling credentials, always return 'REQUIRES_MANUAL_INTERVENTION' action with the reason in summary.
- If browser has difficulty in performing the action in certain website, try alternate website unless user has sperically mentioned to perform the action on that website.
- Whenever you encounter a popup, try to act on the popup first before proceeding with the plan.
- Always verify with the image that previous action was successful before proceeding with the next action.
- Some Places like typing place etc, suggestion might show up. In that case, correct the name as per suggestion, like bangalore -> bengaluru.
- Wait will wait for 2 secs. but use it wisely and dont keep looping on it. Abort if failed or Completed if successful. If there is a possibility of retry from few prev steps please do. Only last option should be ABORT.
- Try to give as much information as possible to the next agent. Things like recepe, ingredients, steps etc, give more info.
- Try to go an extra mile to what you have instructed, like going till payment page etc.
- Sometimes the input field maynot be a textarea, might be content editable div. Check for that as well. 
- Same for Clicks, sometimes it may not be a button, it can be a link or a div. Check for that as well. If click is trigerred or type is trigerred and it doesnt work, then try to go down the dom element and try to find the element again.
- During search if you think enter has not work then try finding search and click or anything that will trigger the search.

Error Status:
${screenShotError ? `Screenshot Error: ${screenShotError}` : 'No screenshot error.'}
${domJsonError ? `DOM JSON Error: ${domJsonError}` : 'No DOM JSON error.'}
  `;

  // 3. Assemble the final payload.
  const payload = {
    contents: [{
      parts: [{ text: promptText }]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: executorSchema,
    },
  };

  if (screenshot) {
    payload.contents[0].parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: screenshot,
      }
    });
  }

  // 4. Call the API and process the response.
  console.log('Sending payload to Executor Agent:', payload);
  // Assumes a global callGemini function exists
  const response = await callGemini(apiKey, payload);
  console.log('Received response from Executor Agent:', response);

  const responseText = response.candidates[0].content.parts[0].text;
  return JSON.parse(responseText);
}
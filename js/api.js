// This file abstracts the raw fetch call to the Google Gemini API.

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Calls the Gemini API to get a response.
 * @param {string} apiKey - The user's API key.
 * @param {object} requestBody - The full request body to send to the API.
 * @returns {Promise<object>} The JSON response from the API.
 * @throws {Error} If the API call fails.
 */
async function callGemini(apiKey, requestBody) {
    const url = `${API_ENDPOINT}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', JSON.stringify(errorData));
            throw new Error(`API Error: ${response.status} ${response.statusText}. ${errorData?.error?.message || ''}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to call Gemini API:', error);
        // Re-throw the error to be caught by the calling function
        throw error;
    }
}
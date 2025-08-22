# Chrome Agent

This is a Chrome extension that provides agent-like capabilities to automate tasks and interact with web pages.

## What it Does

This Chrome extension acts as an **AI-powered web automation agent**. A user provides a high-level goal, and the agent uses an AI model to autonomously navigate and interact with websites to achieve it.

---

## Hackathon Submission Details

This project was developed for the hackathon, focusing on the following judging criteria.

### Innovation in AI

*   **Implemented:** The core of this project is a sophisticated AI agent that operates on a continuous `Observe -> Decide -> Act` loop.
    *   **Observe:** The agent programmatically captures the DOM structure and a screenshot of the current web page, gathering the necessary context for decision-making.
    *   **Decide:** It leverages the **Gemini-1.5-flash** model to analyze the visual and structural data of the page, alongside the user's goal and its own action history. This allows it to make complex, context-aware decisions about the next best action (e.g., which button to click, what text to input).
    *   **Act:** The agent executes the chosen action in the browser, emulating a human user.
*   **Novelty:** This project moves beyond simple text generation to a more advanced application of AI for autonomous task execution and web automation. It demonstrates a creative and technically deep approach to making web interaction programmable through natural language.

### User Value

*   **Implemented:** The extension provides significant value by making web automation accessible to everyone, regardless of technical skill.
    *   **Simplicity:** Users can automate complex or repetitive tasks (like filling forms, searching for data, or navigating complex sites) simply by stating their goal.
    *   **Efficiency:** It saves users significant time and reduces the manual effort required for tedious web-based activities.
    *   **Usability:** The Chrome side panel offers a clean and intuitive interface for users to input their goals, monitor the agent's real-time progress, and control its execution (pause, resume, stop).
*   **Future Potential:** The user experience could be further enhanced by introducing features like a library of pre-built automation "recipes" for common tasks, voice command integration, and more robust AI-driven error recovery.

### Business or Social Value

*   **Implemented (Potential):** The project lays the groundwork for significant value creation. The inclusion of a subscription key mechanism demonstrates a clear path toward a viable business model.
    *   **Business Value:** This can be developed into a powerful SaaS product for businesses, enabling automated data scraping, quality assurance testing, and streamlining of internal workflows, leading to major cost savings and productivity gains.
    *   **Social Value:** The agent can serve as a powerful accessibility tool, empowering users with disabilities to navigate the web more easily. It can also be used by non-profits and educational institutions to automate data collection and other tedious tasks, freeing up valuable resources.
*   **Future Potential:** The platform could be expanded with enterprise-grade features, including team collaboration, advanced analytics dashboards, and API integrations with other business systems like CRMs and ERPs.

### Tools Used

*   **AI Model:** Gemini-1.5-flash
*   **Prototyping & Brainstorming:** Gemini
*   **Prompt Engineering:** AI Studio
*   **Extension Development:** Firebase

### Team & Contributions

This project was a collaboration between team members from different PAs, earning bonus points for cross-organizational teamwork.

*   **Krishna Raj K** (AI and Computing Infrastructure): Responsible for the core build of the Chrome extension.
*   **Gokul R** (Technical Solutions): Focused on AI integration, including tool usage, providing feedback to the LLM and training the model

---

## Installation

1. Clone this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable "Developer mode".
4. Click "Load unpacked" and select the cloned repository directory.

## Usage

[Instructions on how to use the extension will go here.]

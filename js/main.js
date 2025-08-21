// This file controls the logic for the main application view (main.html).

document.addEventListener('DOMContentLoaded', () => {
  // ... (all existing element selections remain the same)
  const headerTitle = document.getElementById('header-title');
  const footer = document.querySelector('footer');
  const views = document.querySelectorAll('.view');
  const chatView = document.getElementById('chat-view');
  const planView = document.getElementById('plan-view');
  const progressView = document.getElementById('progress-view');
  const settingsView = document.getElementById('settings-view');
  const settingsBtn = document.getElementById('settings-btn');
  const newTaskBtn = document.getElementById('new-task-btn');
  const toggleApiKeyBtn = document.getElementById('toggle-api-key');
  const promptInput = document.getElementById('prompt-input');
  const apiKeyInput = document.getElementById('api-key-input');

  let agent = null; // Hold the single agent instance

  const state = {
    currentView: 'chat',
    planData: [], // This will hold the plan data for the plan view
  };

  // --- View Switching Logic ---
  function showView(viewId) {
    // ... (This function remains mostly the same)
    state.currentView = viewId;
    views.forEach((view) => (view.style.display = 'none'));

    let currentViewElement;
    switch (viewId) {
      case 'chat':
        currentViewElement = chatView;
        headerTitle.textContent = 'Ask agent to do anything';
        renderChatFooter();
        break;
      case 'plan':
        currentViewElement = planView;
        headerTitle.textContent = 'Execution Plan';
        footer.innerHTML = ''; // Clear footer; it's controlled by handlePlanRequest
        break;
      case 'progress':
        currentViewElement = progressView;
        headerTitle.textContent = 'Progress';
        // The footer is now rendered by handleAgentStateChange
        if (!agent) { // Only create a new agent if one doesn't exist
          agent = new AgentOrchestrator(state.planData);
          agent.subscribe(handleAgentStateChange);
          agent.start(); // Start the agent with the current plan data
        }
        break;
      case 'settings':
        currentViewElement = settingsView;
        headerTitle.textContent = 'Settings';
        apiKeyInput.value = localStorage.getItem('subscriptionKey') || '';
        renderSettingsFooter();
        break;
    }
    if (currentViewElement) currentViewElement.style.display = 'flex';
  }

  // --- Footer Rendering ---
  // ... (All renderFooter functions remain exactly the same)
  function renderChatFooter() {
    footer.innerHTML = '<button id="send-btn" class="footer-btn">Send</button>';
    document.getElementById('send-btn').addEventListener('click', handlePlanRequest);
  }

  function renderPlanFooter() {
    footer.innerHTML = `
      <button id="edit-btn" class="footer-btn secondary">Edit</button>
      <button id="start-agent-btn" class="footer-btn">Start Agent</button>
    `;
    document.getElementById('edit-btn').addEventListener('click', () => showView('chat'));
    document.getElementById('start-agent-btn').addEventListener('click', () => showView('progress'));
  }

  function renderProgressFooter(isPaused) {
    const pauseButtonText = isPaused ? 'Resume' : 'Pause';
    const pauseButtonId = isPaused ? 'resume-btn' : 'pause-btn';
    footer.innerHTML = `
      <button id="${pauseButtonId}" class="footer-btn secondary">${pauseButtonText}</button>
      <button id="stop-agent-btn" class="footer-btn danger">Stop</button>
    `;
    document.getElementById(pauseButtonId).addEventListener('click', () => {
      if (isPaused) {
        agent.resume();
      } else {
        agent.pause();
      }
    });
    document.getElementById('stop-agent-btn').addEventListener('click', () => {
      agent.stop();
    });
  }

  function renderPlanFailedFooter() {
    footer.innerHTML = `
      <button id="retry-plan-btn" class="footer-btn secondary">Retry</button>
      <button id="new-task-btn-footer" class="footer-btn">New Task</button>
    `;
    document.getElementById('retry-plan-btn').addEventListener('click', handlePlanRequest);
    document.getElementById('new-task-btn-footer').addEventListener('click', () => {
      agent = null; // Clear the old agent instance
      showView('chat');
    });
  }

  function renderStoppedFooter(showRetry) {
    let buttons = '<button id="new-task-btn-footer" class="footer-btn">New Task</button>';
    if (showRetry) {
      buttons = `
        <button id="retry-btn" class="footer-btn secondary">Retry</button>
        ${buttons}
      `;
    }
    footer.innerHTML = buttons;

    if (showRetry) {
      document.getElementById('retry-btn').addEventListener('click', () => {
        agent.retry();
      });
    }
    document.getElementById('new-task-btn-footer').addEventListener('click', () => {
      agent = null; // Clear the old agent instance
      showView('chat');
    });
  }

  function renderSettingsFooter() {
    footer.innerHTML = '<button id="save-settings-btn" class="footer-btn">Save</button>';
    document.getElementById('save-settings-btn').addEventListener('click', () => {
      const newKey = apiKeyInput.value.trim();
      localStorage.setItem('subscriptionKey', newKey);
      alert('Settings saved!');
      showView('chat');
    });
  }


  // --- NEW: Central handler for agent state changes ---
  function handleAgentStateChange(agentState) {
    populateProgressView(agentState);
    updateFooter(agentState);
  }

  // --- NEW: Updates footer based on agent state ---
  function updateFooter(agentState) {
    if (agentState.isRunning) {
      renderProgressFooter(agentState.isPaused);
    } else {
      // Agent is stopped, completed, or has failed
      const hasFailed = agentState.logs.mainStep.some(step => step.status === 'Failed');
      renderStoppedFooter(hasFailed);
    }
  }

  // --- UPDATED: Dynamic Content Population ---
  function populatePlanView(planData) {
    const planStepsContainer = document.getElementById('plan-steps');
    // planData can be a plan array, a loading message, or an error message.
    if (typeof planData === 'string') {
      state.planData = [planData]; // Store the message in state

      planStepsContainer.innerHTML = `<div class="plan-message">${planData}</div>`;
    } else if (Array.isArray(planData)) {
      state.planData = planData; // Store the plan data in state
      planStepsContainer.innerHTML = planData
        .map((step, index) => `<div class="plan-step">${index + 1}. ${step}</div>`)
        .join('');
    }
  }

  function populateProgressView(state) {
    // ... (This function remains the same)
    const progressStepsContainer = document.getElementById('progress-steps');
    progressStepsContainer.innerHTML = state.logs.mainStep.map((mainStep, index) => {
      const subStepsHtml = (state.logs.subStep[index] || []).map(subStep => {
        return `<li class="substep status-${subStep.status.toLowerCase()}">${subStep.name}</li>`;
      }).join('');

      return `
                <li class="main-step status-${mainStep.status.toLowerCase()}">
                    <div class="step-title">${mainStep.name}</div>
                    <ul class="substeps">${subStepsHtml}</ul>
                </li>
            `;
    }).join('');

    // Autoscroll to the bottom of the main content area
    const mainContentArea = document.querySelector('main');
    if (mainContentArea) {
      mainContentArea.scrollTop = mainContentArea.scrollHeight;
    }
  }

  // --- NEW: Asynchronous Plan Request Handler ---
  async function handlePlanRequest() {
    const userQuery = promptInput.value.trim();
    if (!userQuery) return;

    // 1. Switch to the plan view and show a loading state
    showView('plan');
    populatePlanView('🤖 Generating plan...');

    // 2. Call the agent logic to get the plan
    try {
      const plan = await agentData.getPlan(userQuery);
      // 3. If successful, populate the view with the plan and show the start footer
      populatePlanView(plan);
      renderPlanFooter();
    } catch (error) {
      // 4. If it fails, show an error message and the retry footer
      populatePlanView(`❌ Error: ${error.message}`);
      renderPlanFailedFooter();
    }
  }

  // --- Event Listeners ---
  settingsBtn.addEventListener('click', () => showView('settings'));
  newTaskBtn.addEventListener('click', () => {
    promptInput.value = '';
    agent = null; // Clear agent instance
    showView('chat');
  });

  // UPDATED: The event listener now calls the new async handler
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePlanRequest();
    }
  });

  toggleApiKeyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    e.target.textContent = isPassword ? 'Hide' : 'Show';
  });

  // --- Initial Load ---
  showView('chat');
});
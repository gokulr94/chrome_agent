/**
 * This class is the central brain of the automation. It manages the state,
 * runs the execution loop, and communicates with all other libraries.
 */
class AgentOrchestrator {
    constructor(plan) {
        this.originalPlan = [...plan]; // Keep a copy of the original plan for retry
        this.onStateChange = null;
        this._initState(plan);
    }

    /** Initializes or resets the agent's state. */
    _initState(plan) {
        this.plan = plan;
        this.state = {
            plan: this.plan,
            currentStepIndex: 0, // Pointer to the original plan
            logs: {
                mainStep: [], // Array of {status, name}
                subStep: [],  // Array of arrays of {status, name}
            },
            isPaused: false,
            isRunning: false,
        };
    }

    /**
     * Subscribes a callback function to be called on any state change.
     * @param {function} callback - The function to call with the new state.
     */
    subscribe(callback) {
        this.onStateChange = callback;
    }

    /** Notifies the UI controller of any state changes. */
    _notify() {
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }

    /** Helper to get the current array of sub-step logs. */
    _getCurrentSubStepLog() {
        return this.state.logs.subStep[this.state.logs.subStep.length - 1];
    }

    /** Helper to get the current main step log object. */
    _getCurrentMainStepLog() {
        return this.state.logs.mainStep[this.state.logs.mainStep.length - 1];
    }

    /** Starts the agent's execution loop. */
    start() {
        if (this.state.isRunning) return;
        this.state.isRunning = true;
        // Start the log for the first step
        const firstStepName = this.plan[0];
        this.state.logs.mainStep.push({ status: 'InProgress', name: firstStepName });
        this.state.logs.subStep.push([{ status: 'Completed', name: `Agent started with plan: "${firstStepName}"` }]);
        this._notify();
        this._executionLoop();
    }

    /** Pauses the execution loop. */
    pause() {
        if (!this.state.isRunning || this.state.isPaused) return;
        this.state.isPaused = true;
        this._getCurrentSubStepLog().push({ status: 'Paused', name: 'Agent paused by user.' });
        this._getCurrentMainStepLog().status = 'Paused';
        this._notify();
    }

    /** Resumes the execution loop. */
    resume() {
        if (!this.state.isRunning || !this.state.isPaused) return;
        this.state.isPaused = false;
        this._getCurrentSubStepLog().push({ status: 'Completed', name: 'Agent resumed by user.' });
        this._getCurrentMainStepLog().status = 'InProgress';
        this._notify();
        this._executionLoop(); // Relaunch the loop
    }

    /** Stops the agent and cleans up. */
    stop() {
        if (!this.state.isRunning) return;
        this.state.isRunning = false;
        this.state.isPaused = false;
        const currentMainStep = this._getCurrentMainStepLog();
        if (currentMainStep && currentMainStep.status === 'InProgress') {
            this._getCurrentMainStepLog().status = 'Failed';
        }
        this._getCurrentSubStepLog().push({ status: 'Completed', name: 'Agent stopped by user.' });
        this._notify();
    }

    /** The main loop that drives the agent's actions. */
    async _executionLoop() {
        while (this.state.isRunning && !this.state.isPaused) {
            try {
                // Format the log history for the AI
                const actionSummary = this.state.logs.mainStep.map((step, index) => {
                    const subLogs = this.state.logs.subStep[index].map(s => `  - [${s.status}] ${s.name}`).join('\n');
                    return `Step: ${step.name} [${step.status}]\n${subLogs}`;
                }).join('\n\n');

                // 1. Get the current state of the page
                this._getCurrentSubStepLog().push({ status: 'Completed', name: 'Reading page content...' });
                this._notify();
                const { domDto, selectorMap, screenshot, screenShotError, domJsonError } = await generateDomAndSelectorMap();

                // 2. Ask Gemini for the next action
                this._getCurrentSubStepLog().push({ status: 'Completed', name: 'Deciding next action...' });
                this._notify();
                const nextAction = await getNextAgentAction(
                    this.plan,
                    this.state.currentStepIndex,
                    actionSummary,
                    domDto,
                    screenshot,
                    screenShotError,
                    domJsonError
                );

                // 3. Handle special actions from the AI
                if (nextAction.action === 'ABORT') {
                    this._getCurrentSubStepLog().push({ status: 'Failed', name: `Execution aborted by AI: ${nextAction.data.summary}` });
                    this.abort();
                    return;
                }

                if (nextAction.action === 'REQUIRES_MANUAL_INTERVENTION') {
                    this._getCurrentSubStepLog().push({ status: 'Paused', name: `Paused for manual intervention: ${nextAction.data.summary}` });
                    const currentMainStep = this._getCurrentMainStepLog();
                    if (currentMainStep) currentMainStep.status = 'Paused';
                    this.pause();
                    return;
                }

                if (nextAction.action === 'WAIT') {
                    const lastSubStep = this._getCurrentSubStepLog();
                    lastSubStep.push({ status: 'InProgress', name: `Executing: ${nextAction.data.summary}` });
                    this._notify();
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds
                    lastSubStep.slice(-1)[0].status = 'Completed';
                    this._notify();
                    continue; // Continue to next loop iteration to re-evaluate
                }

                if (nextAction.action === 'COMPLETED') {
                    this._getCurrentSubStepLog().push({ status: 'Completed', name: nextAction.data.summary || 'Action completed successfully.' });
                    this._getCurrentMainStepLog().status = 'Completed';
                    this.state.currentStepIndex++;
                    if (this.state.currentStepIndex >= this.plan.length) {
                        this._getCurrentSubStepLog().push({ status: 'Completed', name: 'Plan completed successfully!' });
                        this.state.isRunning = false; // End of plan
                        this._notify();
                        return;
                    } else {
                        const newStepDescription = this.plan[this.state.currentStepIndex];
                        this.state.logs.mainStep.push({ status: 'InProgress', name: newStepDescription });
                        this.state.logs.subStep.push([{ status: 'Completed', name: `Now executing step: "${newStepDescription}"` }]);
                    }
                    this._notify();
                    continue; // Continue to next loop iteration to re-evaluate
                }

                // 4. Prepare and execute the action in the browser
                const actionDetails = {
                    type: nextAction.action,
                    selector: nextAction.data.id ? selectorMap?.[nextAction.data.id] : null,
                    text: nextAction.data.text,
                };

                this._getCurrentSubStepLog().push({ status: 'InProgress', name: `Executing: ${nextAction.data.summary}` });
                this._notify();
                const result = await performActionInTab(actionDetails);

                // 5. Update state based on action result
                const lastSubStep = this._getCurrentSubStepLog().slice(-1)[0];
                if (result.success) {
                    lastSubStep.status = 'Completed';

                    // Update the plan step based on AI's instruction
                    if (nextAction.step === 'NEXT_STEP') {
                        this.state.currentStepIndex++;
                    } else if (nextAction.step === 'PREV_STEP') {
                        this.state.currentStepIndex = Math.max(0, this.state.currentStepIndex - 1);
                    }

                    // If the AI moved to a new step, finalize the old step and create a new log entry
                    if (nextAction.step !== 'STAY_ON_STEP') {
                        // Mark the step we are leaving as 'Completed' since the agent is moving on.
                        this._getCurrentMainStepLog().status = 'Completed';

                        if (this.state.currentStepIndex >= this.plan.length) {
                            this._getCurrentSubStepLog().push({ status: 'Completed', name: 'Plan completed successfully!' });
                            this.state.isRunning = false; // End of plan
                        } else {
                            const newStepDescription = this.plan[this.state.currentStepIndex];
                            this.state.logs.mainStep.push({ status: 'InProgress', name: newStepDescription });
                            this.state.logs.subStep.push([{ status: 'Completed', name: `Now executing step: "${newStepDescription}"` }]);
                        }
                    }
                } else {
                    // Action failed. Log it and let the loop continue without advancing the step.
                    // The AI will see the failure in the next iteration's summary and can decide how to proceed.
                    lastSubStep.status = 'Failed';
                    lastSubStep.name = `${lastSubStep.name} (Error: ${result.message})`;
                    console.error('Action failed:', JSON.stringify(actionDetails), `Reason: ${result.message}`);
                }

                this._notify();

            } catch (error) {
                this._handleCriticalError(error);
            }
        }
    }

    /** Aborts the agent and cleans up. */
    abort() {
        this.state.isRunning = false;
        this.state.isPaused = false;
        const currentMainStep = this._getCurrentMainStepLog();
        if (currentMainStep) {
            currentMainStep.status = 'Failed';
        }
        this._getCurrentSubStepLog().push({ status: 'Completed', name: 'Agent aborted.' });
        this._notify();
    }

    _handleCriticalError(error) {
        this._getCurrentSubStepLog().push({ status: 'Failed', name: `Critical Error: ${error.message}` });
        this._getCurrentMainStepLog().status = 'Failed';
        this.stop();
    }

    /** Resets the agent to its initial state and starts over. */
    retry() {
        // Reset state to initial conditions using the original plan
        this._initState(this.originalPlan);
        // Start the process again
        this.start();
    }
}
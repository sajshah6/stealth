/**
 * Workflow System
 * 
 * A step-based workflow engine that:
 * - Runs steps in sequence
 * - Passes outputs from one step as inputs to the next
 * - Handles user input when required
 * - Supports skipping steps conditionally
 * - Works with any LLM provider
 * 
 * @example
 * ```typescript
 * // Define a step
 * import { defineStep } from "@/lib/workflow";
 * 
 * defineStep({
 *   key: "my_step",
 *   name: "My Step",
 *   description: "Does something",
 *   inputFrom: ["previous_step"],
 *   async execute({ inputs }) {
 *     return { status: "completed", output: { result: "..." } };
 *   }
 * });
 * 
 * // Run a step
 * import { runStep } from "@/lib/workflow";
 * 
 * const result = await runStep(projectId, "my_step");
 * ```
 */

// Types
export type {
  StepStatus,
  LLMProvider,
  LLMConfig,
  StepDefinition,
  StepExecuteParams,
  StepExecuteResult,
  UserInputType,
  UserInputOption,
  UserInputRequest,
  ProjectContext,
  StepRecord,
} from "./types";

// Step definition
export { defineStep } from "./define-step";

// Registry
export {
  registerStep,
  getStep,
  getAllSteps,
  hasStep,
  setWorkflowOrder,
  getWorkflowOrder,
  getNextStepKey,
  getPreviousStepKey,
  getStepNumber,
} from "./registry";

// Context
export {
  loadProjectContext,
  gatherInputs,
  saveStepOutput,
  saveUserInput,
  markStepNeedsInput,
  markStepSkipped,
  markStepFailed,
} from "./context";

// Runner
export {
  runStep,
  submitUserInput,
  markStepRunning,
  type RunStepResult,
} from "./runner";

// Steps (import to register)
export * from "./steps";

// =============================================================================
// WORKFLOW SETUP
// =============================================================================

import { setWorkflowOrder } from "./registry";

/**
 * Initialize the workflow with the default step order.
 * Call this at app startup.
 * 
 * Note: document_upload is NOT included here because it's handled
 * by the UI before the workflow starts (creating project + uploading files).
 */
export function initializeWorkflow(): void {
  setWorkflowOrder([
    "initial_analysis",        // Step 1: Analyze documents
    "archetype_selection",     // Step 2: User selects archetype (or auto-skip)
    "ic_memo",                 // Step 3: Generate IC memo
    "extract_open_questions",  // Step 4: Extract structured open questions
    "deep_research",           // Step 5: Run Gemini Deep Research (5-30+ min)
    "research_integration",    // Step 6: Analyze research impact on thesis
    "final_ic_memo",           // Step 7: Generate final audited IC memo
    "white_paper_draft_1",     // Step 8: Generate white paper using Deep Revision (10-30+ min)
    "assemble_expert_panel",   // Step 9a: Assemble 15 experts for review
    "expert_panel_review",     // Step 9b: Expert panel review with iterative refinement
  ]);
}


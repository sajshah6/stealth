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
  markStepInProgress,
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
 * Note: document_upload is handled by the UI but must be included
 * in the workflow order so step numbers align with the database.
 */
export function initializeWorkflow(): void {
  setWorkflowOrder([
    "document_upload",         // Step 1: Upload documents (handled by UI)
    "initial_analysis",        // Step 2: Analyze documents
    "archetype_selection",     // Step 3: User selects archetype (or auto-determined)
    "ic_memo",                 // Step 4: Generate IC memo
    "extract_open_questions",  // Step 5: Extract structured open questions
    "deep_research",           // Step 6: Run Gemini Deep Research (5-30+ min)
    "research_integration",    // Step 7: Analyze research impact on thesis
    "final_ic_memo",           // Step 8: Generate final audited IC memo
    "white_paper_draft_1",     // Step 9: Generate white paper using Deep Revision (10-30+ min)
    "assemble_expert_panel",   // Step 10a: Assemble 15 experts for review
    "expert_panel_review",     // Step 10b: Expert panel review with iterative refinement
  ]);
}


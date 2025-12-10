"use server";

import { runStep, submitUserInput, initializeWorkflow, type RunStepResult } from "@/lib/workflow";

// Initialize workflow on first import
initializeWorkflow();

/**
 * Run a workflow step for a project
 */
export async function executeWorkflowStep(
  projectId: string,
  stepKey: string
): Promise<RunStepResult> {
  return runStep(projectId, stepKey);
}

/**
 * Submit user input for a step that needs it
 */
export async function submitStepUserInput(
  projectId: string,
  stepKey: string,
  userInput: Record<string, unknown>
): Promise<RunStepResult> {
  return submitUserInput(projectId, stepKey, userInput);
}


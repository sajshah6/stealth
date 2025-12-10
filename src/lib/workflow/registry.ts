/**
 * Step Registry
 * 
 * Central registry for all workflow steps.
 * Steps register themselves here, and the runner looks them up.
 */

import type { StepDefinition } from "./types";

// =============================================================================
// REGISTRY
// =============================================================================

const stepRegistry = new Map<string, StepDefinition>();

/**
 * Register a step definition.
 * Call this when defining a new step.
 */
export function registerStep(step: StepDefinition): void {
  if (stepRegistry.has(step.key)) {
    console.warn(`Step "${step.key}" is already registered. Overwriting.`);
  }
  stepRegistry.set(step.key, step);
}

/**
 * Get a step definition by key.
 */
export function getStep(key: string): StepDefinition | undefined {
  return stepRegistry.get(key);
}

/**
 * Get all registered steps.
 */
export function getAllSteps(): StepDefinition[] {
  return Array.from(stepRegistry.values());
}

/**
 * Check if a step is registered.
 */
export function hasStep(key: string): boolean {
  return stepRegistry.has(key);
}

// =============================================================================
// WORKFLOW ORDER
// =============================================================================

/**
 * The ordered list of step keys that define the workflow.
 * This determines the sequence of execution.
 */
let workflowOrder: string[] = [];

/**
 * Set the workflow order.
 * This defines which steps run in what sequence.
 */
export function setWorkflowOrder(order: string[]): void {
  // Validate all steps are registered
  for (const key of order) {
    if (!stepRegistry.has(key)) {
      throw new Error(`Step "${key}" is not registered but appears in workflow order.`);
    }
  }
  workflowOrder = order;
}

/**
 * Get the workflow order.
 */
export function getWorkflowOrder(): string[] {
  return [...workflowOrder];
}

/**
 * Get the next step key after the given step.
 * Returns null if at the end of the workflow.
 */
export function getNextStepKey(currentKey: string): string | null {
  const index = workflowOrder.indexOf(currentKey);
  if (index === -1 || index >= workflowOrder.length - 1) {
    return null;
  }
  return workflowOrder[index + 1];
}

/**
 * Get the previous step key before the given step.
 * Returns null if at the start of the workflow.
 */
export function getPreviousStepKey(currentKey: string): string | null {
  const index = workflowOrder.indexOf(currentKey);
  if (index <= 0) {
    return null;
  }
  return workflowOrder[index - 1];
}

/**
 * Get the step number (1-indexed) for a step key.
 */
export function getStepNumber(key: string): number {
  const index = workflowOrder.indexOf(key);
  return index === -1 ? -1 : index + 1;
}


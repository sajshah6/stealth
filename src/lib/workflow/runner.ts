/**
 * Step Runner
 * 
 * The engine that executes workflow steps.
 * Handles loading context, checking skip conditions, executing steps,
 * and advancing to the next step.
 */

import { createClient } from "@/lib/supabase/server";
import { getStep, getNextStepKey, getStepNumber } from "./registry";
import {
  loadProjectContext,
  gatherInputs,
  saveStepOutput,
  markStepInProgress,
  markStepSkipped,
  markStepFailed,
  markStepNeedsInput,
  saveUserInput,
} from "./context";
import type { StepDefinition, StepExecuteResult, ProjectContext } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export interface RunStepResult {
  success: boolean;
  status: "completed" | "needs_input" | "skipped" | "failed";
  output?: Record<string, unknown>;
  error?: string;
  nextStepKey?: string | null;
}

// =============================================================================
// MAIN RUNNER
// =============================================================================

/**
 * Run a specific step for a project.
 * 
 * @param projectId - The project ID
 * @param stepKey - The step to run
 * @param userInput - Optional user input if step was waiting for it
 */
export async function runStep(
  projectId: string,
  stepKey: string,
  userInput?: Record<string, unknown>
): Promise<RunStepResult> {
  const startTime = Date.now();
  console.log(`[Runner] ========== Starting step: ${stepKey} ==========`);
  console.log(`[Runner] Project: ${projectId}`);
  console.log(`[Runner] User input provided:`, userInput ? "yes" : "no");

  try {
    // 1. Get step definition
    const step = getStep(stepKey);
    if (!step) {
      console.error(`[Runner] Step "${stepKey}" not found in registry!`);
      return {
        success: false,
        status: "failed",
        error: `Step "${stepKey}" not found in registry`,
      };
    }
    console.log(`[Runner] Step definition found: ${step.name}`);

    // 2. Load project context
    console.log(`[Runner] Loading project context...`);
    const context = await loadProjectContext(projectId);
    console.log(`[Runner] Context loaded. Step outputs available:`, Object.keys(context.stepOutputs));

    // 3. Mark step as in_progress (now that we're about to run it)
    await markStepInProgress(projectId, stepKey);

    // 4. Check skip condition
    if (step.skipCondition?.(context)) {
      console.log(`[Runner] Skip condition met for "${stepKey}"`);
      await markStepSkipped(projectId, stepKey, "Skip condition met");
      const nextKey = getNextStepKey(stepKey);
      
      if (nextKey) {
        await createNextStep(projectId, nextKey);
        await updateProjectStep(projectId, nextKey);
        
        // Automatically run the next step
        console.log(`[Runner] Step "${stepKey}" skipped. Running next step: "${nextKey}"...`);
        return runStep(projectId, nextKey);
      }
      
      // No next step - workflow complete
      console.log(`[Runner] No next step - marking project complete`);
      await markProjectCompleted(projectId);
      return {
        success: true,
        status: "skipped",
        nextStepKey: null,
      };
    }

    // 5. Gather inputs from previous steps
    console.log(`[Runner] Gathering inputs from:`, step.inputFrom);
    const inputs = gatherInputs(context, step.inputFrom);
    console.log(`[Runner] Inputs gathered:`, Object.keys(inputs));

    // 6. Execute the step
    console.log(`[Runner] Executing step "${stepKey}"...`);
    const result = await step.execute({
      projectId,
      inputs,
      context,
      userInput,
    });

    const durationMs = Date.now() - startTime;
    console.log(`[Runner] Step "${stepKey}" execution completed in ${durationMs}ms`);
    console.log(`[Runner] Result status:`, result.status);

    // 7. Handle result based on status
    if (result.status === "completed") {
      console.log(`[Runner] Step "${stepKey}" completed successfully`);
      console.log(`[Runner] Saving output...`);
      await saveStepOutput(projectId, stepKey, result.output || {}, {
        llmModel: result.metadata?.llmModel,
        tokensUsed: result.metadata?.tokensUsed,
        durationMs,
      });

      // Small delay to ensure DB write has committed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Advance to next step
      const nextKey = getNextStepKey(stepKey);
      if (nextKey) {
        console.log(`[Runner] Next step: "${nextKey}". Creating and running...`);
        await createNextStep(projectId, nextKey);
        await updateProjectStep(projectId, nextKey);
        
        // Automatically run the next step
        console.log(`[Runner] ========== Auto-advancing to: ${nextKey} ==========`);
        return runStep(projectId, nextKey);
      } else {
        console.log(`[Runner] No more steps - workflow complete!`);
        await markProjectCompleted(projectId);
        return {
          success: true,
          status: "completed",
          output: result.output,
          nextStepKey: null,
        };
      }
    }

    if (result.status === "needs_input") {
      console.log(`[Runner] Step "${stepKey}" needs user input`);
      console.log(`[Runner] Input request:`, result.userInputRequest);
      await markStepNeedsInput(projectId, stepKey, result.userInputRequest || {});
      
      // Also save any partial output
      if (result.output) {
        console.log(`[Runner] Saving partial output...`);
        await savePartialOutput(projectId, stepKey, result.output);
      }

      return {
        success: true,
        status: "needs_input",
        output: result.output,
      };
    }

    if (result.status === "failed") {
      console.error(`[Runner] Step "${stepKey}" FAILED:`, result.error);
      await markStepFailed(projectId, stepKey, result.error || "Unknown error");
      
      return {
        success: false,
        status: "failed",
        error: result.error,
      };
    }

    // Shouldn't reach here
    console.error(`[Runner] Unknown result status:`, result.status);
    return {
      success: false,
      status: "failed",
      error: "Unknown result status",
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Runner] EXCEPTION in step "${stepKey}":`, err);
    await markStepFailed(projectId, stepKey, errorMessage);
    
    return {
      success: false,
      status: "failed",
      error: errorMessage,
    };
  }
}

/**
 * Submit user input for a step that's waiting for it.
 * This saves the input and re-runs the step.
 */
export async function submitUserInput(
  projectId: string,
  stepKey: string,
  userInput: Record<string, unknown>
): Promise<RunStepResult> {
  // Save the user input
  await saveUserInput(projectId, stepKey, userInput);

  // Re-run the step with the input
  return runStep(projectId, stepKey, userInput);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create the next step record in the database.
 */
async function createNextStep(projectId: string, stepKey: string): Promise<void> {
  const supabase = await createClient();

  // Get step definition ID from workflow_step_definitions
  const { data: stepDef } = await supabase
    .from("workflow_step_definitions")
    .select("id")
    .eq("step_key", stepKey)
    .single();

  if (!stepDef) {
    console.warn(`Step definition not found for: ${stepKey}`);
    return;
  }

  const stepNumber = getStepNumber(stepKey);

  // Check if step already exists
  const { data: existing } = await supabase
    .from("project_steps")
    .select("id")
    .eq("project_id", projectId)
    .eq("step_key", stepKey)
    .single();

  if (existing) {
    // Step already exists, update it to pending
    await supabase
      .from("project_steps")
      .update({
        status: "pending",
        started_at: null,
        completed_at: null,
        output: null,
        error_message: null,
      })
      .eq("id", existing.id);
  } else {
    // Create new step
    await supabase.from("project_steps").insert({
      project_id: projectId,
      step_definition_id: stepDef.id,
      step_key: stepKey,
      step_number: stepNumber,
      iteration: 1,
      status: "pending",
    });
  }
}

/**
 * Update the project's current step.
 */
async function updateProjectStep(projectId: string, stepKey: string): Promise<void> {
  const supabase = await createClient();
  const stepNumber = getStepNumber(stepKey);

  await supabase
    .from("projects")
    .update({
      current_step_number: stepNumber,
      status: "in_progress",
    })
    .eq("id", projectId);
}

/**
 * Mark the project as completed.
 */
async function markProjectCompleted(projectId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("projects")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}

/**
 * Save partial output (when step needs input but has partial results).
 */
async function savePartialOutput(
  projectId: string,
  stepKey: string,
  output: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("project_steps")
    .update({
      output: { ...output, _partial: true },
    })
    .eq("project_id", projectId)
    .eq("step_key", stepKey);
}

/**
 * Mark a step as running.
 */
export async function markStepRunning(
  projectId: string,
  stepKey: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("project_steps")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("step_key", stepKey);
}


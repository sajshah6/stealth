/**
 * Context Manager
 * 
 * Handles loading and saving project context.
 * The context accumulates outputs from all completed steps.
 */

import { createClient } from "@/lib/supabase/server";
import type { ProjectContext } from "./types";
import { getStepNumber } from "./registry";

// =============================================================================
// LOAD CONTEXT
// =============================================================================

/**
 * Load the full project context from the database.
 * Gathers project info, files, and all step outputs.
 */
export async function loadProjectContext(projectId: string): Promise<ProjectContext> {
  const supabase = await createClient();

  // 1. Load project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, company_name, current_step_number, metadata")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // 2. Load files
  const { data: files, error: filesError } = await supabase
    .from("files")
    .select("id, name, storage_path, storage_bucket")
    .eq("project_id", projectId)
    .eq("category", "source_document");

  if (filesError) {
    throw new Error(`Failed to load files: ${filesError.message}`);
  }

  // 3. Load all step outputs (including needs_input which has partial output)
  const { data: steps, error: stepsError } = await supabase
    .from("project_steps")
    .select("step_key, status, output, user_response")
    .eq("project_id", projectId)
    .in("status", ["completed", "skipped", "needs_input"]);

  if (stepsError) {
    throw new Error(`Failed to load steps: ${stepsError.message}`);
  }

  // 4. Build step outputs map
  const stepOutputs: Record<string, unknown> = {};
  const userInputs: Record<string, unknown> = {};

  for (const step of steps || []) {
    if (step.output) {
      stepOutputs[step.step_key] = step.output;
    }
    if (step.user_response) {
      userInputs[step.step_key] = step.user_response;
    }
  }

  // 5. Get current step from workflow definitions
  const { data: currentStepDef } = await supabase
    .from("workflow_step_definitions")
    .select("step_key")
    .eq("step_order", project.current_step_number)
    .single();

  return {
    project: {
      id: project.id,
      title: project.title,
      companyName: project.company_name || undefined,
    },
    files: (files || []).map((f) => ({
      id: f.id,
      name: f.name,
      storagePath: f.storage_path,
    })),
    stepOutputs,
    currentStep: currentStepDef?.step_key || "unknown",
    userInputs,
  };
}

// =============================================================================
// GATHER INPUTS
// =============================================================================

/**
 * Gather inputs for a step from the project context.
 * 
 * @param context - The full project context
 * @param inputFrom - Array of step keys to gather outputs from
 * @returns Object with outputs from requested steps
 */
export function gatherInputs(
  context: ProjectContext,
  inputFrom: string[]
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  console.log(`[Context] Gathering inputs for steps:`, inputFrom);
  console.log(`[Context] Available step outputs:`, Object.keys(context.stepOutputs));

  for (const stepKey of inputFrom) {
    // Special case: "files" refers to the files array
    if (stepKey === "files") {
      inputs.files = context.files;
      console.log(`[Context] Added files: ${context.files.length} files`);
      continue;
    }

    // Special case: "project" refers to project metadata
    if (stepKey === "project") {
      inputs.project = context.project;
      continue;
    }

    // Look up step output
    const output = context.stepOutputs[stepKey];
    if (output !== undefined) {
      inputs[stepKey] = output;
      console.log(`[Context] Found output for "${stepKey}"`);
    } else {
      console.log(`[Context] WARNING: No output found for "${stepKey}"`);
    }

    // Also include any user input for this step
    const userInput = context.userInputs[stepKey];
    if (userInput !== undefined) {
      inputs[`${stepKey}_user_input`] = userInput;
      console.log(`[Context] Found user input for "${stepKey}"`);
    }
  }

  return inputs;
}

// =============================================================================
// SAVE STEP OUTPUT
// =============================================================================

/**
 * Save a step's output to the database.
 * Uses UPSERT to ensure record exists.
 */
export async function saveStepOutput(
  projectId: string,
  stepKey: string,
  output: Record<string, unknown>,
  metadata?: {
    llmModel?: string;
    tokensUsed?: number;
    durationMs?: number;
  }
): Promise<void> {
  console.log(`[Context] Saving output for step "${stepKey}"...`);
  const supabase = await createClient();

  // Get step definition info for UPSERT
  const { data: stepDef } = await supabase
    .from("workflow_step_definitions")
    .select("id")
    .eq("step_key", stepKey)
    .single();

  if (!stepDef) {
    console.error(`[Context] Step definition not found for: ${stepKey}`);
    return;
  }

  // Get step number from registry
  const stepNumber = getStepNumber(stepKey);

  // UPSERT: Update if exists, insert if doesn't
  const { error } = await supabase
    .from("project_steps")
    .upsert({
      project_id: projectId,
      step_definition_id: stepDef.id,
      step_key: stepKey,
      step_number: stepNumber,
      iteration: 1,
      status: "completed",
      output,
      completed_at: new Date().toISOString(),
      llm_model: metadata?.llmModel,
      tokens_used: metadata?.tokensUsed,
      duration_ms: metadata?.durationMs,
    }, {
      onConflict: "project_id,step_key",
    });

  if (error) {
    console.error(`[Context] Failed to save output for "${stepKey}":`, error);
  } else {
    console.log(`[Context] Output saved for "${stepKey}"`);
  }
}

/**
 * Save user input for a step.
 */
export async function saveUserInput(
  projectId: string,
  stepKey: string,
  userResponse: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("project_steps")
    .update({
      user_response: userResponse,
    })
    .eq("project_id", projectId)
    .eq("step_key", stepKey);
}

/**
 * Mark a step as needing user input.
 * Uses UPSERT to ensure record exists.
 */
export async function markStepNeedsInput(
  projectId: string,
  stepKey: string,
  inputRequest: unknown
): Promise<void> {
  const supabase = await createClient();

  // Get step definition info for UPSERT
  const { data: stepDef } = await supabase
    .from("workflow_step_definitions")
    .select("id")
    .eq("step_key", stepKey)
    .single();

  if (!stepDef) {
    console.error(`[Context] Step definition not found for: ${stepKey}`);
    return;
  }

  // Get step number from registry
  const stepNumber = getStepNumber(stepKey);

  // UPSERT: Update if exists, insert if doesn't
  const { error } = await supabase
    .from("project_steps")
    .upsert({
      project_id: projectId,
      step_definition_id: stepDef.id,
      step_key: stepKey,
      step_number: stepNumber,
      iteration: 1,
      status: "needs_input",
      input_request: inputRequest,
    }, {
      onConflict: "project_id,step_key",
    });

  if (error) {
    console.error(`[Context] Failed to mark step "${stepKey}" as needs_input:`, error);
  }

  // Also update project status
  await supabase
    .from("projects")
    .update({ status: "needs_input" })
    .eq("id", projectId);
}

/**
 * Mark a step as in progress.
 * Uses UPSERT to ensure record exists.
 */
export async function markStepInProgress(
  projectId: string,
  stepKey: string
): Promise<void> {
  const supabase = await createClient();

  // Get step definition info for UPSERT
  const { data: stepDef } = await supabase
    .from("workflow_step_definitions")
    .select("id")
    .eq("step_key", stepKey)
    .single();

  if (!stepDef) {
    console.error(`[Context] Step definition not found for: ${stepKey}`);
    return;
  }

  // Get step number from registry
  const stepNumber = getStepNumber(stepKey);

  // UPSERT: Update if exists, insert if doesn't
  const { error } = await supabase
    .from("project_steps")
    .upsert({
      project_id: projectId,
      step_definition_id: stepDef.id,
      step_key: stepKey,
      step_number: stepNumber,
      iteration: 1,
      status: "in_progress",
      started_at: new Date().toISOString(),
    }, {
      onConflict: "project_id,step_key",
    });

  if (error) {
    console.error(`[Context] Failed to mark step "${stepKey}" as in_progress:`, error);
  }
}

/**
 * Mark a step as skipped.
 * Uses UPSERT to ensure record exists.
 */
export async function markStepSkipped(
  projectId: string,
  stepKey: string,
  reason: string
): Promise<void> {
  const supabase = await createClient();

  // Get step definition info for UPSERT
  const { data: stepDef } = await supabase
    .from("workflow_step_definitions")
    .select("id")
    .eq("step_key", stepKey)
    .single();

  if (!stepDef) {
    console.error(`[Context] Step definition not found for: ${stepKey}`);
    return;
  }

  // Get step number from registry
  const stepNumber = getStepNumber(stepKey);

  // UPSERT: Update if exists, insert if doesn't
  const { error } = await supabase
    .from("project_steps")
    .upsert({
      project_id: projectId,
      step_definition_id: stepDef.id,
      step_key: stepKey,
      step_number: stepNumber,
      iteration: 1,
      status: "skipped",
      output: { skipped: true, reason },
      completed_at: new Date().toISOString(),
    }, {
      onConflict: "project_id,step_key",
    });

  if (error) {
    console.error(`[Context] Failed to mark step "${stepKey}" as skipped:`, error);
  }
}

/**
 * Mark a step as failed.
 */
export async function markStepFailed(
  projectId: string,
  stepKey: string,
  error: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("project_steps")
    .update({
      status: "failed",
      error_message: error,
    })
    .eq("project_id", projectId)
    .eq("step_key", stepKey);

  // Also update project status
  await supabase
    .from("projects")
    .update({ status: "failed" })
    .eq("id", projectId);
}


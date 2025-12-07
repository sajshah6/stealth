"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface CreateProjectInput {
  title: string;
  companyName?: string;
}

interface UploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

/**
 * Creates a new project and returns the project ID
 */
export async function createProject(input: CreateProjectInput): Promise<{
  success: boolean;
  projectId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You must be signed in to create a project" };
  }

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: input.title,
      company_name: input.companyName || null,
      status: "in_progress",
      current_step_number: 1,
    })
    .select()
    .single();

  if (projectError) {
    console.error("Error creating project:", projectError);
    return { success: false, error: "Failed to create project" };
  }

  // Get the first workflow step definition
  const { data: firstStep } = await supabase
    .from("workflow_step_definitions")
    .select("id, step_key")
    .eq("is_active", true)
    .order("step_order")
    .limit(1)
    .single();

  // Create the first project step (document_upload - completed since files are uploaded)
  if (firstStep) {
    await supabase.from("project_steps").insert({
      project_id: project.id,
      step_definition_id: firstStep.id,
      step_key: firstStep.step_key,
      step_number: 1,
      iteration: 1,
      status: "completed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
  }

  return { success: true, projectId: project.id };
}

/**
 * Uploads a file to Supabase Storage and creates a file record
 */
export async function uploadProjectFile(
  projectId: string,
  formData: FormData
): Promise<UploadResult> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You must be signed in" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  // Create storage path: user_id/project_id/filename
  const storagePath = `${user.id}/${projectId}/${Date.now()}_${file.name}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("project-files")
    .upload(storagePath, file);

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { success: false, error: "Failed to upload file" };
  }

  // Determine file type extension
  const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";

  // Create file record in database
  const { data: fileRecord, error: dbError } = await supabase
    .from("files")
    .insert({
      user_id: user.id,
      project_id: projectId,
      name: file.name,
      file_type: fileExtension,
      mime_type: file.type,
      size_bytes: file.size,
      category: "source_document",
      storage_bucket: "project-files",
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError) {
    console.error("Database error:", dbError);
    // Try to clean up the uploaded file
    await supabase.storage.from("project-files").remove([storagePath]);
    return { success: false, error: "Failed to save file record" };
  }

  return { success: true, fileId: fileRecord.id };
}

/**
 * Starts the research workflow for a project
 * This creates the next step and triggers the agent (in the future)
 */
export async function startResearchWorkflow(projectId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You must be signed in" };
  }

  // Verify user owns this project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, user_id, current_step_number")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { success: false, error: "Project not found" };
  }

  if (project.user_id !== user.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Get the second workflow step (initial_analysis)
  const { data: nextStep } = await supabase
    .from("workflow_step_definitions")
    .select("id, step_key")
    .eq("is_active", true)
    .eq("step_order", 2)
    .single();

  if (nextStep) {
    // Create the next project step
    await supabase.from("project_steps").insert({
      project_id: projectId,
      step_definition_id: nextStep.id,
      step_key: nextStep.step_key,
      step_number: 2,
      iteration: 1,
      status: "in_progress",
      started_at: new Date().toISOString(),
    });

    // Update project current step
    await supabase
      .from("projects")
      .update({ current_step_number: 2 })
      .eq("id", projectId);
  }

  // TODO: Trigger the actual agent/LLM workflow here
  // For now, we just create the step and redirect

  return { success: true };
}

/**
 * Combined action: Create project, upload files, start workflow
 */
export async function createProjectAndStartWorkflow(
  title: string,
  companyName: string | undefined,
  files: FormData[]
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  // 1. Create the project
  const projectResult = await createProject({ title, companyName });
  if (!projectResult.success || !projectResult.projectId) {
    return projectResult;
  }

  const projectId = projectResult.projectId;

  // 2. Upload all files
  for (const formData of files) {
    const uploadResult = await uploadProjectFile(projectId, formData);
    if (!uploadResult.success) {
      // Continue anyway - some files might fail but we don't want to block
      console.error("File upload failed:", uploadResult.error);
    }
  }

  // 3. Start the workflow
  const workflowResult = await startResearchWorkflow(projectId);
  if (!workflowResult.success) {
    return { success: false, error: workflowResult.error };
  }

  return { success: true, projectId };
}


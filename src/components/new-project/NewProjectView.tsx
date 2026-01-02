"use client";

import { useState } from "react";
import { ArrowRight, Loader2, LogIn, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUploader } from "./FileUploader";
import { useAuth } from "@/providers";
import { createClient } from "@/lib/supabase/client";
import { executeWorkflowStep } from "@/lib/actions/workflow";
import type { UploadedFile } from "@/lib/types";

/**
 * New Project View
 * Upload files and start a new research workflow
 */
export function NewProjectView() {
  const { user, signInWithGoogle } = useAuth();

  const [projectName, setProjectName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = projectName.trim() !== "" && files.length > 0 && !isSubmitting;

  const handleStartResearch = async () => {
    // Check if user is signed in
    if (!user) {
      signInWithGoogle();
      return;
    }

    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      console.log("[NewProject] Creating project...");

      // 1. Create the project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: projectName.trim(),
          company_name: companyName.trim() || null,
          status: "in_progress",
          current_step_number: 1,
        })
        .select()
        .single();

      if (projectError) {
        console.error("[NewProject] Failed to create project:", projectError);
        throw new Error("Failed to create project");
      }

      console.log("[NewProject] Project created:", project.id);

      // 2. Upload files to Storage and create file records
      const uploadedFileIds: string[] = [];

      for (const uploadFile of files) {
        // Update file status to uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "uploading" as const } : f
          )
        );

        // Create storage path: user_id/project_id/timestamp_filename
        const storagePath = `${user.id}/${project.id}/${Date.now()}_${uploadFile.name}`;
        console.log(`[NewProject] Uploading ${uploadFile.name}...`);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(storagePath, uploadFile.file);

        if (uploadError) {
          console.error("[NewProject] Upload error:", uploadError);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "error" as const, error: "Upload failed" }
                : f
            )
          );
          continue;
        }

        // Create file record in database
        const fileExtension = uploadFile.name.split(".").pop()?.toLowerCase() || "";

        const { data: fileRecord, error: dbError } = await supabase
          .from("files")
          .insert({
            user_id: user.id,
            project_id: project.id,
            name: uploadFile.name,
            file_type: fileExtension,
            mime_type: uploadFile.type,
            size_bytes: uploadFile.size,
            category: "source_document",
            storage_bucket: "project-files",
            storage_path: storagePath,
          })
          .select()
          .single();

        if (dbError) {
          console.error("[NewProject] DB error:", dbError);
          await supabase.storage.from("project-files").remove([storagePath]);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "error" as const, error: "Database error" }
                : f
            )
          );
          continue;
        }

        uploadedFileIds.push(fileRecord.id);
        console.log(`[NewProject] ✓ ${uploadFile.name} uploaded`);
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "success" as const, progress: 100 } : f
          )
        );
      }

      console.log("[NewProject] All files uploaded:", uploadedFileIds.length);

      // 3. Get uploaded file details for output
      const { data: uploadedFiles } = await supabase
        .from("files")
        .select("id, name, size_bytes, file_type")
        .in("id", uploadedFileIds);

      const totalSize = uploadedFiles?.reduce((sum, f) => sum + f.size_bytes, 0) || 0;
      const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      };

      // 4. Create the first project step (document_upload - completed)
      const { data: firstStepDef } = await supabase
        .from("workflow_step_definitions")
        .select("id, step_key")
        .eq("is_active", true)
        .order("step_order")
        .limit(1)
        .single();

      if (firstStepDef) {
        await supabase.from("project_steps").insert({
          project_id: project.id,
          step_definition_id: firstStepDef.id,
          step_key: firstStepDef.step_key,
          step_number: 1,
          iteration: 1,
          status: "completed",
          output: {
            summary: `${uploadedFileIds.length} file${uploadedFileIds.length !== 1 ? 's' : ''} uploaded (${formatFileSize(totalSize)})`,
            files: uploadedFiles || [],
            files_uploaded: uploadedFileIds.length,
            file_ids: uploadedFileIds,
          },
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
      }

      // 4. Create the second step (initial_analysis - in_progress)
      const { data: secondStepDef } = await supabase
        .from("workflow_step_definitions")
        .select("id, step_key")
        .eq("is_active", true)
        .eq("step_order", 2)
        .single();

      if (secondStepDef) {
        await supabase.from("project_steps").insert({
          project_id: project.id,
          step_definition_id: secondStepDef.id,
          step_key: secondStepDef.step_key,
          step_number: 2,
          iteration: 1,
          status: "in_progress",
          started_at: new Date().toISOString(),
        });

        await supabase
          .from("projects")
          .update({ current_step_number: 2 })
          .eq("id", project.id);
      }

      console.log("[NewProject] Steps created. Starting workflow and redirecting...");

      // 5. Start workflow in background (fire-and-forget)
      executeWorkflowStep(project.id, "initial_analysis")
        .then((result) => {
          console.log("[NewProject] Workflow result:", result);
        })
        .catch((err) => {
          console.error("[NewProject] Workflow error:", err);
        });

      // 6. Redirect immediately using window.location (most reliable)
      window.location.href = `/projects/${project.id}`;

    } catch (err) {
      console.error("[NewProject] Error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Start New Research Project
          </h1>
          <p className="text-gray-500">
            Upload company documents to begin the automated analysis workflow
          </p>
        </div>

        {/* Sign In Required Banner */}
        {!user && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Sign in to create projects
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  You need to sign in with Google to create and manage research projects.
                </p>
                <Button
                  onClick={signInWithGoogle}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign in with Google
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Project Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="e.g., Moderna Q3 2024 Analysis"
            className="h-12"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isSubmitting || !user}
          />
        </div>

        {/* Company Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name <span className="text-gray-400">(optional)</span>
          </label>
          <Input
            type="text"
            placeholder="e.g., Moderna Inc."
            className="h-12"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={isSubmitting || !user}
          />
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Documents <span className="text-red-500">*</span>
          </label>
          <FileUploader
            files={files}
            onFilesChange={setFiles}
            disabled={isSubmitting || !user}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Start Button */}
        <Button
          className="w-full h-12 text-base"
          size="lg"
          onClick={handleStartResearch}
          disabled={!user || !canSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Uploading Files...
            </>
          ) : !user ? (
            <>
              <Lock className="w-5 h-5 mr-2" />
              Sign in Required
            </>
          ) : (
            <>
              Start Research Workflow
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
        
        {!user && (
          <p className="text-xs text-gray-500 text-center mt-3">
            Please sign in above to start creating projects
          </p>
        )}

        {/* Workflow Preview */}
        <div className="mt-8 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Workflow Steps
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                1
              </span>
              Document Ingestion & Key Info Extraction
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                2
              </span>
              Open Questions Generation
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                3
              </span>
              Deep Research & Analysis
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                4
              </span>
              White Paper Draft & Expert Review
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                5
              </span>
              Final White Paper & Slide Deck
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

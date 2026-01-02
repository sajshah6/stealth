"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, FileText, Loader2, Building2, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkflowStep, type WorkflowStepData, type StepStatus } from "./WorkflowStep";
import { InputPrompt, type InputPromptData } from "./InputPrompt";
import { AnalysisControl } from "./AnalysisControl";
import { StepOutputModal } from "./StepOutputModal";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { downloadFile } from "@/lib/utils/download";

interface ProjectDetailViewProps {
  projectId: string;
}

interface Project {
  id: string;
  title: string;
  company_name: string | null;
  status: string;
  current_step_number: number;
  created_at: string;
}

interface ProjectStepFromDB {
  id: string;
  step_key: string;
  step_number: number;
  status: string;
  output: Record<string, unknown> | null;
  input_request: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
}

interface WorkflowStepDef {
  step_key: string;
  step_name: string;
  step_order: number;
}

interface FileFromDB {
  id: string;
  name: string;
  size_bytes: number;
  category: string;
  storage_path: string;
  storage_bucket: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string | null): string | undefined {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface CurrentStepInfo {
  key: string;
  status: string;
  output: Record<string, unknown> | null;
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<WorkflowStepData[]>([]);
  const [sourceFiles, setSourceFiles] = useState<FileFromDB[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<FileFromDB[]>([]);
  const [totalSteps, setTotalSteps] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [currentStepInfo, setCurrentStepInfo] = useState<CurrentStepInfo | null>(null);
  const [selectedStep, setSelectedStep] = useState<WorkflowStepData | null>(null);

  const fetchData = useCallback(async () => {
      const supabase = createClient();

      try {
        // 1. Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        // 2. Fetch workflow step definitions (to get names and total count)
        const { data: stepDefs, error: stepDefsError } = await supabase
          .from("workflow_step_definitions")
          .select("step_key, step_name, step_order")
          .eq("is_active", true)
          .order("step_order");

        if (stepDefsError) throw stepDefsError;
        setTotalSteps(stepDefs?.length || 0);

        // Create a map of step_key to step_name
        const stepNameMap: Record<string, string> = {};
        stepDefs?.forEach((def: WorkflowStepDef) => {
          stepNameMap[def.step_key] = def.step_name;
        });

        // 3. Fetch project steps
        const { data: projectSteps, error: stepsError } = await supabase
          .from("project_steps")
          .select("*")
          .eq("project_id", projectId)
          .order("step_number");

        if (stepsError) throw stepsError;

        // 4. Build the steps array
        const stepsData: WorkflowStepData[] = stepDefs?.map((def: WorkflowStepDef) => {
          const projectStep = projectSteps?.find(
            (ps: ProjectStepFromDB) => ps.step_key === def.step_key
          );

          if (projectStep) {
            const output = projectStep.output as Record<string, unknown> | undefined;
            return {
              id: projectStep.id,
              stepKey: projectStep.step_key,
              title: stepNameMap[projectStep.step_key] || projectStep.step_key,
              status: projectStep.status as StepStatus,
              description: output?.summary as string | undefined,
              timestamp: formatTime(projectStep.completed_at || projectStep.started_at),
              agentThoughts: output?.thoughts as string[] | undefined,
              output: output,
            };
          } else {
            return {
              id: def.step_key,
              title: def.step_name,
              status: "pending" as StepStatus,
            };
          }
        }) || [];

        setSteps(stepsData);

        // 5. Fetch files with storage info
        const { data: files, error: filesError } = await supabase
          .from("files")
          .select("id, name, size_bytes, category, storage_path, storage_bucket")
          .eq("project_id", projectId);

        if (filesError) throw filesError;

        const source = files?.filter((f: FileFromDB) => f.category === "source_document") || [];
        const generated = files?.filter((f: FileFromDB) =>
          f.category === "final_whitepaper" || f.category === "slide_deck" || f.category === "draft"
        ) || [];

        setSourceFiles(source);
        setGeneratedFiles(generated);

        // Track current step info for workflow control
        const currentStep = projectSteps?.find(
          (ps: ProjectStepFromDB) => ps.status === "pending" || ps.status === "in_progress" || ps.status === "needs_input"
        );
        if (currentStep) {
          setCurrentStepInfo({
            key: currentStep.step_key,
            status: currentStep.status,
            output: currentStep.output,
          });
        }

      } catch (err) {
        console.error("Error fetching project:", err);
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up real-time subscription for step updates
  useEffect(() => {
    const supabase = createClient();
    
    console.log(`[ProjectDetailView] Setting up real-time subscription for project ${projectId}`);
    
    // Create a channel for this project's steps
    const channel = supabase
      .channel(`project-${projectId}-steps`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'project_steps',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          console.log('[ProjectDetailView] 🔔 Step update received!', {
            eventType: payload.eventType,
            stepKey: newRecord?.step_key || oldRecord?.step_key,
            status: newRecord?.status,
            hasInputRequest: !!newRecord?.input_request,
          });
          
          // Refetch all data when any step changes
          console.log('[ProjectDetailView] Refetching data...');
          fetchData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[ProjectDetailView] ✅ Successfully subscribed to real-time updates`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[ProjectDetailView] ❌ Subscription error');
        } else {
          console.log(`[ProjectDetailView] Subscription status: ${status}`);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log(`[ProjectDetailView] Cleaning up subscription for project ${projectId}`);
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchData]);

  const handleDownload = async (file: FileFromDB) => {
    if (downloadingId) return;
    
    setDownloadingId(file.id);
    try {
      await downloadFile(
        file.storage_path,
        file.name,
        file.storage_bucket || "project-files"
      );
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Project not found"}</p>
          <Link href="/projects">
            <Button variant="outline">Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const needsInput = steps.some((s) => s.status === "needs_input");
  const isCompleted = project.status === "completed";
  const currentStepName = steps.find((s) => s.status === "in_progress" || s.status === "pending")?.title || "Complete";

  // Check if any step needs input
  const inputStep = steps.find((s) => s.status === "needs_input");
  const inputPrompt: InputPromptData | null = inputStep?.inputRequest
    ? {
        question: (inputStep.inputRequest as { question?: string }).question || "",
        type: ((inputStep.inputRequest as { type?: string }).type as "single_select" | "multi_select" | "text") || "single_select",
        options: (inputStep.inputRequest as { options?: { id: string; label: string; description?: string }[] }).options,
      }
    : null;

  // Find initial_analysis and archetype_selection steps for AnalysisControl visibility
  const initialAnalysisStep = steps.find((s) => s.stepKey === "initial_analysis");
  const archetypeSelectionStep = steps.find((s) => s.stepKey === "archetype_selection");
  
  // Show AnalysisControl if:
  // 1. initial_analysis has completed or is in progress/needs_input
  // 2. AND archetype_selection hasn't completed yet (hide once user selects)
  const shouldShowAnalysisControl = 
    initialAnalysisStep &&
    (initialAnalysisStep.status === "completed" || initialAnalysisStep.status === "needs_input" || initialAnalysisStep.status === "in_progress") &&
    (!archetypeSelectionStep || archetypeSelectionStep.status !== "completed");

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        
        {/* Project Header Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-semibold text-gray-900 truncate">
                  {project.title}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  {project.company_name && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      {project.company_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDate(project.created_at)}
                  </span>
                </div>
              </div>
              {isCompleted && generatedFiles.length > 0 && (
                <Button onClick={() => generatedFiles[0] && handleDownload(generatedFiles[0])}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>

            {/* Progress Section */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {isCompleted ? "Completed" : currentStepName}
                  </span>
                  <span className="text-sm text-gray-400 ml-2">
                    Step {completedSteps + (isCompleted ? 0 : 1)} of {totalSteps}
                  </span>
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  isCompleted ? "text-green-600" : needsInput ? "text-amber-600" : "text-blue-600"
                )}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isCompleted ? "bg-green-500" : needsInput ? "bg-amber-500" : "bg-blue-500"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Workflow Timeline */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Analysis Control (show until archetype selection is complete) */}
            {shouldShowAnalysisControl && initialAnalysisStep && (
              <AnalysisControl
                projectId={projectId}
                currentStepKey={initialAnalysisStep.stepKey || "initial_analysis"}
                currentStepStatus={initialAnalysisStep.status}
                existingOutput={initialAnalysisStep.output as unknown as Parameters<typeof AnalysisControl>[0]["existingOutput"]}
                onStepComplete={() => fetchData()}
              />
            )}
            
            {/* Input Prompt (if needed, for non-analysis steps) */}
            {needsInput && inputPrompt && !shouldShowAnalysisControl && (
              <InputPrompt prompt={inputPrompt} />
            )}

            {/* Steps Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Workflow Progress</h2>
              </div>
              <div className="p-6">
                {steps.length > 0 ? (
                  <div className="space-y-0">
                    {steps.map((step, index) => (
                      <WorkflowStep
                        key={step.id}
                        step={step}
                        stepNumber={index + 1}
                        isLast={index === steps.length - 1}
                        onViewOutput={setSelectedStep}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No workflow steps yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            
            {/* Source Files Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">
                  Source Files
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({sourceFiles.length})
                  </span>
                </h3>
              </div>
              <div className="p-4">
                {sourceFiles.length > 0 ? (
                  <div className="space-y-2">
                    {sourceFiles.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => handleDownload(file)}
                        disabled={downloadingId === file.id}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          {downloadingId === file.id ? (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate group-hover:text-blue-600 transition-colors">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(file.size_bytes)}
                          </p>
                        </div>
                        <Download className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No files uploaded
                  </p>
                )}
              </div>
            </div>

            {/* Generated Files Card */}
            {(generatedFiles.length > 0 || isCompleted) && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Generated Files</h3>
                </div>
                <div className="p-4">
                  {generatedFiles.length > 0 ? (
                    <div className="space-y-2">
                      {generatedFiles.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleDownload(file)}
                          disabled={downloadingId === file.id}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                            {downloadingId === file.id ? (
                              <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate group-hover:text-green-600 transition-colors">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatFileSize(file.size_bytes)}
                            </p>
                          </div>
                          <Download className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Files will appear here when ready
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step Output Modal */}
        {selectedStep && selectedStep.output && (
          <StepOutputModal
            isOpen={!!selectedStep}
            onClose={() => setSelectedStep(null)}
            stepTitle={selectedStep.title}
            stepKey={selectedStep.stepKey || selectedStep.id}
            output={selectedStep.output}
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
}

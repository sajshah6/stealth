"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitStepUserInput } from "@/lib/actions/workflow";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ArchetypeOption {
  id: string;
  title: string;
  primary: string;
  secondary: string[];
  focusDescription: string;
}

interface ConflictingNarrative {
  label: string;
  title: string;
  description: string;
}

interface AnalysisOutput {
  clarificationNeeded: boolean;
  analysisSummary: string;
  companyName: string;
  assetType: string;
  determinedArchetype?: {
    primary: string;
    secondary: string[];
    reasoning: string;
  };
  archetypeOptions?: ArchetypeOption[];
  conflictingNarratives?: ConflictingNarrative[];
  keyRisks: string[];
  openQuestions: string[];
  threadId: string;
  assistantId: string;
}

interface AnalysisControlProps {
  projectId: string;
  currentStepKey: string;
  currentStepStatus: string;
  existingOutput?: AnalysisOutput;
  onStepComplete?: () => void;
}

export function AnalysisControl({
  projectId,
  currentStepKey,
  currentStepStatus,
  existingOutput,
  onStepComplete,
}: AnalysisControlProps) {
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<AnalysisOutput | undefined>(existingOutput);
  const [stepStatus, setStepStatus] = useState(currentStepStatus);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  // Poll for updates when step is in_progress
  useEffect(() => {
    console.log("[AnalysisControl] useEffect triggered", { stepStatus, hasOutput: !!output });
    
    if (stepStatus !== "in_progress" && stepStatus !== "pending") {
      console.log("[AnalysisControl] Not polling - status is:", stepStatus);
      return;
    }
    if (output) {
      console.log("[AnalysisControl] Not polling - already have output");
      return;
    }

    const supabase = createClient();
    let isCancelled = false;

    const pollForUpdates = async () => {
      console.log("[AnalysisControl] Starting polling for project:", projectId);
      
      while (!isCancelled) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2s

        const { data: step, error } = await supabase
          .from("project_steps")
          .select("status, output")
          .eq("project_id", projectId)
          .eq("step_key", "initial_analysis")
          .single();

        if (isCancelled) break;

        if (error) {
          console.error("[AnalysisControl] Poll error:", error);
          continue;
        }

        if (step) {
          console.log("[AnalysisControl] Poll result:", { status: step.status, hasOutput: !!step.output });
          setStepStatus(step.status);

          if (step.status === "completed" || step.status === "needs_input") {
            console.log("[AnalysisControl] Step finished with status:", step.status);
            if (step.output) {
              console.log("[AnalysisControl] Setting output:", step.output);
              setOutput(step.output as unknown as AnalysisOutput);
            }
            if (step.status === "completed") {
              console.log("[AnalysisControl] Calling onStepComplete");
              onStepComplete?.();
            }
            break;
          }

          if (step.status === "failed") {
            console.error("[AnalysisControl] Step failed");
            setError("Analysis failed. Please try again.");
            break;
          }
        }
      }
      
      console.log("[AnalysisControl] Polling stopped");
    };

    pollForUpdates();

    return () => {
      console.log("[AnalysisControl] Cleanup - cancelling poll");
      isCancelled = true;
    };
  }, [projectId, stepStatus, output, onStepComplete]);

  // Only show this control for initial_analysis step
  if (currentStepKey !== "initial_analysis") {
    return null;
  }

  const handleSelectOption = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleSubmitSelection = async () => {
    if (selectedOptions.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitStepUserInput(projectId, "initial_analysis", {
        selectedOptionIds: selectedOptions,
      });

      if (!result.success) {
        setError(result.error || "Submission failed");
        return;
      }

      onStepComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state when step is in_progress or pending (analysis is running)
  if ((stepStatus === "in_progress" || stepStatus === "pending") && !output) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="text-center">
          <Loader2 className="w-14 h-14 text-blue-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Analyzing Documents...
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            This may take 1-2 minutes. The AI is reading your documents,
            extracting key information, and evaluating the investment opportunity.
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !output) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Analysis Failed
          </h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <p className="text-xs text-gray-500">
            Please go back and try creating a new project.
          </p>
        </div>
      </div>
    );
  }

  // Show analysis output
  if (output) {
    const needsSelection =
      output.clarificationNeeded &&
      output.archetypeOptions &&
      output.archetypeOptions.length > 1 &&
      stepStatus === "needs_input";

    return (
      <div className="space-y-4">
        {/* Analysis Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Analysis Complete</h2>
            {!needsSelection && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Ready
              </span>
            )}
          </div>

          <div className="p-6">
            {/* Company & Asset Type */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-900">
                {output.companyName}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {output.assetType}
              </span>
            </div>

            {/* Analysis Summary */}
            <div className="mb-4">
              <button
                onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {showFullAnalysis ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {showFullAnalysis ? "Hide" : "Show"} Analysis Summary
              </button>
              {showFullAnalysis && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {output.analysisSummary}
                  </p>
                </div>
              )}
            </div>

            {/* Auto-selected Archetype */}
            {!output.clarificationNeeded && output.determinedArchetype && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm font-medium text-green-800 mb-1">
                  Archetype Determined
                </p>
                <p className="text-sm text-green-700">
                  <strong>Primary:</strong> {output.determinedArchetype.primary}
                  {output.determinedArchetype.secondary.length > 0 && (
                    <>
                      {" • "}
                      <strong>Secondary:</strong>{" "}
                      {output.determinedArchetype.secondary.join(", ")}
                    </>
                  )}
                </p>
                <p className="text-xs text-green-600 mt-2">
                  {output.determinedArchetype.reasoning}
                </p>
              </div>
            )}

            {/* Key Risks */}
            {output.keyRisks && output.keyRisks.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Key Risks</p>
                <ul className="space-y-1">
                  {output.keyRisks.slice(0, 3).map((risk, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Archetype Selection (if needed) */}
        {needsSelection && output.archetypeOptions && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-100 bg-amber-50">
              <h2 className="font-semibold text-amber-900">
                Select Portfolio Role
              </h2>
              <p className="text-sm text-amber-700 mt-1">
                {output.conflictingNarratives
                  ? "The analysis identified conflicting narratives. Please select how you want to frame this investment."
                  : "Please select one or more archetypes that best describe your investment thesis."}
              </p>
            </div>

            {/* Conflicting Narratives */}
            {output.conflictingNarratives && output.conflictingNarratives.length > 0 && (
              <div className="p-6 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Conflicting Narratives Identified
                </p>
                <div className="space-y-3">
                  {output.conflictingNarratives.map((narrative, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          {narrative.label}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {narrative.title}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{narrative.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="p-6">
              <div className="space-y-3">
                {output.archetypeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border-2 transition-all",
                      selectedOptions.includes(option.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{option.title}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          <span className="font-medium">Primary:</span> {option.primary}
                          {option.secondary.length > 0 && (
                            <>
                              {" • "}
                              <span className="font-medium">Secondary:</span>{" "}
                              {option.secondary.join(", ")}
                            </>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {option.focusDescription}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ml-4 mt-1",
                          selectedOptions.includes(option.id)
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300"
                        )}
                      >
                        {selectedOptions.includes(option.id) && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <p className="mt-4 text-sm text-red-600">{error}</p>
              )}

              {/* Submit */}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSubmitSelection}
                  disabled={selectedOptions.length === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating IC Memo...
                    </>
                  ) : (
                    `Continue with ${selectedOptions.length} selected`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}


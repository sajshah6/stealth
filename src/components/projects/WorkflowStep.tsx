"use client";

import { Check, Loader2, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "completed" | "in_progress" | "needs_input" | "pending" | "failed" | "skipped";

export interface WorkflowStepData {
  id: string;
  stepKey?: string;
  title: string;
  status: StepStatus;
  description?: string;
  agentThoughts?: string[];
  timestamp?: string;
  inputRequest?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

interface WorkflowStepProps {
  step: WorkflowStepData;
  stepNumber: number;
  isLast: boolean;
  onViewOutput?: (step: WorkflowStepData) => void;
}

const statusIcons: Record<StepStatus, typeof Check> = {
  completed: Check,
  in_progress: Loader2,
  needs_input: AlertCircle,
  pending: Clock,
  failed: AlertCircle,
  skipped: Clock,
};

const statusStyles: Record<StepStatus, { bg: string; icon: string; line: string; text: string }> = {
  completed: {
    bg: "bg-green-500",
    icon: "text-white",
    line: "bg-green-200",
    text: "text-gray-900",
  },
  in_progress: {
    bg: "bg-blue-500",
    icon: "text-white",
    line: "bg-gray-200",
    text: "text-gray-900",
  },
  needs_input: {
    bg: "bg-amber-500",
    icon: "text-white",
    line: "bg-gray-200",
    text: "text-gray-900",
  },
  pending: {
    bg: "bg-gray-200",
    icon: "text-gray-400",
    line: "bg-gray-200",
    text: "text-gray-400",
  },
  failed: {
    bg: "bg-red-500",
    icon: "text-white",
    line: "bg-gray-200",
    text: "text-gray-900",
  },
  skipped: {
    bg: "bg-gray-300",
    icon: "text-gray-500",
    line: "bg-gray-200",
    text: "text-gray-400",
  },
};

export function WorkflowStep({ step, stepNumber, isLast, onViewOutput }: WorkflowStepProps) {
  const Icon = statusIcons[step.status];
  const styles = statusStyles[step.status];
  const isActive = step.status === "completed" || step.status === "in_progress" || step.status === "needs_input";
  const hasOutput = step.status === "completed" && step.output;

  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all",
            styles.bg
          )}
        >
          <Icon
            className={cn(
              "w-3.5 h-3.5",
              styles.icon,
              step.status === "in_progress" && "animate-spin"
            )}
          />
        </div>
        {!isLast && (
          <div className={cn("w-0.5 flex-1 min-h-[24px]", styles.line)} />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-5", isLast && "pb-0")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className={cn("text-sm font-medium", styles.text)}>
              {step.title}
            </h3>
            {step.status === "needs_input" && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                Action Required
              </span>
            )}
            {step.status === "in_progress" && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                In Progress
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step.timestamp && (
              <span className="text-xs text-gray-400">{step.timestamp}</span>
            )}
            {hasOutput && onViewOutput && (
              <button
                onClick={() => onViewOutput(step)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
              >
                View Output
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {step.description && isActive && (
          <p className="text-sm text-gray-500 mt-1">{step.description}</p>
        )}

        {/* Agent Thoughts */}
        {step.agentThoughts && step.agentThoughts.length > 0 && isActive && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Agent Output
            </p>
            <div className="space-y-1">
              {step.agentThoughts.map((thought, i) => (
                <p key={i} className="text-sm text-gray-600">
                  {thought}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

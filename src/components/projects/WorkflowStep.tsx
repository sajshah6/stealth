"use client";

import { Check, Loader2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "completed" | "in_progress" | "needs_input" | "pending";

export interface WorkflowStepData {
  id: string;
  title: string;
  status: StepStatus;
  description?: string;
  agentThoughts?: string[];
  timestamp?: string;
}

interface WorkflowStepProps {
  step: WorkflowStepData;
  stepNumber: number;
  isLast: boolean;
}

const statusIcons: Record<StepStatus, typeof Check> = {
  completed: Check,
  in_progress: Loader2,
  needs_input: AlertCircle,
  pending: Clock,
};

const statusStyles: Record<StepStatus, { bg: string; icon: string; line: string }> = {
  completed: {
    bg: "bg-green-500",
    icon: "text-white",
    line: "bg-green-500",
  },
  in_progress: {
    bg: "bg-blue-500",
    icon: "text-white",
    line: "bg-gray-200",
  },
  needs_input: {
    bg: "bg-amber-500",
    icon: "text-white",
    line: "bg-gray-200",
  },
  pending: {
    bg: "bg-gray-200",
    icon: "text-gray-400",
    line: "bg-gray-200",
  },
};

export function WorkflowStep({ step, stepNumber, isLast }: WorkflowStepProps) {
  const Icon = statusIcons[step.status];
  const styles = statusStyles[step.status];

  return (
    <div className="flex gap-4">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            styles.bg
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              styles.icon,
              step.status === "in_progress" && "animate-spin"
            )}
          />
        </div>
        {!isLast && (
          <div className={cn("w-0.5 flex-1 my-2", styles.line)} />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-8", isLast && "pb-0")}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Step {stepNumber}</span>
              {step.status === "needs_input" && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Action Required
                </span>
              )}
            </div>
            <h3
              className={cn(
                "font-medium mt-0.5",
                step.status === "pending" ? "text-gray-400" : "text-gray-900"
              )}
            >
              {step.title}
            </h3>
          </div>
          {step.timestamp && (
            <span className="text-xs text-gray-400">{step.timestamp}</span>
          )}
        </div>

        {/* Description */}
        {step.description && (
          <p className="text-sm text-gray-600 mt-2">{step.description}</p>
        )}

        {/* Agent Thoughts */}
        {step.agentThoughts && step.agentThoughts.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Agent Thoughts</p>
            <div className="space-y-1">
              {step.agentThoughts.map((thought, i) => (
                <p key={i} className="text-sm text-gray-700">
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


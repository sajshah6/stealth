"use client";

import Link from "next/link";
import { Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectStatus = "in_progress" | "completed" | "needs_input";

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  updatedAt: string;
}

interface ProjectCardProps {
  project: Project;
}

const statusConfig: Record<
  ProjectStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  in_progress: {
    label: "In Progress",
    icon: Clock,
    className: "bg-blue-100 text-blue-700",
  },
  needs_input: {
    label: "Needs Input",
    icon: AlertCircle,
    className: "bg-amber-100 text-amber-700",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700",
  },
};

export function ProjectCard({ project }: ProjectCardProps) {
  const status = statusConfig[project.status];
  const StatusIcon = status.icon;
  const progress = (project.completedSteps / project.totalSteps) * 100;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-gray-900 group-hover:text-gray-700">
          {project.title}
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            status.className
          )}
        >
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-3">{project.currentStep}</p>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>
            Step {project.completedSteps} of {project.totalSteps}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              project.status === "completed"
                ? "bg-green-500"
                : project.status === "needs_input"
                ? "bg-amber-500"
                : "bg-blue-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{project.updatedAt}</span>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </Link>
  );
}


"use client";

import { ProjectCard, type Project } from "./ProjectCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

/** TODO: Replace with actual project data from database */
const mockProjects: Project[] = [
  {
    id: "1",
    title: "Biotech Company XYZ Analysis",
    status: "in_progress",
    currentStep: "Deep Research & Analysis",
    totalSteps: 8,
    completedSteps: 4,
    updatedAt: "2 minutes ago",
  },
  {
    id: "2",
    title: "Pharma Holdings Due Diligence",
    status: "needs_input",
    currentStep: "Awaiting valuation methodology selection",
    totalSteps: 8,
    completedSteps: 3,
    updatedAt: "15 minutes ago",
  },
  {
    id: "3",
    title: "Gene Therapy Startup Review",
    status: "completed",
    currentStep: "White paper ready for download",
    totalSteps: 8,
    completedSteps: 8,
    updatedAt: "2 hours ago",
  },
  {
    id: "4",
    title: "Medical Devices Corp Analysis",
    status: "completed",
    currentStep: "White paper ready for download",
    totalSteps: 8,
    completedSteps: 8,
    updatedAt: "Yesterday",
  },
  {
    id: "5",
    title: "Healthcare REIT Deep Dive",
    status: "completed",
    currentStep: "White paper ready for download",
    totalSteps: 8,
    completedSteps: 8,
    updatedAt: "3 days ago",
  },
];

/**
 * Projects List View
 * Shows all projects with their status and progress
 */
export function ProjectsListView() {
  const inProgressProjects = mockProjects.filter(
    (p) => p.status === "in_progress" || p.status === "needs_input"
  );
  const completedProjects = mockProjects.filter(
    (p) => p.status === "completed"
  );

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <Link href="/">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        {/* In Progress Section */}
        {inProgressProjects.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              In Progress ({inProgressProjects.length})
            </h2>
            <div className="grid gap-4">
              {inProgressProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        )}

        {/* Completed Section */}
        {completedProjects.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Completed ({completedProjects.length})
            </h2>
            <div className="grid gap-4">
              {completedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {mockProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No projects yet</p>
            <Link href="/">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Start Your First Project
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}


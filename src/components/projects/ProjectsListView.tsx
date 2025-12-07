"use client";

import { useEffect, useState } from "react";
import { ProjectCard, type Project, type ProjectStatus } from "./ProjectCard";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ProjectFromDB {
  id: string;
  title: string;
  company_name: string | null;
  status: string;
  current_step_number: number;
  updated_at: string;
}

interface StepCount {
  project_id: string;
  completed_count: number;
}

/**
 * Projects List View
 * Shows all projects with their status and progress
 */
export function ProjectsListView() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalSteps, setTotalSteps] = useState(0);

  useEffect(() => {
    async function fetchProjects() {
      const supabase = createClient();

      try {
        // Get total workflow steps count
        const { data: stepDefs } = await supabase
          .from("workflow_step_definitions")
          .select("id")
          .eq("is_active", true);

        const totalStepsCount = stepDefs?.length || 10;
        setTotalSteps(totalStepsCount);

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("*")
          .order("updated_at", { ascending: false });

        if (projectsError) throw projectsError;

        // Fetch completed steps count for each project
        const projectIds = projectsData?.map((p: ProjectFromDB) => p.id) || [];
        
        let stepCounts: StepCount[] = [];
        if (projectIds.length > 0) {
          const { data: stepsData } = await supabase
            .from("project_steps")
            .select("project_id")
            .in("project_id", projectIds)
            .eq("status", "completed");

          // Count completed steps per project
          const countMap: Record<string, number> = {};
          stepsData?.forEach((step: { project_id: string }) => {
            countMap[step.project_id] = (countMap[step.project_id] || 0) + 1;
          });

          stepCounts = Object.entries(countMap).map(([project_id, count]) => ({
            project_id,
            completed_count: count,
          }));
        }

        // Get step names for current step
        const { data: stepNames } = await supabase
          .from("workflow_step_definitions")
          .select("step_order, step_name")
          .eq("is_active", true);

        const stepNameMap: Record<number, string> = {};
        stepNames?.forEach((s: { step_order: number; step_name: string }) => {
          stepNameMap[s.step_order] = s.step_name;
        });

        // Transform to Project type
        const transformedProjects: Project[] = (projectsData || []).map((p: ProjectFromDB) => {
          const completedCount = stepCounts.find((sc) => sc.project_id === p.id)?.completed_count || 0;
          const currentStepName = stepNameMap[p.current_step_number] || "Processing...";

          // Determine status based on project status
          let status: ProjectStatus = "in_progress";
          if (p.status === "completed") status = "completed";
          else if (p.status === "needs_input") status = "needs_input";

          return {
            id: p.id,
            title: p.title,
            status,
            currentStep: p.status === "completed" 
              ? "White paper ready for download" 
              : p.status === "needs_input"
              ? "Awaiting your input"
              : currentStepName,
            totalSteps: totalStepsCount,
            completedSteps: completedCount,
            updatedAt: formatRelativeTime(p.updated_at),
          };
        });

        setProjects(transformedProjects);
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const inProgressProjects = projects.filter(
    (p) => p.status === "in_progress" || p.status === "needs_input"
  );
  const completedProjects = projects.filter((p) => p.status === "completed");

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

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
        {projects.length === 0 && (
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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

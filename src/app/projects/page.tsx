import { AppShell } from "@/components/layout";
import { ProjectsListView } from "@/components/projects";

/**
 * Projects page
 * List of all projects with status and progress
 */
export default function ProjectsPage() {
  return (
    <AppShell>
      <ProjectsListView />
    </AppShell>
  );
}


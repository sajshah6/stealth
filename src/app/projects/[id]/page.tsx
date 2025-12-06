import { AppShell } from "@/components/layout";
import { ProjectDetailView } from "@/components/projects";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Project Detail page
 * View workflow progress, agent thoughts, and provide input when needed
 */
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  return (
    <AppShell>
      <ProjectDetailView projectId={id} />
    </AppShell>
  );
}


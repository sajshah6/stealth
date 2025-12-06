import { AppShell } from "@/components/layout";
import { NewProjectView } from "@/components/new-project";

/**
 * Home page - New Project
 * Upload files to start a new research workflow
 */
export default function HomePage() {
  return (
    <AppShell>
      <NewProjectView />
    </AppShell>
  );
}

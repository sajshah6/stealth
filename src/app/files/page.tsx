import { AppShell } from "@/components/layout";
import { FilesView } from "@/components/files";

/**
 * Files page
 * View all uploaded documents and generated files
 */
export default function FilesPage() {
  return (
    <AppShell>
      <FilesView />
    </AppShell>
  );
}

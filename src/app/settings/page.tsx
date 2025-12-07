import { AppShell } from "@/components/layout";
import { SettingsView } from "@/components/settings";

/**
 * Settings page
 * User profile and account settings
 */
export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsView />
    </AppShell>
  );
}


"use client";

import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Main application shell that wraps all pages.
 * Provides consistent sidebar layout.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

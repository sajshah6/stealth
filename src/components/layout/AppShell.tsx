"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
  /** Optional: Hide the header for certain views */
  showHeader?: boolean;
}

/**
 * Main application shell that wraps all pages.
 * Provides consistent sidebar + header layout.
 */
export function AppShell({ children, showHeader = true }: AppShellProps) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {showHeader && <Header />}
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}


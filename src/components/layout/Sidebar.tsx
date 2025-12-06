"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, FolderKanban, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/** Main navigation tabs */
const navItems = [
  { icon: Plus, label: "New Project", href: "/" },
  { icon: FolderKanban, label: "Projects", href: "/projects" },
  { icon: FileText, label: "Files", href: "/files" },
];

/** 
 * Project status types for styling
 * TODO: Move to shared types file when connecting to backend
 */
type ProjectStatus = "in_progress" | "completed" | "needs_input";

interface RecentProject {
  id: string;
  title: string;
  status: ProjectStatus;
  href: string;
}

/** TODO: Replace with actual project data from database */
const recentProjects: RecentProject[] = [
  { id: "1", title: "Biotech Company XYZ", status: "in_progress", href: "/projects/1" },
  { id: "2", title: "Pharma Holdings Analysis", status: "needs_input", href: "/projects/2" },
  { id: "3", title: "Gene Therapy Startup", status: "completed", href: "/projects/3" },
  { id: "4", title: "Medical Devices Corp", status: "completed", href: "/projects/4" },
  { id: "5", title: "Healthcare REIT Review", status: "completed", href: "/projects/5" },
];

/** Status indicator styles */
const statusStyles: Record<ProjectStatus, string> = {
  in_progress: "bg-blue-500",
  needs_input: "bg-amber-500",
  completed: "bg-green-500",
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-gray-200 flex flex-col bg-white shrink-0">
      {/* Logo - Links to home */}
      <div className="p-3 flex items-center justify-between">
        <Link
          href="/"
          className="w-8 h-8 flex items-center justify-center hover:opacity-80 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
          </svg>
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <div className="w-4 h-4 border border-current rounded" />
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="my-4" />

      {/* Recent Projects */}
      <div className="px-4 mb-2">
        <span className="text-xs text-gray-500">Your Projects</span>
      </div>
      <ScrollArea className="flex-1 px-2">
        {recentProjects.map((project) => {
          const isActive = pathname === project.href;
          return (
            <Link
              key={project.id}
              href={project.href}
              className={cn(
                "flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  statusStyles[project.status]
                )}
              />
              <span className="truncate">{project.title}</span>
            </Link>
          );
        })}
      </ScrollArea>

      {/* User Profile */}
      <div className="p-3 border-t border-gray-200">
        <button className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-teal-600 text-white text-xs">
              SA
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <div className="text-sm font-medium">Sajan Shah</div>
            <div className="text-xs text-gray-500">Pro</div>
          </div>
        </button>
      </div>
    </aside>
  );
}

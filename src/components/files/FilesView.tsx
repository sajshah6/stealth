"use client";

import { useEffect, useState } from "react";
import { FileText, Upload, Download, MoreVertical, ExternalLink, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/utils/download";

type FileCategory = "source_document" | "draft" | "final_whitepaper" | "slide_deck" | "research_output" | "other";
type FilterType = "all" | "uploaded" | "generated";

interface FileFromDB {
  id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  category: FileCategory;
  storage_path: string;
  storage_bucket: string;
  created_at: string;
  project_id: string;
  projects: {
    id: string;
    title: string;
  } | null;
}

interface FileItem {
  id: string;
  name: string;
  fileType: string;
  type: "uploaded" | "generated";
  size: string;
  date: string;
  projectId: string | null;
  projectName: string | null;
  storagePath: string;
  storageBucket: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isGeneratedFile(category: FileCategory): boolean {
  return category === "draft" || category === "final_whitepaper" || category === "slide_deck" || category === "research_output";
}

export function FilesView() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFiles() {
      const supabase = createClient();

      try {
        const { data, error } = await supabase
          .from("files")
          .select(`
            id,
            name,
            file_type,
            size_bytes,
            category,
            storage_path,
            storage_bucket,
            created_at,
            project_id,
            projects (
              id,
              title
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const transformedFiles: FileItem[] = (data || []).map((file: FileFromDB) => ({
          id: file.id,
          name: file.name,
          fileType: file.file_type,
          type: isGeneratedFile(file.category) ? "generated" : "uploaded",
          size: formatFileSize(file.size_bytes),
          date: formatRelativeTime(file.created_at),
          projectId: file.projects?.id || null,
          projectName: file.projects?.title || null,
          storagePath: file.storage_path,
          storageBucket: file.storage_bucket || "project-files",
        }));

        setFiles(transformedFiles);
      } catch (err) {
        console.error("Error fetching files:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, []);

  const handleDownload = async (file: FileItem) => {
    if (downloadingId) return;
    
    setDownloadingId(file.id);
    try {
      await downloadFile(file.storagePath, file.name, file.storageBucket);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "uploaded" && file.type === "uploaded") ||
      (filter === "generated" && file.type === "generated");

    const matchesSearch =
      searchQuery === "" ||
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.projectName?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const uploadedCount = files.filter((f) => f.type === "uploaded").length;
  const generatedCount = files.filter((f) => f.type === "generated").length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto bg-gray-50/50">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Files</h1>
            <p className="text-sm text-gray-500 mt-1">
              {files.length} total files across all projects
            </p>
          </div>
          <Link href="/">
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search files..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setFilter("all")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  filter === "all"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                All ({files.length})
              </button>
              <button
                onClick={() => setFilter("uploaded")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  filter === "uploaded"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Uploaded ({uploadedCount})
              </button>
              <button
                onClick={() => setFilter("generated")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  filter === "generated"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Generated ({generatedCount})
              </button>
            </div>
          </div>
        </div>

        {filteredFiles.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Project
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Size
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">
                    Added
                  </th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center",
                          file.type === "uploaded" ? "bg-blue-50" : "bg-green-50"
                        )}>
                          <FileText className={cn(
                            "w-4 h-4",
                            file.type === "uploaded" ? "text-blue-500" : "text-green-500"
                          )} />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900 block">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-400 uppercase">
                            {file.fileType}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {file.projectId && file.projectName ? (
                        <Link
                          href={`/projects/${file.projectId}`}
                          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <span className="truncate max-w-[180px]">{file.projectName}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
                          file.type === "uploaded"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-green-50 text-green-700"
                        )}
                      >
                        {file.type === "uploaded" ? "Uploaded" : "Generated"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {file.size}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {file.date}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-gray-600"
                          onClick={() => handleDownload(file)}
                          disabled={downloadingId === file.id}
                        >
                          {downloadingId === file.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No files found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery
                ? "Try adjusting your search query"
                : "Start a new project to upload files"}
            </p>
            {!searchQuery && (
              <Link href="/">
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

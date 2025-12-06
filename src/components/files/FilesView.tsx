"use client";

import { FileText, Upload, Download, MoreVertical, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type FileType = "uploaded" | "generated";

interface FileItem {
  id: string;
  name: string;
  type: FileType;
  size: string;
  date: string;
  projectId?: string;
  projectName?: string;
}

/** TODO: Replace with actual file data from database */
const mockFiles: FileItem[] = [
  {
    id: "1",
    name: "Company_XYZ_Prospectus.pdf",
    type: "uploaded",
    size: "2.4 MB",
    date: "2 hours ago",
    projectId: "1",
    projectName: "Biotech Company XYZ Analysis",
  },
  {
    id: "2",
    name: "White_Paper_XYZ.pdf",
    type: "generated",
    size: "156 KB",
    date: "2 hours ago",
    projectId: "3",
    projectName: "Gene Therapy Startup Review",
  },
  {
    id: "3",
    name: "Clinical_Trial_Data.xlsx",
    type: "uploaded",
    size: "1.1 MB",
    date: "Yesterday",
    projectId: "1",
    projectName: "Biotech Company XYZ Analysis",
  },
  {
    id: "4",
    name: "White_Paper_Gene_Therapy.pdf",
    type: "generated",
    size: "245 KB",
    date: "2 days ago",
    projectId: "3",
    projectName: "Gene Therapy Startup Review",
  },
  {
    id: "5",
    name: "Financial_Statements_Q3.pdf",
    type: "uploaded",
    size: "890 KB",
    date: "3 days ago",
    projectId: "4",
    projectName: "Medical Devices Corp Analysis",
  },
  {
    id: "6",
    name: "Slide_Deck_Medical_Devices.pptx",
    type: "generated",
    size: "1.8 MB",
    date: "1 week ago",
    projectId: "4",
    projectName: "Medical Devices Corp Analysis",
  },
];

/**
 * Files View component
 * Shows all uploaded and generated files across all projects
 */
export function FilesView() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Files</h1>
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search files..."
            className="max-w-md"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button variant="secondary" size="sm">
            All Files
          </Button>
          <Button variant="ghost" size="sm">
            Uploaded
          </Button>
          <Button variant="ghost" size="sm">
            Generated
          </Button>
        </div>

        {/* Files Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Project
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Size
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Date
                </th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockFiles.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {file.projectId && file.projectName && (
                      <Link
                        href={`/projects/${file.projectId}`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        {file.projectName}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        file.type === "uploaded"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {file.type === "uploaded" ? "Uploaded" : "Generated"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {file.size}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {file.date}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

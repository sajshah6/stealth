"use client";

import { Upload, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * New Project View
 * Upload files to start a new research workflow
 */
export function NewProjectView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Start New Research Project
          </h1>
          <p className="text-gray-500">
            Upload company documents to begin the automated analysis workflow
          </p>
        </div>

        {/* Project Name Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <Input
            type="text"
            placeholder="e.g., Biotech Company XYZ Analysis"
            className="h-12"
          />
        </div>

        {/* File Upload Area */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Documents
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors cursor-pointer">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Drag and drop files here
              </p>
              <p className="text-xs text-gray-500 mb-4">
                or click to browse
              </p>
              <p className="text-xs text-gray-400">
                Supports PDF, DOCX, XLSX, TXT (max 50MB)
              </p>
            </div>
          </div>
        </div>

        {/* Uploaded Files Preview */}
        <div className="mb-8">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Uploaded Files
          </div>
          <div className="space-y-2">
            {/* Example uploaded file - will be dynamic */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  Company_Prospectus.pdf
                </p>
                <p className="text-xs text-gray-500">2.4 MB</p>
              </div>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                Remove
              </Button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  Financial_Statements_Q3.xlsx
                </p>
                <p className="text-xs text-gray-500">890 KB</p>
              </div>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                Remove
              </Button>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <Button className="w-full h-12 text-base" size="lg">
          Start Research Workflow
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        {/* Workflow Preview */}
        <div className="mt-8 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Workflow Steps
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">1</span>
              Document Ingestion & Key Info Extraction
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">2</span>
              Open Questions Generation
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">3</span>
              Deep Research & Analysis
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">4</span>
              White Paper Draft & Expert Review
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">5</span>
              Final White Paper & Slide Deck
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


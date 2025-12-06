"use client";

import { ArrowLeft, Download, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkflowStep, type WorkflowStepData } from "./WorkflowStep";
import { InputPrompt, type InputPromptData } from "./InputPrompt";
import { cn } from "@/lib/utils";

interface ProjectDetailViewProps {
  projectId: string;
}

/** TODO: Replace with actual data from backend */
const mockProject = {
  id: "1",
  title: "Biotech Company XYZ Analysis",
  status: "in_progress" as const,
  createdAt: "Dec 6, 2024 at 2:30 PM",
  files: [
    { name: "Company_Prospectus.pdf", size: "2.4 MB" },
    { name: "Financial_Statements_Q3.xlsx", size: "890 KB" },
  ],
};

const mockSteps: WorkflowStepData[] = [
  {
    id: "1",
    title: "Document Ingestion",
    status: "completed",
    description: "Successfully processed 2 documents (47 pages total)",
    timestamp: "2:30 PM",
    agentThoughts: [
      "Extracted text from Company_Prospectus.pdf (45 pages)",
      "Parsed financial data from Financial_Statements_Q3.xlsx",
      "Identified document types: Prospectus, Financial Statement",
    ],
  },
  {
    id: "2",
    title: "Key Information Extraction",
    status: "completed",
    description: "Extracted 12 key metrics and 3 risk factors",
    timestamp: "2:32 PM",
    agentThoughts: [
      "Company focuses on oncology therapeutics",
      "Currently in Phase 2 clinical trials for lead compound",
      "Strong IP portfolio with 12 patents",
      "Cash runway: 18 months at current burn rate",
    ],
  },
  {
    id: "3",
    title: "Open Questions Generation",
    status: "completed",
    description: "Generated 8 research questions for deep analysis",
    timestamp: "2:34 PM",
    agentThoughts: [
      "Q1: What is the competitive landscape for their lead compound?",
      "Q2: What are the regulatory hurdles they face?",
      "Q3: How does their cash runway compare to trial timeline?",
      "Q4: What are the key milestones for the next 12 months?",
    ],
  },
  {
    id: "4",
    title: "Deep Research & Analysis",
    status: "in_progress",
    description: "Conducting comprehensive research using multiple sources",
    agentThoughts: [
      "Analyzing competitive landscape via Gemini...",
      "Cross-referencing clinical trial data from public databases...",
      "Researching regulatory pathway for similar drugs...",
    ],
  },
  {
    id: "5",
    title: "White Paper Draft",
    status: "pending",
  },
  {
    id: "6",
    title: "Expert Panel Review",
    status: "pending",
  },
  {
    id: "7",
    title: "Feedback & Refinement",
    status: "pending",
  },
  {
    id: "8",
    title: "Final White Paper & Slide Deck",
    status: "pending",
  },
];

/** Mock input prompt for demo - shown when status is needs_input */
const mockInputPrompt: InputPromptData = {
  question: "Which valuation methodology should I prioritize for this analysis?",
  type: "single_select",
  options: [
    {
      id: "dcf",
      label: "DCF Analysis",
      description: "Discounted cash flow based on projected revenues",
    },
    {
      id: "comps",
      label: "Comparable Companies",
      description: "Valuation based on similar public companies",
    },
    {
      id: "both",
      label: "Both Methods",
      description: "Use both approaches for a comprehensive view",
    },
  ],
};

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const completedSteps = mockSteps.filter((s) => s.status === "completed").length;
  const progress = (completedSteps / mockSteps.length) * 100;
  const needsInput = mockSteps.some((s) => s.status === "needs_input");
  const isCompleted = mockSteps.every((s) => s.status === "completed");

  // For demo: show input prompt for project 2
  const showInputPrompt = projectId === "2";

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {mockProject.title}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Started {mockProject.createdAt}
              </p>
            </div>
            {isCompleted && (
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Download White Paper
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">
                Step {completedSteps} of {mockSteps.length}
              </span>
              <span
                className={cn(
                  "font-medium",
                  isCompleted ? "text-green-600" : "text-blue-600"
                )}
              >
                {Math.round(progress)}% Complete
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isCompleted ? "bg-green-500" : "bg-blue-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Workflow Timeline */}
            <div className="lg:col-span-2">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Workflow Progress
              </h2>

              {/* Input Prompt (if needed) */}
              {showInputPrompt && (
                <div className="mb-6">
                  <InputPrompt prompt={mockInputPrompt} />
                </div>
              )}

              {/* Steps */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                {mockSteps.map((step, index) => (
                  <WorkflowStep
                    key={step.id}
                    step={step}
                    stepNumber={index + 1}
                    isLast={index === mockSteps.length - 1}
                  />
                ))}
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              {/* Source Files */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Source Files
                </h3>
                <div className="space-y-2">
                  {mockProject.files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-gray-400 text-xs">{file.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Files (when complete) */}
              {isCompleted && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Generated Files
                  </h3>
                  <div className="space-y-2">
                    <button className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                      <FileText className="w-4 h-4 text-green-500" />
                      <span className="truncate">White_Paper.pdf</span>
                      <Download className="w-4 h-4 text-gray-400 ml-auto" />
                    </button>
                    <button className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                      <FileText className="w-4 h-4 text-green-500" />
                      <span className="truncate">Slide_Deck.pptx</span>
                      <Download className="w-4 h-4 text-gray-400 ml-auto" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


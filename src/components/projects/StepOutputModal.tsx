"use client";

import { X, FileText, Building2, AlertTriangle, HelpCircle, TrendingUp, ChevronDown, ChevronUp, Target, User, Sparkles, Download, CheckCircle, XCircle, AlertCircle, HelpCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";

interface StepOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepTitle: string;
  stepKey: string;
  output: Record<string, unknown>;
  projectId: string;
}

export function StepOutputModal({
  isOpen,
  onClose,
  stepTitle,
  stepKey,
  output,
  projectId,
}: StepOutputModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {stepTitle}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">Step Output</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {stepKey === "document_upload" && (
                <DocumentUploadOutput output={output} />
              )}
              
              {stepKey === "initial_analysis" && (
                <InitialAnalysisOutput output={output} />
              )}
              
              {stepKey === "archetype_selection" && (
                <ArchetypeSelectionOutput output={output} />
              )}
              
              {stepKey === "ic_memo" && (
                <ICMemoOutput output={output} />
              )}
              
              {stepKey === "extract_open_questions" && (
                <ExtractOpenQuestionsOutput output={output} />
              )}
              
              {stepKey === "deep_research" && (
                <DeepResearchOutput output={output} />
              )}
              
              {stepKey === "research_integration" && (
                <ResearchIntegrationOutput output={output} />
              )}
              
              {stepKey === "final_ic_memo" && (
                <FinalICMemoOutput output={output} />
              )}
              
              {stepKey === "white_paper_draft_1" && (
                <WhitePaperDraft1Output output={output} />
              )}
              
              {stepKey === "assemble_expert_panel" && (
                <AssembleExpertPanelOutput output={output} />
              )}
              
              {stepKey === "expert_panel_review" && (
                <ExpertPanelReviewOutput output={output} projectId={projectId} />
              )}
              
              {/* Fallback for other steps */}
              {stepKey !== "document_upload" && stepKey !== "initial_analysis" && stepKey !== "archetype_selection" && stepKey !== "ic_memo" && stepKey !== "extract_open_questions" && stepKey !== "deep_research" && stepKey !== "research_integration" && stepKey !== "final_ic_memo" && stepKey !== "white_paper_draft_1" && stepKey !== "assemble_expert_panel" && stepKey !== "expert_panel_review" && (
                <div className="text-gray-500">
                  <p>Output view not yet implemented for this step.</p>
                  <pre className="mt-4 p-4 bg-gray-50 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(output, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Document Upload Output Renderer
function DocumentUploadOutput({ output }: { output: Record<string, unknown> }) {
  const files = (output.files as Array<{
    id: string;
    name: string;
    size_bytes: number;
    file_type: string;
  }>) || [];
  
  const totalSize = files.reduce((sum, f) => sum + f.size_bytes, 0);
  
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Files Uploaded</p>
          <p className="text-2xl font-semibold text-blue-900 mt-1">
            {files.length}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 font-medium">Total Size</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {formatFileSize(totalSize)}
          </p>
        </div>
      </div>

      {/* Files List */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Uploaded Files
        </h3>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {file.file_type.toUpperCase()} • {formatFileSize(file.size_bytes)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Initial Analysis Output Renderer
function InitialAnalysisOutput({ output }: { output: Record<string, unknown> }) {
  const [risksExpanded, setRisksExpanded] = useState(true);
  const [questionsExpanded, setQuestionsExpanded] = useState(true);

  const companyName = (output.companyName as string) || "Unknown";
  const assetType = (output.assetType as string) || "Unknown";
  const analysisSummary = (output.analysisSummary as string) || "";
  const keyRisks = (output.keyRisks as string[]) || [];
  const openQuestions = (output.openQuestions as string[]) || [];
  
  const determinedArchetype = output.determinedArchetype as {
    primary: string;
    secondary: string[];
    reasoning: string;
  } | undefined;

  return (
    <div className="space-y-6">
      {/* Header Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Building2 className="w-4 h-4" />
            <p className="text-sm font-medium">Company</p>
          </div>
          <p className="text-lg font-semibold text-blue-900 truncate">
            {companyName}
          </p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <p className="text-sm font-medium">Asset Type</p>
          </div>
          <p className="text-lg font-semibold text-purple-900 capitalize">
            {assetType}
          </p>
        </div>
        
        <div className="p-4 bg-amber-50 rounded-lg">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm font-medium">Key Risks</p>
          </div>
          <p className="text-lg font-semibold text-amber-900">
            {keyRisks.length} identified
          </p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <HelpCircle className="w-4 h-4" />
            <p className="text-sm font-medium">Open Questions</p>
          </div>
          <p className="text-lg font-semibold text-green-900">
            {openQuestions.length} found
          </p>
        </div>
      </div>

      {/* Archetype Section */}
      {determinedArchetype && (
        <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-2xl">📊</div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Investment Archetype
            </h3>
          </div>
          <p className="text-xl font-bold text-blue-900 mb-2">
            {determinedArchetype.primary}
          </p>
          {determinedArchetype.secondary && determinedArchetype.secondary.length > 0 && (
            <p className="text-sm text-blue-700 mb-3">
              <span className="font-medium">Secondary:</span> {determinedArchetype.secondary.join(", ")}
            </p>
          )}
          {determinedArchetype.reasoning && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {determinedArchetype.reasoning}
            </p>
          )}
        </div>
      )}

      {/* Analysis Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
          Analysis Summary
        </h3>
        <div className="p-5 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {analysisSummary}
          </p>
        </div>
      </div>

      {/* Key Risks Section */}
      {keyRisks.length > 0 && (
        <div className="border border-amber-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setRisksExpanded(!risksExpanded)}
            className="w-full px-5 py-3 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Key Risks ({keyRisks.length})
              </h3>
            </div>
            {risksExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {risksExpanded && (
            <div className="p-5 bg-white">
              <ul className="space-y-2">
                {keyRisks.map((risk, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="text-amber-600 font-semibold mt-0.5">•</span>
                    <span className="flex-1">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Open Questions Section */}
      {openQuestions.length > 0 && (
        <div className="border border-green-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setQuestionsExpanded(!questionsExpanded)}
            className="w-full px-5 py-3 bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                Open Questions ({openQuestions.length})
              </h3>
            </div>
            {questionsExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {questionsExpanded && (
            <div className="p-5 bg-white">
              <ul className="space-y-2">
                {openQuestions.map((question, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="text-green-600 font-semibold mt-0.5">{i + 1}.</span>
                    <span className="flex-1">{question}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Archetype Selection Output Renderer
function ArchetypeSelectionOutput({ output }: { output: Record<string, unknown> }) {
  const archetype = output.archetype as { primary: string; secondary: string[] } | undefined;
  const source = output.source as "user_selected" | "auto_determined" | "skipped" | undefined;
  const userContext = output.userContext as string | undefined;
  
  if (!archetype) {
    return (
      <div className="text-gray-500">
        <p>No archetype data available.</p>
      </div>
    );
  }
  
  const sourceDisplay = {
    user_selected: { label: "User Selected", icon: User, color: "blue" },
    auto_determined: { label: "Auto-Determined", icon: Sparkles, color: "purple" },
    skipped: { label: "Skipped", icon: Target, color: "gray" },
  };
  
  const displayInfo = source ? sourceDisplay[source] : sourceDisplay.auto_determined;
  const IconComponent = displayInfo.icon;
  
  return (
    <div className="space-y-6">
      {/* Source Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
        <IconComponent className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">{displayInfo.label}</span>
      </div>
      
      {/* Primary Archetype */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          Primary Archetype
        </h3>
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <p className="text-2xl font-bold text-blue-900">
            {archetype.primary}
          </p>
        </div>
      </div>
      
      {/* Secondary Archetypes */}
      {archetype.secondary && archetype.secondary.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Secondary Archetypes
          </h3>
          <div className="flex flex-wrap gap-2">
            {archetype.secondary.map((secondary, idx) => (
              <div
                key={idx}
                className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="text-sm font-medium text-gray-700">{secondary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* User Context (if provided) */}
      {userContext && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Additional Context
          </h3>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm text-gray-700 leading-relaxed">
              {userContext}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// IC Memo Output Renderer (Initial IC Memo - Step 4)
function ICMemoOutput({ output }: { output: Record<string, unknown> }) {
  const [activeTab, setActiveTab] = useState<"summary" | "full">("summary");
  
  const memoMarkdown = output.memoMarkdown as string | undefined;
  const archetype = output.archetype as { primary: string; secondary: string[] } | undefined;
  
  if (!memoMarkdown) {
    return (
      <div className="text-gray-500">
        <p>No IC memo data available.</p>
      </div>
    );
  }
  
  // Download handler
  const handleDownload = () => {
    const blob = new Blob([memoMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ic-memo-initial-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "summary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab("full")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "full"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Full Memo
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "summary" ? (
        <div className="space-y-6">
          {/* Memo Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Document Type</p>
              <p className="text-sm font-semibold text-gray-900">Initial IC Memo</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Length</p>
              <p className="text-sm font-semibold text-gray-900">
                {memoMarkdown.length.toLocaleString()} characters
              </p>
            </div>
          </div>
          
          {/* Archetype */}
          {archetype && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Investment Archetype
              </h3>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-base font-semibold text-blue-900">{archetype.primary}</p>
                {archetype.secondary && archetype.secondary.length > 0 && (
                  <p className="text-sm text-blue-700 mt-1">
                    Also: {archetype.secondary.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{memoMarkdown}</ReactMarkdown>
        </div>
      )}
      
      {/* Download Button - Always Visible */}
      <div className="pt-4 border-t border-gray-200">
        <Button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Initial IC Memo
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Markdown format • {Math.round(memoMarkdown.length / 1024)}KB
        </p>
      </div>
    </div>
  );
}

// Extract Open Questions Output Renderer (Step 5)
function ExtractOpenQuestionsOutput({ output }: { output: Record<string, unknown> }) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  
  const openQuestions = output.openQuestions as Array<{
    question: string;
    context: string;
    whatWeKnow: string;
    whatWeNeed: string;
    whyItMatters: string;
    sourcePath: string;
    owner: string;
    dueDate: string;
  }> | undefined;
  
  const questionCount = output.questionCount as number | undefined;
  
  if (!openQuestions || openQuestions.length === 0) {
    return (
      <div className="text-gray-500">
        <p>No open questions extracted.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-bold text-purple-900">
            {questionCount} Open Question{questionCount !== 1 ? 's' : ''} Identified
          </h3>
        </div>
        <p className="text-sm text-purple-700">
          Critical questions to address through deep research before making final investment decision
        </p>
      </div>
      
      {/* Questions List */}
      <div className="space-y-3">
        {openQuestions.map((q, idx) => (
          <div
            key={idx}
            className="border border-gray-200 rounded-lg overflow-hidden hover:border-purple-300 transition-colors"
          >
            {/* Question Header */}
            <button
              onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-start gap-3 text-left"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-purple-700">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {q.question}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {q.owner}
                  </span>
                  <span>Due: {q.dueDate}</span>
                </div>
              </div>
              {expandedQuestion === idx ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </button>
            
            {/* Expanded Details */}
            {expandedQuestion === idx && (
              <div className="px-4 py-4 space-y-4 bg-white">
                {/* Context */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 mb-1.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Context
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {q.context}
                  </p>
                </div>
                
                {/* What We Know */}
                <div>
                  <h4 className="text-xs font-semibold text-green-900 mb-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    What We Know
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {q.whatWeKnow}
                  </p>
                </div>
                
                {/* What We Need */}
                <div>
                  <h4 className="text-xs font-semibold text-amber-900 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    What We Need
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {q.whatWeNeed}
                  </p>
                </div>
                
                {/* Why It Matters */}
                <div>
                  <h4 className="text-xs font-semibold text-blue-900 mb-1.5 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    Why It Matters
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {q.whyItMatters}
                  </p>
                </div>
                
                {/* Source Path */}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Source:</span> {q.sourcePath}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Deep Research Output Renderer (Step 6)
function DeepResearchOutput({ output }: { output: Record<string, unknown> }) {
  const [activeTab, setActiveTab] = useState<"summary" | "full">("summary");
  
  const researchReport = output.researchReport as string | undefined;
  const interactionId = output.interactionId as string | undefined;
  const questionsResearched = output.questionsResearched as number | undefined;
  const durationMinutes = output.durationMinutes as number | undefined;
  
  if (!researchReport) {
    return (
      <div className="text-gray-500">
        <p>No research report available.</p>
      </div>
    );
  }
  
  // Download handler
  const handleDownload = () => {
    const blob = new Blob([researchReport], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deep-research-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "summary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab("full")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "full"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Full Report
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "summary" ? (
        <div className="space-y-6">
          {/* Research Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-600 font-medium">Questions</p>
              </div>
              <p className="text-2xl font-semibold text-blue-900">
                {questionsResearched || 0}
              </p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-purple-600 font-medium">Duration</p>
              </div>
              <p className="text-2xl font-semibold text-purple-900">
                {durationMinutes || 0} min
              </p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-600 font-medium">Report Size</p>
              </div>
              <p className="text-2xl font-semibold text-green-900">
                {Math.round(researchReport.length / 1024)}KB
              </p>
            </div>
          </div>
          
          {/* Interaction ID */}
          {interactionId && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Research Session
              </h3>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-mono text-gray-600">{interactionId}</p>
              </div>
            </div>
          )}
          
          {/* Description */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900 mb-1">
                  Deep Research Completed
                </h4>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Google Gemini conducted comprehensive research on {questionsResearched || 0} open questions 
                  from the IC memo. The research took {durationMinutes || 0} minutes and includes validated 
                  findings with sources to inform the final investment decision.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{researchReport}</ReactMarkdown>
        </div>
      )}
      
      {/* Download Button - Always Visible */}
      <div className="pt-4 border-t border-gray-200">
        <Button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Research Report
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Markdown format • {Math.round(researchReport.length / 1024)}KB
        </p>
      </div>
    </div>
  );
}

// Research Integration Output Renderer (Step 7)
function ResearchIntegrationOutput({ output }: { output: Record<string, unknown> }) {
  const fullAnalysis = output.fullAnalysis as string | undefined;
  
  if (!fullAnalysis) {
    return (
      <div className="text-gray-500">
        <p>No integration analysis available.</p>
      </div>
    );
  }
  
  // Download handler
  const handleDownload = () => {
    const blob = new Blob([fullAnalysis], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-integration-analysis-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-6">
      {/* Full Analysis */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Research Integration & Analysis
        </h3>
        <div className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border border-gray-200">
          <ReactMarkdown>{fullAnalysis}</ReactMarkdown>
        </div>
      </div>
      
      {/* Download Button */}
      <div className="pt-4 border-t border-gray-200">
        <Button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Integration Analysis
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Markdown format • {Math.round(fullAnalysis.length / 1024)}KB
        </p>
      </div>
    </div>
  );
}

// Final IC Memo Output Renderer (Step 8)
function FinalICMemoOutput({ output }: { output: Record<string, unknown> }) {
  const [activeTab, setActiveTab] = useState<"summary" | "full">("summary");
  
  const finalMemoMarkdown = output.finalMemoMarkdown as string | undefined;
  const changesSummary = output.changesSummary as string | undefined;
  
  if (!finalMemoMarkdown) {
    return (
      <div className="text-gray-500">
        <p>No IC memo data available.</p>
      </div>
    );
  }
  
  // Download handler
  const handleDownload = () => {
    const blob = new Blob([finalMemoMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ic-memo-final-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "summary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab("full")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "full"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Full Memo
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "summary" ? (
        <div className="space-y-6">
          {/* Memo Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Document Type</p>
              <p className="text-sm font-semibold text-gray-900">Final IC Memo</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Length</p>
              <p className="text-sm font-semibold text-gray-900">
                {finalMemoMarkdown.length.toLocaleString()} characters
              </p>
            </div>
          </div>
          
          {/* Changes Summary */}
          {changesSummary && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Key Updates from Research
              </h3>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {changesSummary}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{finalMemoMarkdown}</ReactMarkdown>
        </div>
      )}
      
      {/* Download Button - Always Visible */}
      <div className="pt-4 border-t border-gray-200">
        <Button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Complete IC Memo
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Markdown format • {Math.round(finalMemoMarkdown.length / 1024)}KB
        </p>
      </div>
    </div>
  );
}

// White Paper Draft 1 Output Renderer (Step 9)
function WhitePaperDraft1Output({ output }: { output: Record<string, unknown> }) {
  const [activeTab, setActiveTab] = useState<"summary" | "full">("summary");
  const [whitePaperContent, setWhitePaperContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const draftId = output.draftId as string | undefined;
  const wordCount = output.wordCount as number | undefined;
  const companyName = output.companyName as string | undefined;
  const generationDurationMs = output.generationDurationMs as number | undefined;
  const durationMinutes = generationDurationMs ? Math.round(generationDurationMs / 60000) : 0;
  
  // Fetch white paper content from database
  useEffect(() => {
    async function fetchWhitePaper() {
      if (!draftId) {
        setLoading(false);
        return;
      }
      
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('white_paper_drafts')
          .select('content')
          .eq('id', draftId)
          .single();
        
        if (error) throw error;
        
        setWhitePaperContent(data.content);
      } catch (error) {
        console.error('Error fetching white paper:', error);
        setWhitePaperContent(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchWhitePaper();
  }, [draftId]);
  
  // Download handler
  const handleDownload = () => {
    if (!whitePaperContent) return;
    
    const blob = new Blob([whitePaperContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `white-paper-${companyName?.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading white paper...</div>
      </div>
    );
  }
  
  if (!whitePaperContent) {
    return (
      <div className="text-gray-500">
        <p>No white paper content available.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "summary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab("full")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "full"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Full White Paper
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "summary" ? (
        <div className="space-y-6">
          {/* White Paper Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-600 font-medium">Word Count</p>
              </div>
              <p className="text-2xl font-semibold text-blue-900">
                {wordCount?.toLocaleString() || 0}
              </p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-purple-600 font-medium">Duration</p>
              </div>
              <p className="text-2xl font-semibold text-purple-900">
                {durationMinutes} min
              </p>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-600 font-medium">Company</p>
              </div>
              <p className="text-lg font-semibold text-green-900 truncate">
                {companyName || "N/A"}
              </p>
            </div>
          </div>
          
          {/* Description */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  White Paper Generated
                </h4>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Decision-ready white paper for {companyName} generated using Gemini Deep Research 
                  with the Deep Revision framework. View the "Full White Paper" tab to read the complete document.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{whitePaperContent}</ReactMarkdown>
        </div>
      )}
      
      {/* Download Button - Always Visible */}
      <div className="pt-4 border-t border-gray-200">
        <Button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download White Paper
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Markdown format • {Math.round((whitePaperContent?.length || 0) / 1024)}KB
        </p>
      </div>
    </div>
  );
}

// ===== Assemble Expert Panel Output =====
function AssembleExpertPanelOutput({ output }: { output: Record<string, unknown> }) {
  const experts = output.experts as Array<{
    index: number;
    name: string;
    role: string;
    credentials: string;
    expertise: string;
  }>;
  const companyName = output.companyName as string;
  const industry = output.industry as string;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-600 font-medium">Expert Panel</p>
          </div>
          <p className="text-2xl font-semibold text-blue-900">
            {experts?.length || 0} Experts
          </p>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-purple-600 font-medium">Industry</p>
          </div>
          <p className="text-lg font-semibold text-purple-900">
            {industry || "N/A"}
          </p>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-600 font-medium">Company</p>
          </div>
          <p className="text-lg font-semibold text-green-900">
            {companyName || "N/A"}
          </p>
        </div>
      </div>
      
      {/* Description */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              Expert Panel Assembled
            </h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              15 experts specifically selected for {companyName} in the {industry} industry. 
              These experts will provide consistent feedback across all review iterations.
            </p>
          </div>
        </div>
      </div>

      {/* Expert Cards */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Expert Profiles</h4>
        {experts?.map((expert) => (
          <div
            key={expert.index}
            className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">#{expert.index}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-semibold text-gray-900">{expert.name}</h5>
                </div>
                <p className="text-sm font-medium text-blue-600 mb-2">{expert.role}</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-0.5">
                      Credentials:
                    </span>
                    <p className="text-sm text-gray-700 flex-1">{expert.credentials}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-0.5">
                      Expertise:
                    </span>
                    <p className="text-sm text-gray-700 flex-1">{expert.expertise}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Expert Panel Review Output =====
function ExpertPanelReviewOutput({ output, projectId }: { output: Record<string, unknown>; projectId: string }) {
  const totalIterations = output.totalIterations as number;
  const finalResult = output.finalResult as string;
  const latestReview = output.latestReview as {
    claudeAverage?: number;
    gptAverage?: number;
    geminiAverage?: number;
    totalExperts: number;
    expertsBelow9: number;
  };

  const [activeIteration, setActiveIteration] = useState(1);
  const [reviews, setReviews] = useState<Record<number, Array<{
    expert_index: number;
    expert_name: string;
    expert_role: string;
    provider: string;
    model: string;
    rating: number;
    priority: number;
    theme: string;
    feedback: string;
  }>>>({});
  const [whitePaperDrafts, setWhitePaperDrafts] = useState<Array<{
    id: string;
    draft_version: number;
    content: string;
    word_count: number;
    generation_method: string;
    created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExperts, setExpandedExperts] = useState<Set<number>>(new Set());
  const [showAllDrafts, setShowAllDrafts] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();
      
      // Fetch expert reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('expert_panel_reviews')
        .select('*')
        .eq('project_id', projectId)
        .order('iteration', { ascending: true })
        .order('expert_index', { ascending: true })
        .order('provider', { ascending: true });

      if (reviewsError) {
        console.error('Error fetching expert reviews:', reviewsError);
        setLoading(false);
        return;
      }

      // Group reviews by iteration
      const grouped: Record<number, Array<any>> = {};
      reviewsData.forEach((review) => {
        if (!grouped[review.iteration]) {
          grouped[review.iteration] = [];
        }
        grouped[review.iteration].push(review);
      });

      setReviews(grouped);

      // Fetch white paper drafts
      const { data: draftsData, error: draftsError } = await supabase
        .from('white_paper_drafts')
        .select('id, draft_version, content, word_count, generation_method, created_at')
        .eq('project_id', projectId)
        .order('draft_version', { ascending: true });

      if (draftsError) {
        console.error('Error fetching white paper drafts:', draftsError);
      } else {
        setWhitePaperDrafts(draftsData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [projectId]);

  const toggleExpert = (expertIndex: number) => {
    const newExpanded = new Set(expandedExperts);
    if (newExpanded.has(expertIndex)) {
      newExpanded.delete(expertIndex);
    } else {
      newExpanded.add(expertIndex);
    }
    setExpandedExperts(newExpanded);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return 'text-green-700 bg-green-100 border-green-300';
    if (rating >= 7) return 'text-yellow-700 bg-yellow-100 border-yellow-300';
    return 'text-red-700 bg-red-100 border-red-300';
  };

  const getRatingBadgeColor = (rating: number) => {
    if (rating >= 9) return 'bg-green-600';
    if (rating >= 7) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getPriorityLabel = (priority: number) => {
    const labels = ['Critical', 'High', 'Medium', 'Low', 'Minor'];
    return labels[priority - 1] || 'Unknown';
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'text-red-700 bg-red-50';
    if (priority === 2) return 'text-orange-700 bg-orange-50';
    if (priority === 3) return 'text-yellow-700 bg-yellow-50';
    if (priority === 4) return 'text-blue-700 bg-blue-50';
    return 'text-gray-700 bg-gray-50';
  };

  const getProviderColor = (provider: string) => {
    if (provider === 'claude') return 'bg-purple-100 text-purple-700 border-purple-300';
    if (provider === 'gpt') return 'bg-green-100 text-green-700 border-green-300';
    if (provider === 'gemini') return 'bg-blue-100 text-blue-700 border-blue-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading expert reviews...</div>
      </div>
    );
  }

  const currentIterationReviews = reviews[activeIteration] || [];
  
  // Group reviews by expert index
  const expertGroups: Record<number, Array<any>> = {};
  currentIterationReviews.forEach((review) => {
    if (!expertGroups[review.expert_index]) {
      expertGroups[review.expert_index] = [];
    }
    expertGroups[review.expert_index].push(review);
  });

  // Calculate stats for current iteration
  const claudeReviews = currentIterationReviews.filter(r => r.provider === 'claude');
  const gptReviews = currentIterationReviews.filter(r => r.provider === 'gpt');
  const geminiReviews = currentIterationReviews.filter(r => r.provider === 'gemini');
  
  const claudeAvg = claudeReviews.length > 0 
    ? (claudeReviews.reduce((sum, r) => sum + r.rating, 0) / claudeReviews.length).toFixed(1)
    : 'N/A';
  const gptAvg = gptReviews.length > 0 
    ? (gptReviews.reduce((sum, r) => sum + r.rating, 0) / gptReviews.length).toFixed(1)
    : 'N/A';
  const geminiAvg = geminiReviews.length > 0 
    ? (geminiReviews.reduce((sum, r) => sum + r.rating, 0) / geminiReviews.length).toFixed(1)
    : 'N/A';
  
  const allRatings = currentIterationReviews.map(r => r.rating);
  const below9Count = allRatings.filter(r => r < 9).length;
  const passedCount = allRatings.filter(r => r >= 9).length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-600 font-medium">Iterations</p>
          </div>
          <p className="text-2xl font-semibold text-blue-900">{totalIterations}</p>
        </div>
        
        <div className={`p-4 border rounded-xl ${finalResult === 'all_passed' ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100' : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            {finalResult === 'all_passed' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <p className={`text-sm font-medium ${finalResult === 'all_passed' ? 'text-green-600' : 'text-yellow-600'}`}>
              Final Result
            </p>
          </div>
          <p className={`text-sm font-semibold ${finalResult === 'all_passed' ? 'text-green-900' : 'text-yellow-900'}`}>
            {finalResult === 'all_passed' ? 'All Passed' : 'Max Iterations'}
          </p>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-purple-600 font-medium">Total Reviews</p>
          </div>
          <p className="text-2xl font-semibold text-purple-900">
            {latestReview.totalExperts}
          </p>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-600 font-medium">Latest Status</p>
          </div>
          <p className="text-sm font-semibold text-green-900">
            {latestReview.totalExperts - latestReview.expertsBelow9} passed
          </p>
        </div>
      </div>

      {/* White Paper Drafts Section */}
      {whitePaperDrafts.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            White Paper Drafts
          </h4>
          
          {/* Final Draft - Prominently Featured */}
          {(() => {
            const finalDraft = whitePaperDrafts[whitePaperDrafts.length - 1];
            const handleDownloadDraft = (draft: typeof finalDraft) => {
              const blob = new Blob([draft.content], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `white-paper-draft-${draft.draft_version}.md`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            };

            return (
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                      FINAL DRAFT
                    </span>
                    <span className="text-sm font-semibold text-green-900">
                      Draft {finalDraft.draft_version}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600">Word Count</p>
                    <p className="text-lg font-bold text-green-900">
                      {finalDraft.word_count?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleDownloadDraft(finalDraft)}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  Download Final White Paper
                </Button>
                <p className="text-xs text-green-700 text-center mt-2">
                  Markdown format • Generated via {finalDraft.generation_method}
                </p>
              </div>
            );
          })()}

          {/* Previous Drafts - Collapsible */}
          {whitePaperDrafts.length > 1 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowAllDrafts(!showAllDrafts)}
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Previous Drafts ({whitePaperDrafts.length - 1})
                  </span>
                </div>
                {showAllDrafts ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showAllDrafts && (
                <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                  {whitePaperDrafts.slice(0, -1).map((draft) => {
                    const handleDownloadDraft = () => {
                      const blob = new Blob([draft.content], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `white-paper-draft-${draft.draft_version}.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    };

                    return (
                      <div
                        key={draft.id}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Draft {draft.draft_version}
                          </p>
                          <p className="text-xs text-gray-600">
                            {draft.word_count?.toLocaleString() || 'N/A'} words • {draft.generation_method}
                          </p>
                        </div>
                        <Button
                          onClick={handleDownloadDraft}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Iteration Tabs */}
      {totalIterations > 1 && (
        <div className="flex gap-2 border-b border-gray-200">
          {Array.from({ length: totalIterations }, (_, i) => i + 1).map((iteration) => (
            <button
              key={iteration}
              onClick={() => setActiveIteration(iteration)}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeIteration === iteration
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Iteration {iteration}
            </button>
          ))}
        </div>
      )}

      {/* Current Iteration Stats */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Iteration {activeIteration} - LLM Average Ratings
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-purple-600"></div>
            <div>
              <p className="text-xs text-gray-600">Claude</p>
              <p className="text-lg font-bold text-gray-900">{claudeAvg}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <div>
              <p className="text-xs text-gray-600">GPT</p>
              <p className="text-lg font-bold text-gray-900">{gptAvg}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <div>
              <p className="text-xs text-gray-600">Gemini</p>
              <p className="text-lg font-bold text-gray-900">{geminiAvg}</p>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-300">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-green-700">{passedCount} experts scored ≥9</span>
            {below9Count > 0 && (
              <span className="text-red-700"> · {below9Count} below 9</span>
            )}
          </p>
        </div>
      </div>

      {/* Expert Reviews */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Expert Reviews ({Object.keys(expertGroups).length} experts)</h4>
        {Object.entries(expertGroups)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([expertIndex, expertReviews]) => {
            const firstReview = expertReviews[0];
            const avgRating = expertReviews.reduce((sum, r) => sum + r.rating, 0) / expertReviews.length;
            const isExpanded = expandedExperts.has(Number(expertIndex));

            return (
              <div
                key={expertIndex}
                className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors"
              >
                {/* Expert Header */}
                <button
                  onClick={() => toggleExpert(Number(expertIndex))}
                  className="w-full p-4 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">#{expertIndex}</span>
                    </div>
                    <div className="text-left">
                      <h5 className="font-semibold text-gray-900">{firstReview.expert_name}</h5>
                      <p className="text-sm text-blue-600">{firstReview.expert_role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Avg Rating</p>
                      <p className={`text-lg font-bold ${avgRating >= 9 ? 'text-green-700' : avgRating >= 7 ? 'text-yellow-700' : 'text-red-700'}`}>
                        {avgRating.toFixed(1)}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expert Reviews (Expanded) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
                    {expertReviews
                      .sort((a, b) => {
                        const order = { claude: 1, gpt: 2, gemini: 3 };
                        return (order[a.provider as keyof typeof order] || 999) - (order[b.provider as keyof typeof order] || 999);
                      })
                      .map((review, idx) => (
                        <div
                          key={idx}
                          className={`p-4 border-2 rounded-lg bg-white ${getRatingColor(review.rating)}`}
                        >
                          {/* Review Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getProviderColor(review.provider)}`}>
                                {review.provider.toUpperCase()}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(review.priority)}`}>
                                {getPriorityLabel(review.priority)}
                              </span>
                            </div>
                            <div className={`px-3 py-1.5 rounded-lg text-white font-bold text-sm ${getRatingBadgeColor(review.rating)}`}>
                              {review.rating}/10
                            </div>
                          </div>

                          {/* Theme */}
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Theme</p>
                            <p className="text-sm font-medium text-gray-900">{review.theme}</p>
                          </div>

                          {/* Feedback */}
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Feedback</p>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {review.feedback}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}


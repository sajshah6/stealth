"use client";

import { X, FileText, Building2, AlertTriangle, HelpCircle, TrendingUp, ChevronDown, ChevronUp, Target, User, Sparkles, Download, CheckCircle, XCircle, AlertCircle, HelpCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface StepOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepTitle: string;
  stepKey: string;
  output: Record<string, unknown>;
}

export function StepOutputModal({
  isOpen,
  onClose,
  stepTitle,
  stepKey,
  output,
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
              
              {stepKey === "final_ic_memo" && (
                <FinalICMemoOutput output={output} />
              )}
              
              {/* Fallback for other steps */}
              {stepKey !== "document_upload" && stepKey !== "initial_analysis" && stepKey !== "archetype_selection" && stepKey !== "ic_memo" && stepKey !== "final_ic_memo" && (
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
  const memoMarkdown = output.memoMarkdown as string | undefined;
  const recommendation = output.recommendation as "proceed" | "ask" | "pass" | undefined;
  const confidence = output.confidence as "high" | "medium" | "low" | undefined;
  const keyMetrics = output.keyMetrics as Record<string, string> | undefined;
  const openQuestions = output.openQuestions as Array<{ question: string; context: string; owner?: string }> | undefined;
  const archetype = output.archetype as { primary: string; secondary: string[] } | undefined;
  
  if (!memoMarkdown) {
    return (
      <div className="text-gray-500">
        <p>No IC memo data available.</p>
      </div>
    );
  }
  
  // Recommendation styling
  const recommendationConfig = {
    proceed: { 
      label: "Proceed ⬆️", 
      icon: CheckCircle, 
      bgColor: "bg-green-50", 
      borderColor: "border-green-200",
      textColor: "text-green-700",
      iconColor: "text-green-600"
    },
    ask: { 
      label: "Ask ⚠️", 
      icon: HelpCircleIcon, 
      bgColor: "bg-amber-50", 
      borderColor: "border-amber-200",
      textColor: "text-amber-700",
      iconColor: "text-amber-600"
    },
    pass: { 
      label: "Pass ⛔", 
      icon: XCircle, 
      bgColor: "bg-red-50", 
      borderColor: "border-red-200",
      textColor: "text-red-700",
      iconColor: "text-red-600"
    },
  };
  
  const recConfig = recommendation ? recommendationConfig[recommendation] : recommendationConfig.ask;
  const RecIcon = recConfig.icon;
  
  // Confidence styling
  const confidenceConfig = {
    high: { color: "text-green-600", bg: "bg-green-50" },
    medium: { color: "text-yellow-600", bg: "bg-yellow-50" },
    low: { color: "text-red-600", bg: "bg-red-50" },
  };
  
  const confConfig = confidence ? confidenceConfig[confidence] : confidenceConfig.medium;
  
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
    <div className="space-y-6">
      {/* Recommendation Card */}
      <div className={`p-6 ${recConfig.bgColor} border ${recConfig.borderColor} rounded-xl`}>
        <div className="flex items-center gap-3 mb-2">
          <RecIcon className={`w-6 h-6 ${recConfig.iconColor}`} />
          <h3 className={`text-lg font-bold ${recConfig.textColor}`}>
            Recommendation: {recConfig.label}
          </h3>
        </div>
        {confidence && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-gray-600">Confidence:</span>
            <span className={`text-sm font-semibold ${confConfig.color}`}>
              {confidence.toUpperCase()}
            </span>
          </div>
        )}
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
      
      {/* Key Metrics */}
      {keyMetrics && Object.keys(keyMetrics).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Key Metrics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(keyMetrics).map(([key, value]) => (
              <div
                key={key}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="text-xs text-gray-600 mb-1">{key}</p>
                <p className="text-sm font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Open Questions Preview */}
      {openQuestions && openQuestions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Open Questions ({openQuestions.length})
          </h3>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <ul className="space-y-2">
              {openQuestions.slice(0, 3).map((q, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-amber-600 font-semibold">{idx + 1}.</span>
                  <span>{q.question}</span>
                </li>
              ))}
            </ul>
            {openQuestions.length > 3 && (
              <p className="text-xs text-gray-500 mt-2">
                +{openQuestions.length - 3} more questions
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Download Button */}
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

// Final IC Memo Output Renderer (Step 7)
function FinalICMemoOutput({ output }: { output: Record<string, unknown> }) {
  const finalMemoMarkdown = output.finalMemoMarkdown as string | undefined;
  const recommendation = output.recommendation as "buy" | "sell" | "hold" | "ask" | undefined;
  const confidence = output.confidence as "high" | "medium" | "low" | undefined;
  const sectionsIncluded = output.sectionsIncluded as string[] | undefined;
  const changesSummary = output.changesSummary as string | undefined;
  
  if (!finalMemoMarkdown) {
    return (
      <div className="text-gray-500">
        <p>No IC memo data available.</p>
      </div>
    );
  }
  
  // Recommendation styling
  const recommendationConfig = {
    buy: { 
      label: "Proceed ⬆️", 
      icon: CheckCircle, 
      bgColor: "bg-green-50", 
      borderColor: "border-green-200",
      textColor: "text-green-700",
      iconColor: "text-green-600"
    },
    hold: { 
      label: "Hold", 
      icon: AlertCircle, 
      bgColor: "bg-yellow-50", 
      borderColor: "border-yellow-200",
      textColor: "text-yellow-700",
      iconColor: "text-yellow-600"
    },
    ask: { 
      label: "Ask ⚠️", 
      icon: HelpCircleIcon, 
      bgColor: "bg-amber-50", 
      borderColor: "border-amber-200",
      textColor: "text-amber-700",
      iconColor: "text-amber-600"
    },
    sell: { 
      label: "Pass ⛔", 
      icon: XCircle, 
      bgColor: "bg-red-50", 
      borderColor: "border-red-200",
      textColor: "text-red-700",
      iconColor: "text-red-600"
    },
  };
  
  const recConfig = recommendation ? recommendationConfig[recommendation] : recommendationConfig.hold;
  const RecIcon = recConfig.icon;
  
  // Confidence styling
  const confidenceConfig = {
    high: { color: "text-green-600", bg: "bg-green-50" },
    medium: { color: "text-yellow-600", bg: "bg-yellow-50" },
    low: { color: "text-red-600", bg: "bg-red-50" },
  };
  
  const confConfig = confidence ? confidenceConfig[confidence] : confidenceConfig.medium;
  
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
    <div className="space-y-6">
      {/* Recommendation Card */}
      <div className={`p-6 ${recConfig.bgColor} border ${recConfig.borderColor} rounded-xl`}>
        <div className="flex items-center gap-3 mb-2">
          <RecIcon className={`w-6 h-6 ${recConfig.iconColor}`} />
          <h3 className={`text-lg font-bold ${recConfig.textColor}`}>
            Recommendation: {recConfig.label}
          </h3>
        </div>
        {confidence && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-gray-600">Confidence:</span>
            <span className={`text-sm font-semibold ${confConfig.color}`}>
              {confidence.toUpperCase()}
            </span>
          </div>
        )}
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
      
      {/* Sections Included */}
      {sectionsIncluded && sectionsIncluded.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Memo Sections ({sectionsIncluded.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {sectionsIncluded.map((section, idx) => (
              <div
                key={idx}
                className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700"
              >
                {section}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Download Button */}
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


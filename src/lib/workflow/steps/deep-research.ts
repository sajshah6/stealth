/**
 * Deep Research Step
 * 
 * Conducts comprehensive research on open questions using
 * Google Gemini Deep Research agent.
 * 
 * This step can take 5-30+ minutes to complete.
 */

import { defineStep } from "../define-step";
import { conductDeepResearch, type DeepResearchResult } from "@/lib/llm";
import type { ExtractOpenQuestionsOutput } from "./extract-open-questions";
import type { InitialAnalysisOutput } from "./initial-analysis";

// =============================================================================
// OUTPUT TYPE
// =============================================================================

export interface DeepResearchOutput {
  /** Full research report from Gemini Deep Research */
  researchReport: string;
  
  /** Gemini interaction ID for reference */
  interactionId: string;
  
  /** Number of questions researched */
  questionsResearched: number;
  
  /** How long the research took (in milliseconds) */
  researchDurationMs: number;
  
  /** Human-readable duration */
  durationMinutes: number;
}

// =============================================================================
// STEP DEFINITION
// =============================================================================

export const deepResearchStep = defineStep<
  {
    extract_open_questions: ExtractOpenQuestionsOutput;
    initial_analysis: InitialAnalysisOutput;
  },
  DeepResearchOutput
>({
  key: "deep_research",
  name: "Deep Research",
  description: "Conduct comprehensive research on open questions using Gemini Deep Research",
  
  llm: {
    provider: "google",
    model: "deep-research-pro-preview-12-2025",
  },
  
  inputFrom: ["extract_open_questions", "initial_analysis"],
  
  mayRequireUserInput: false,
  
  async execute({ inputs, projectId }) {
    console.log("[DeepResearch] Starting deep research...");
    console.log("[DeepResearch] Project:", projectId);
    
    const { extract_open_questions, initial_analysis } = inputs;
    
    if (!extract_open_questions?.openQuestions) {
      return {
        status: "failed",
        error: "No open questions found from previous step",
      };
    }
    
    const questions = extract_open_questions.openQuestions;
    const companyName = initial_analysis?.companyName || "the company";
    
    console.log(`[DeepResearch] Researching ${questions.length} questions for ${companyName}`);
    console.log("[DeepResearch] ⏳ This will take 5-30+ minutes...");
    
    // Log each question being researched
    questions.forEach((q, i) => {
      console.log(`[DeepResearch] Q${i + 1}: ${q.question}`);
    });
    
    try {
      const startTime = Date.now();
      
      // Conduct deep research (will poll until complete)
      const result: DeepResearchResult = await conductDeepResearch(questions, companyName);
      
      const durationMinutes = Math.round(result.researchDurationMs / 60000);
      
      console.log(`[DeepResearch] ✅ Research complete!`);
      console.log(`[DeepResearch] Duration: ${durationMinutes} minutes`);
      console.log(`[DeepResearch] Report length: ${result.researchReport.length} characters`);
      console.log(`[DeepResearch] Interaction ID: ${result.interactionId}`);
      
      return {
        status: "completed",
        output: {
          researchReport: result.researchReport,
          interactionId: result.interactionId,
          questionsResearched: result.questionsResearched,
          researchDurationMs: result.researchDurationMs,
          durationMinutes,
        },
        metadata: {
          llmModel: "deep-research-pro-preview-12-2025",
        },
      };
      
    } catch (err) {
      console.error("[DeepResearch] Error:", err);
      return {
        status: "failed",
        error: err instanceof Error ? err.message : "Deep research failed",
      };
    }
  },
});


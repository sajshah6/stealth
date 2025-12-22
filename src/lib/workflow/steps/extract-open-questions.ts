/**
 * Extract Open Questions Step
 * 
 * Extracts structured open questions from the IC memo
 * using GPT with function calling for guaranteed format.
 */

import { defineStep } from "../define-step";
import { extractOpenQuestions, type OpenQuestion } from "@/lib/llm";
import type { ICMemoOutput } from "./ic-memo";

// =============================================================================
// OUTPUT TYPE
// =============================================================================

export interface ExtractOpenQuestionsOutput {
  /** Extracted open questions in structured format */
  openQuestions: OpenQuestion[];
  
  /** Count of questions extracted */
  questionCount: number;
}

// =============================================================================
// STEP DEFINITION
// =============================================================================

export const extractOpenQuestionsStep = defineStep<
  {
    ic_memo: ICMemoOutput;
  },
  ExtractOpenQuestionsOutput
>({
  key: "extract_open_questions",
  name: "Extract Open Questions",
  description: "Extract structured open questions from the IC memo for research",
  
  llm: {
    provider: "openai",
    model: "gpt-4o",
  },
  
  inputFrom: ["ic_memo"],
  
  mayRequireUserInput: false,
  
  async execute({ inputs }) {
    console.log("[ExtractOpenQuestions] Starting extraction...");
    
    const { ic_memo } = inputs;
    
    if (!ic_memo?.memoMarkdown) {
      return {
        status: "failed",
        error: "No IC memo markdown found",
      };
    }
    
    try {
      // Extract open questions using GPT with function calling
      console.log("[ExtractOpenQuestions] Calling GPT to extract questions...");
      const result = await extractOpenQuestions(ic_memo.memoMarkdown);
      
      console.log(`[ExtractOpenQuestions] Successfully extracted ${result.openQuestions.length} questions`);
      
      // Log the questions for debugging
      result.openQuestions.forEach((q, i) => {
        console.log(`[ExtractOpenQuestions] Question ${i + 1}: ${q.question}`);
        console.log(`  Owner: ${q.owner} | Due: ${q.dueDate}`);
      });
      
      return {
        status: "completed",
        output: {
          openQuestions: result.openQuestions,
          questionCount: result.openQuestions.length,
        },
        metadata: {
          llmModel: "gpt-4o",
        },
      };
      
    } catch (err) {
      console.error("[ExtractOpenQuestions] Error:", err);
      return {
        status: "failed",
        error: err instanceof Error ? err.message : "Failed to extract open questions",
      };
    }
  },
});


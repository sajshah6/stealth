/**
 * Step 8: White Paper Draft 1 Generation
 *
 * Uses Gemini Deep Research with the Deep Revision framework
 * to transform the final IC memo into a decision-ready white paper.
 */

import { defineStep } from "../define-step";
import { generateWhitePaper, type WhitePaperResult } from "@/lib/llm/gemini-white-paper";

interface WhitePaperDraft1Output {
  whitePaperMarkdown: string;
  geminiInteractionId: string;
  generationDurationMs: number;
  companyName: string;
}

export const whitePaperDraft1Step = defineStep({
  key: "white_paper_draft_1",
  name: "White Paper Draft 1",
  description: "Generate decision-ready white paper using Deep Revision framework",
  
  inputFrom: ["final_ic_memo"],
  
  llm: {
    provider: "google",
    model: "deep-research-pro-preview-12-2025",
  },

  async execute({ projectId, context, inputs }) {
    console.log("[WhitePaperDraft1] Starting white paper generation...");
    console.log("[WhitePaperDraft1] Project:", projectId);

    // Extract inputs
    const finalMemo = inputs.final_ic_memo as {
      finalMemoMarkdown: string;
    } | undefined;

    if (!finalMemo?.finalMemoMarkdown) {
      throw new Error("Final IC memo not found in inputs");
    }

    // Get company name from context (from initial_analysis or project)
    const companyName = context.companyName || "the company";

    console.log("[WhitePaperDraft1] Final memo length:", finalMemo.finalMemoMarkdown.length);
    console.log("[WhitePaperDraft1] Company:", companyName);
    console.log("[WhitePaperDraft1] Starting Gemini Deep Research (this will take 10-30+ minutes)...");

    // Generate white paper using Gemini Deep Research
    const result: WhitePaperResult = await generateWhitePaper(
      finalMemo.finalMemoMarkdown,
      companyName
    );

    const durationMinutes = (result.durationMs / 60000).toFixed(1);
    console.log(`[WhitePaperDraft1] White paper generation completed in ${durationMinutes} minutes`);
    console.log("[WhitePaperDraft1] White paper length:", result.whitePaper.length);

    const output: WhitePaperDraft1Output = {
      whitePaperMarkdown: result.whitePaper,
      geminiInteractionId: result.interactionId,
      generationDurationMs: result.durationMs,
      companyName,
    };

    return {
      status: "completed" as const,
      output,
    };
  },
});

export type { WhitePaperDraft1Output };


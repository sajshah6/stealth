/**
 * Step 8: White Paper Draft 1 Generation
 *
 * Uses Gemini Deep Research with the Deep Revision framework
 * to transform the final IC memo into a decision-ready white paper.
 */

import { defineStep } from "../define-step";
import { generateWhitePaper, type WhitePaperResult } from "@/lib/llm/gemini-white-paper";
import { createClient } from "@/lib/supabase/server";

interface WhitePaperDraft1Output {
  draftId: string;  // UUID of the draft in white_paper_drafts table
  draftVersion: number;  // Always 1 for this step
  wordCount: number;
  geminiInteractionId: string;
  generationDurationMs: number;
  companyName: string;
}

export const whitePaperDraft1Step = defineStep({
  key: "white_paper_draft_1",
  name: "White Paper Draft 1",
  description: "Generate decision-ready white paper using Deep Revision framework",
  
  inputFrom: ["final_ic_memo", "initial_analysis"],
  
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

    // Get company name from initial_analysis output
    const initialAnalysis = inputs.initial_analysis as {
      companyName?: string;
    } | undefined;
    
    const companyName = initialAnalysis?.companyName || "the company";

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

    // Save to white_paper_drafts table
    const supabase = await createClient();
    const wordCount = result.whitePaper.split(/\s+/).length;
    
    const { data: draftRecord, error: insertError } = await supabase
      .from('white_paper_drafts')
      .insert({
        project_id: projectId,
        draft_version: 1,
        content: result.whitePaper,
        generated_by: 'gemini_deep_research',
        generation_method: 'initial',
        word_count: wordCount,
        generation_duration_ms: result.durationMs,
        gemini_interaction_id: result.interactionId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[WhitePaperDraft1] Error saving draft:", insertError);
      throw new Error(`Failed to save white paper draft: ${insertError.message}`);
    }

    console.log("[WhitePaperDraft1] Draft saved to database:", draftRecord.id);

    const output: WhitePaperDraft1Output = {
      draftId: draftRecord.id,
      draftVersion: 1,
      wordCount,
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


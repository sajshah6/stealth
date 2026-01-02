/**
 * Expert Panel Review Step (with iterative refinement loop)
 * 
 * Orchestrates multi-LLM expert panel reviews:
 * 1. Run 3 expert panels in parallel (Claude, GPT, Gemini) = 45 experts total
 * 2. Save all reviews to database
 * 3. Check if all experts scored ≥9
 * 4. If not, generate revised draft with Gemini
 * 5. Repeat until all pass or max iterations reached
 */

import { defineStep } from "../define-step";
import { createClient } from "@/lib/supabase/server";
import {
  getGPTExpertPanel,
  getClaudeExpertPanel,
  getGeminiExpertPanel,
  type ExpertPanelResult,
  type ExpertReview,
  type ExpertProfile,
} from "@/lib/llm";
import { generateWhitePaper } from "@/lib/llm/gemini-white-paper";
import { buildRevisionPrompt } from "@/lib/llm/white-paper-revision-prompt";
import type { AssembleExpertPanelOutput } from "./assemble-expert-panel";

type ExpertPanelReviewOutput = {
  totalIterations: number;
  finalDraftVersion: number;
  finalResult: "all_passed" | "max_iterations_reached";
  
  // Summary stats for the final iteration
  // Note: LLM averages can be undefined if that LLM failed in the final iteration
  latestReview: {
    claudeAverage?: number;
    gptAverage?: number;
    geminiAverage?: number;
    totalExperts: number;
    expertsBelow9: number;
  };
};

const MAX_ITERATIONS = 5;

export const expertPanelReviewStep = defineStep({
  key: "expert_panel_review",
  name: "Expert Panel Review",
  description: "Multi-LLM expert panel review with iterative refinement until all experts score ≥9",
  
  inputFrom: ["white_paper_draft_1", "initial_analysis", "assemble_expert_panel"],
  
  llm: {
    provider: "google",  // Primary: Gemini Deep Research (revision), with Claude/GPT for review
    model: "deep-research-pro + claude-opus-4 + gpt-4o",
  },

  async execute({ projectId, inputs }) {
    console.log("[ExpertPanelReview] Starting expert panel review system...");
    console.log("[ExpertPanelReview] Project:", projectId);

    // Get company name
    const initialAnalysis = inputs.initial_analysis as {
      companyName?: string;
    } | undefined;
    const companyName = initialAnalysis?.companyName || "the company";

    // Get the 15 expert profiles from Step 9a
    const expertPanelData = inputs.assemble_expert_panel as AssembleExpertPanelOutput | undefined;
    
    if (!expertPanelData || !expertPanelData.experts || expertPanelData.experts.length !== 15) {
      throw new Error("Expert panel from Step 9a not found or invalid");
    }

    const expertProfiles: ExpertProfile[] = expertPanelData.experts;
    
    console.log("[ExpertPanelReview] Using expert panel:");
    console.log(`[ExpertPanelReview] - Industry: ${expertPanelData.industry}`);
    console.log(`[ExpertPanelReview] - 15 experts selected in Step 9a`);
    expertProfiles.forEach((e) => {
      console.log(`[ExpertPanelReview]   #${e.index}. ${e.name} - ${e.role}`);
    });

    let iteration = 1;
    let allPassed = false;
    let currentDraftVersion = 1;  // Start with draft 1 from previous step
    
    // Conversation state for each LLM
    let claudeConversationHistory: any[] = [];
    let gptConversationHistory: any[] = [];
    let geminiPreviousInteractionId: string | undefined = undefined;

    while (!allPassed && iteration <= MAX_ITERATIONS) {
      console.log(`\n[ExpertPanelReview] ========== Iteration ${iteration}/${MAX_ITERATIONS} ==========`);
      
      // Get current white paper draft from database
      const currentDraft = await getCurrentDraft(projectId, currentDraftVersion);
      
      console.log(`[ExpertPanelReview] Reviewing draft version ${currentDraftVersion}`);
      console.log(`[ExpertPanelReview] Draft length: ${currentDraft.length} characters`);

      // Run all 3 expert panels in parallel
      // Each LLM role-plays as the SAME 15 experts selected in Step 9a
      console.log("[ExpertPanelReview] Running 3 expert panels in parallel...");
      console.log("[ExpertPanelReview] - Claude Opus 4: role-playing as all 15 experts");
      console.log("[ExpertPanelReview] - GPT-4o: role-playing as all 15 experts");
      console.log("[ExpertPanelReview] - Gemini Deep Research: role-playing as all 15 experts (10-30 min)");

      if (iteration > 1) {
        console.log(`[ExpertPanelReview] 🔗 Continuing conversations from iteration ${iteration - 1}`);
        console.log("[ExpertPanelReview] - Claude: Using message history");
        console.log("[ExpertPanelReview] - GPT: Using conversation history");
        console.log("[ExpertPanelReview] - Gemini: Using previous_interaction_id");
      }

      const results: [
        PromiseSettledResult<{ review: ExpertPanelResult; conversationHistory: any[] }>,
        PromiseSettledResult<{ review: ExpertPanelResult; conversationHistory: any[] }>,
        PromiseSettledResult<{ review: ExpertPanelResult; interactionId: string }>
      ] = await Promise.allSettled([
        getClaudeExpertPanel(currentDraft, companyName, expertProfiles, iteration, claudeConversationHistory),
        getGPTExpertPanel(currentDraft, companyName, expertProfiles, iteration, gptConversationHistory),
        getGeminiExpertPanel(currentDraft, companyName, expertProfiles, iteration, geminiPreviousInteractionId),
      ]);
      
      // Extract successful results and handle failures gracefully
      const claudeResult: { review: ExpertPanelResult; conversationHistory: any[] } | null = 
        results[0].status === 'fulfilled' ? results[0].value : null;
      const gptResult: { review: ExpertPanelResult; conversationHistory: any[] } | null = 
        results[1].status === 'fulfilled' ? results[1].value : null;
      const geminiResult: { review: ExpertPanelResult; interactionId: string } | null = 
        results[2].status === 'fulfilled' ? results[2].value : null;
      
      // Log any failures
      if (results[0].status === 'rejected') {
        console.error('[ExpertPanelReview] ❌ Claude failed:', results[0].reason?.message || results[0].reason);
      }
      if (results[1].status === 'rejected') {
        console.error('[ExpertPanelReview] ❌ GPT failed:', results[1].reason?.message || results[1].reason);
      }
      if (results[2].status === 'rejected') {
        console.error('[ExpertPanelReview] ❌ Gemini failed:', results[2].reason?.message || results[2].reason);
      }
      
      // Require at least 2 out of 3 LLMs to succeed
      const successCount = [claudeResult, gptResult, geminiResult].filter(r => r !== null).length;
      if (successCount < 2) {
        throw new Error(`Too many LLM failures: only ${successCount}/3 succeeded. Need at least 2 to continue.`);
      }
      
      console.log(`[ExpertPanelReview] ${successCount}/3 panels completed successfully`);
      
      // Extract reviews and update conversation state (only for successful ones)
      const claudeReview = claudeResult?.review;
      const gptReview = gptResult?.review;
      const geminiReview = geminiResult?.review;
      
      // Update conversation state for next iteration (preserve state even if one failed)
      if (claudeResult) claudeConversationHistory = claudeResult.conversationHistory;
      if (gptResult) gptConversationHistory = gptResult.conversationHistory;
      if (geminiResult) geminiPreviousInteractionId = geminiResult.interactionId;

      // Log averages for successful LLMs
      if (claudeReview) console.log(`[ExpertPanelReview] - Claude average: ${claudeReview.averageScore}`);
      if (gptReview) console.log(`[ExpertPanelReview] - GPT average: ${gptReview.averageScore}`);
      if (geminiReview) console.log(`[ExpertPanelReview] - Gemini average: ${geminiReview.averageScore}`);

      // Save all expert reviews to database (only from successful LLMs)
      await saveExpertReviews(
        projectId,
        iteration,
        currentDraftVersion,
        claudeReview || null,
        gptReview || null,
        geminiReview || null
      );

      // Aggregate all reviews (only from successful LLMs)
      const allExperts = [
        ...(claudeReview?.experts || []),
        ...(gptReview?.experts || []),
        ...(geminiReview?.experts || []),
      ];
      
      const totalReviews = allExperts.length;
      console.log(`[ExpertPanelReview] Total expert reviews collected: ${totalReviews}`);

      const expertsBelow9 = allExperts.filter(e => e.rating < 9);

      console.log(`[ExpertPanelReview] Results: ${expertsBelow9.length}/${totalReviews} experts scored below 9`);

      // Check if all passed
      if (expertsBelow9.length === 0) {
        allPassed = true;
        console.log(`[ExpertPanelReview] ✅ SUCCESS! All ${totalReviews} experts scored ≥9`);
        console.log(`[ExpertPanelReview] White paper approved after ${iteration} iteration(s)`);
        
        const output: ExpertPanelReviewOutput = {
          totalIterations: iteration,
          finalDraftVersion: currentDraftVersion,
          finalResult: "all_passed",
          latestReview: {
            claudeAverage: claudeReview?.averageScore,
            gptAverage: gptReview?.averageScore,
            geminiAverage: geminiReview?.averageScore,
            totalExperts: totalReviews,
            expertsBelow9: 0,
          },
        };
        
        return {
          status: "completed" as const,
          output,
        };
      }

      // Check if we've hit max iterations
      if (iteration >= MAX_ITERATIONS) {
        console.log(`[ExpertPanelReview] ⚠️  Reached max iterations (${MAX_ITERATIONS})`);
        console.log(`[ExpertPanelReview] ${expertsBelow9.length} experts still below 9`);
        console.log("[ExpertPanelReview] Stopping review loop");
        
        const output: ExpertPanelReviewOutput = {
          totalIterations: iteration,
          finalDraftVersion: currentDraftVersion,
          finalResult: "max_iterations_reached",
          latestReview: {
            claudeAverage: claudeReview?.averageScore,
            gptAverage: gptReview?.averageScore,
            geminiAverage: geminiReview?.averageScore,
            totalExperts: totalReviews,
            expertsBelow9: expertsBelow9.length,
          },
        };
        
        return {
          status: "completed" as const,
          output,
        };
      }

      // Generate revised draft
      console.log(`[ExpertPanelReview] Generating revised draft...`);
      console.log(`[ExpertPanelReview] Incorporating feedback from ${expertsBelow9.length} experts`);

      const nextDraftVersion = currentDraftVersion + 1;
      
      await generateRevisedDraft(
        projectId,
        nextDraftVersion,
        currentDraft,
        expertsBelow9,
        companyName,
        iteration
      );

      console.log(`[ExpertPanelReview] Draft ${nextDraftVersion} generated and saved`);

      // Update for next iteration
      currentDraftVersion = nextDraftVersion;
      iteration++;
    }

    // Should never reach here, but TypeScript needs this
    throw new Error("Expert panel review loop exited unexpectedly");
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the current white paper draft from the database
 */
async function getCurrentDraft(
  projectId: string,
  draftVersion: number
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('white_paper_drafts')
    .select('content')
    .eq('project_id', projectId)
    .eq('draft_version', draftVersion)
    .single();

  if (error) {
    throw new Error(`Failed to get draft ${draftVersion}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Draft ${draftVersion} not found`);
  }

  return data.content;
}

/**
 * Save all expert reviews to the database
 */
async function saveExpertReviews(
  projectId: string,
  iteration: number,
  draftVersion: number,
  claudeReview: ExpertPanelResult | null,
  gptReview: ExpertPanelResult | null,
  geminiReview: ExpertPanelResult | null
): Promise<void> {
  const supabase = await createClient();

  // Build rows only for LLMs that succeeded
  const rows = [
    ...(claudeReview ? claudeReview.experts.map((e: ExpertReview) => ({
      project_id: projectId,
      iteration,
      draft_version: draftVersion,
      provider: 'claude' as const,
      model: claudeReview.model,
      expert_index: e.expertIndex,
      expert_name: e.name,
      expert_role: e.role,
      rating: e.rating,
      priority: e.priority,
      theme: e.theme,
      feedback: e.feedback,
    })) : []),
    ...(gptReview ? gptReview.experts.map((e: ExpertReview) => ({
      project_id: projectId,
      iteration,
      draft_version: draftVersion,
      provider: 'gpt' as const,
      model: gptReview.model,
      expert_index: e.expertIndex,
      expert_name: e.name,
      expert_role: e.role,
      rating: e.rating,
      priority: e.priority,
      theme: e.theme,
      feedback: e.feedback,
    })) : []),
    ...(geminiReview ? geminiReview.experts.map((e: ExpertReview) => ({
      project_id: projectId,
      iteration,
      draft_version: draftVersion,
      provider: 'gemini' as const,
      model: geminiReview.model,
      expert_index: e.expertIndex,
      expert_name: e.name,
      expert_role: e.role,
      rating: e.rating,
      priority: e.priority,
      theme: e.theme,
      feedback: e.feedback,
    })) : []),
  ];

  if (rows.length === 0) {
    console.log(`[ExpertPanelReview] ⚠️ No reviews to save (all LLMs failed)`);
    return;
  }

  const { error } = await supabase
    .from('expert_panel_reviews')
    .insert(rows);

  if (error) {
    throw new Error(`Failed to save expert reviews: ${error.message}`);
  }

  console.log(`[ExpertPanelReview] ✅ Saved ${rows.length} reviews for iteration ${iteration}`);
}

/**
 * Generate a revised white paper draft incorporating expert feedback
 */
async function generateRevisedDraft(
  projectId: string,
  nextDraftVersion: number,
  currentDraft: string,
  criticalExperts: ExpertReview[],
  companyName: string,
  iteration: number
): Promise<void> {
  console.log(`[ExpertPanelReview] Calling Gemini to generate draft ${nextDraftVersion}...`);
  console.log(`[ExpertPanelReview] Using rigorous revision framework with ${criticalExperts.length} expert concerns`);

  // Build comprehensive revision prompt using expert-driven framework
  const revisionPrompt = buildRevisionPrompt(
    currentDraft,
    companyName,
    iteration,
    criticalExperts
  );

  console.log(`[ExpertPanelReview] Revision prompt length: ${revisionPrompt.length} characters`);

  // Use Gemini Deep Research to generate revision
  const result = await generateWhitePaper(revisionPrompt, companyName);

  const supabase = await createClient();
  const wordCount = result.whitePaper.split(/\s+/).length;

  // Save revised draft to database
  const { error } = await supabase
    .from('white_paper_drafts')
    .insert({
      project_id: projectId,
      draft_version: nextDraftVersion,
      content: result.whitePaper,
      generated_by: 'gemini_deep_research',
      generation_method: 'revision',
      incorporated_feedback: criticalExperts.map(e => ({
        expert: e.name,
        role: e.role,
        rating: e.rating,
        feedback: e.feedback,
      })),
      word_count: wordCount,
      generation_duration_ms: result.durationMs,
      gemini_interaction_id: result.interactionId,
    });

  if (error) {
    throw new Error(`Failed to save draft ${nextDraftVersion}: ${error.message}`);
  }

  console.log(`[ExpertPanelReview] ✅ Draft ${nextDraftVersion} saved to database`);
}

export type { ExpertPanelReviewOutput };


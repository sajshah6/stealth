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
} from "@/lib/llm";
import { generateWhitePaper } from "@/lib/llm/gemini-white-paper";
import { buildRevisionPrompt } from "@/lib/llm/white-paper-revision-prompt";

type ExpertPanelReviewOutput = {
  totalIterations: number;
  finalDraftVersion: number;
  finalResult: "all_passed" | "max_iterations_reached";
  
  // Summary stats for the final iteration
  latestReview: {
    claudeAverage: number;
    gptAverage: number;
    geminiAverage: number;
    totalExperts: number;
    expertsBelow9: number;
  };
};

const MAX_ITERATIONS = 5;

export const expertPanelReviewStep = defineStep({
  key: "expert_panel_review",
  name: "Expert Panel Review",
  description: "Multi-LLM expert panel review with iterative refinement until all experts score ≥9",
  
  inputFrom: ["white_paper_draft_1", "initial_analysis"],
  
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

    let iteration = 1;
    let allPassed = false;
    let currentDraftVersion = 1;  // Start with draft 1 from previous step

    while (!allPassed && iteration <= MAX_ITERATIONS) {
      console.log(`\n[ExpertPanelReview] ========== Iteration ${iteration}/${MAX_ITERATIONS} ==========`);
      
      // Get current white paper draft from database
      const currentDraft = await getCurrentDraft(projectId, currentDraftVersion);
      
      console.log(`[ExpertPanelReview] Reviewing draft version ${currentDraftVersion}`);
      console.log(`[ExpertPanelReview] Draft length: ${currentDraft.length} characters`);

      // Run all 3 expert panels in parallel
      console.log("[ExpertPanelReview] Running 3 expert panels in parallel...");
      console.log("[ExpertPanelReview] - Claude Opus 4 (15 experts)");
      console.log("[ExpertPanelReview] - GPT-4o (15 experts)");
      console.log("[ExpertPanelReview] - Gemini Deep Research (15 experts) - this will take 10-30 min");

      const [claudeReview, gptReview, geminiReview] = await Promise.all([
        getClaudeExpertPanel(currentDraft, companyName),
        getGPTExpertPanel(currentDraft, companyName),
        getGeminiExpertPanel(currentDraft, companyName),
      ]);

      console.log("[ExpertPanelReview] All 3 panels complete!");
      console.log(`[ExpertPanelReview] - Claude average: ${claudeReview.averageScore}`);
      console.log(`[ExpertPanelReview] - GPT average: ${gptReview.averageScore}`);
      console.log(`[ExpertPanelReview] - Gemini average: ${geminiReview.averageScore}`);

      // Save all 45 expert reviews to database
      await saveExpertReviews(
        projectId,
        iteration,
        currentDraftVersion,
        claudeReview,
        gptReview,
        geminiReview
      );

      // Aggregate all 45 reviews
      const allExperts = [
        ...claudeReview.experts,
        ...gptReview.experts,
        ...geminiReview.experts,
      ];

      const expertsBelow9 = allExperts.filter(e => e.rating < 9);

      console.log(`[ExpertPanelReview] Results: ${expertsBelow9.length}/45 experts scored below 9`);

      // Check if all passed
      if (expertsBelow9.length === 0) {
        allPassed = true;
        console.log(`[ExpertPanelReview] ✅ SUCCESS! All 45 experts scored ≥9`);
        console.log(`[ExpertPanelReview] White paper approved after ${iteration} iteration(s)`);
        
        const output: ExpertPanelReviewOutput = {
          totalIterations: iteration,
          finalDraftVersion: currentDraftVersion,
          finalResult: "all_passed",
          latestReview: {
            claudeAverage: claudeReview.averageScore,
            gptAverage: gptReview.averageScore,
            geminiAverage: geminiReview.averageScore,
            totalExperts: 45,
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
            claudeAverage: claudeReview.averageScore,
            gptAverage: gptReview.averageScore,
            geminiAverage: geminiReview.averageScore,
            totalExperts: 45,
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
  claudeReview: ExpertPanelResult,
  gptReview: ExpertPanelResult,
  geminiReview: ExpertPanelResult
): Promise<void> {
  console.log(`[ExpertPanelReview] Saving 45 expert reviews to database...`);

  const supabase = await createClient();

  // Build rows for all 45 experts
  const rows = [
    ...claudeReview.experts.map((e: ExpertReview) => ({
      project_id: projectId,
      iteration,
      draft_version: draftVersion,
      provider: 'claude' as const,
      model: claudeReview.model,
      expert_name: e.name,
      expert_role: e.role,
      rating: e.rating,
      feedback: e.feedback,
    })),
    ...gptReview.experts.map((e: ExpertReview) => ({
      project_id: projectId,
      iteration,
      draft_version: draftVersion,
      provider: 'gpt' as const,
      model: gptReview.model,
      expert_name: e.name,
      expert_role: e.role,
      rating: e.rating,
      feedback: e.feedback,
    })),
    ...geminiReview.experts.map((e: ExpertReview) => ({
      project_id: projectId,
      iteration,
      draft_version: draftVersion,
      provider: 'gemini' as const,
      model: geminiReview.model,
      expert_name: e.name,
      expert_role: e.role,
      rating: e.rating,
      feedback: e.feedback,
    })),
  ];

  const { error } = await supabase
    .from('expert_panel_reviews')
    .insert(rows);

  if (error) {
    throw new Error(`Failed to save expert reviews: ${error.message}`);
  }

  console.log(`[ExpertPanelReview] ✅ Saved 45 reviews for iteration ${iteration}`);
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


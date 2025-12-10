/**
 * Initial Analysis Step
 * 
 * Analyzes uploaded documents using the Deal Evaluator framework.
 * Determines if user clarification is needed for archetype selection.
 * 
 * Output:
 * - If clarification NOT needed: proceeds with determined archetype
 * - If clarification IS needed: returns options for user to select
 */

import { createClient } from "@/lib/supabase/server";
import { defineStep } from "../define-step";
import {
  getDealEvaluatorAssistant,
  uploadFiles,
  deleteFiles,
  createThread,
  addMessage,
  runAssistant,
  type AnalysisOutput,
} from "@/lib/llm";

// =============================================================================
// OUTPUT TYPE (for context passing)
// =============================================================================

export interface InitialAnalysisOutput {
  /** Whether user needs to select an archetype */
  clarificationNeeded: boolean;
  
  /** Full analysis summary */
  analysisSummary: string;
  
  /** Company/investment name */
  companyName: string;
  
  /** Asset type */
  assetType: "equity" | "fund" | "bond";
  
  /** If no clarification needed - the auto-determined archetype */
  determinedArchetype?: {
    primary: string;
    secondary: string[];
    reasoning: string;
  };
  
  /** If clarification needed - options for user to select from */
  archetypeOptions?: Array<{
    id: string;
    title: string;
    primary: string;
    secondary: string[];
    focusDescription: string;
  }>;
  
  /** Conflicting narratives found */
  conflictingNarratives?: Array<{
    label: string;
    title: string;
    description: string;
  }>;
  
  /** Key risks identified */
  keyRisks: string[];
  
  /** Open questions for research */
  openQuestions: string[];
  
  /** Thread ID for continuing conversation */
  threadId: string;
  
  /** Assistant ID used */
  assistantId: string;
  
  /** OpenAI file IDs (for cleanup after IC memo) */
  openaiFileIds?: string[];
  
  /** User's selected archetype option IDs (if clarification was needed) */
  userSelectedOptionIds?: string[];
}

// =============================================================================
// STEP DEFINITION
// =============================================================================

export const initialAnalysisStep = defineStep<
  { files: Array<{ id: string; name: string; storagePath: string }> },
  InitialAnalysisOutput
>({
  key: "initial_analysis",
  name: "Initial Analysis",
  description: "Analyze uploaded documents with Deal Evaluator framework",
  
  llm: {
    provider: "openai",
    model: "gpt-4-turbo",
  },
  
  inputFrom: ["files"],
  
  mayRequireUserInput: true,
  
  async execute({ projectId, inputs, context, userInput }) {
    console.log("[InitialAnalysis] Starting execution...");
    console.log("[InitialAnalysis] Project:", projectId);
    console.log("[InitialAnalysis] User input:", userInput);
    console.log("[InitialAnalysis] Files in inputs:", inputs.files?.length || 0);
    
    const supabase = await createClient();
    let uploadedFileIds: string[] = [];

    try {
      // Check if this is a re-run with user input (archetype selection submitted)
      // If we already have analysis output and user provided input, just complete
      const existingOutput = context.stepOutputs.initial_analysis as InitialAnalysisOutput | undefined;
      console.log("[InitialAnalysis] Existing output?", !!existingOutput);
      
      if (existingOutput && userInput?.selectedOptionIds) {
        console.log("[InitialAnalysis] User submitted archetype selection - completing without re-run");
        console.log("[InitialAnalysis] Selected options:", userInput.selectedOptionIds);
        
        // Return the existing output - archetype_selection will handle the user's choice
        return {
          status: "completed",
          output: {
            ...existingOutput,
            // Mark that user input was received
            userSelectedOptionIds: userInput.selectedOptionIds as string[],
          },
        };
      }

      // 1. Download files from Supabase Storage
      console.log("[InitialAnalysis] Downloading files from Supabase Storage...");
      const fileBlobs: Array<{ name: string; data: Blob }> = [];
      
      for (const file of inputs.files) {
        console.log(`[InitialAnalysis] Downloading: ${file.name}`);
        const { data, error } = await supabase.storage
          .from("project-files")
          .download(file.storagePath);

        if (error) {
          console.error(`[InitialAnalysis] Failed to download ${file.name}:`, error);
          continue;
        }

        fileBlobs.push({ name: file.name, data });
        console.log(`[InitialAnalysis] Downloaded: ${file.name}`);
      }

      if (fileBlobs.length === 0) {
        console.error("[InitialAnalysis] No files could be downloaded!");
        return {
          status: "failed",
          error: "Could not download any files from storage",
        };
      }

      // 2. Upload files to OpenAI
      console.log(`[InitialAnalysis] Uploading ${fileBlobs.length} files to OpenAI...`);
      uploadedFileIds = await uploadFiles(fileBlobs);
      console.log(`[InitialAnalysis] Uploaded file IDs:`, uploadedFileIds);

      // 3. Get or create assistant
      console.log("[InitialAnalysis] Getting assistant...");
      const assistantId = await getDealEvaluatorAssistant();
      console.log(`[InitialAnalysis] Assistant ID: ${assistantId}`);

      // 4. Create thread and add initial message with files
      console.log("[InitialAnalysis] Creating thread...");
      const threadId = await createThread();
      console.log(`[InitialAnalysis] Thread ID: ${threadId}`);
      
      const userMessage = `Please analyze the following investment opportunity: ${context.project.companyName || context.project.title}

I have uploaded ${fileBlobs.length} document(s) for your review:
${fileBlobs.map((f, i) => `${i + 1}. ${f.name}`).join("\n")}

Please:
1. Read and analyze all documents thoroughly
2. Identify if there are conflicting narratives about this investment
3. Call submit_analysis_output with your findings

Remember:
- If narratives conflict, set clarificationNeeded=true and provide archetypeOptions
- If thesis is clear, set clarificationNeeded=false and provide determinedArchetype`;

      console.log("[InitialAnalysis] Adding message to thread with files...");
      await addMessage(threadId, userMessage, uploadedFileIds);

      // 5. Run the assistant
      console.log("[InitialAnalysis] Running assistant (this may take 1-2 minutes)...");
      const result = await runAssistant(threadId, assistantId);
      console.log("[InitialAnalysis] Assistant completed. Result type:", result.type);

      // NOTE: Don't delete files yet - we need them for IC memo generation
      // Files will be cleaned up after ic_memo step completes

      // 6. Process result
      if (result.type !== "analysis") {
        console.error("[InitialAnalysis] Unexpected result type:", result.type);
        console.error("[InitialAnalysis] Result:", result);
        return {
          status: "failed",
          error: `Assistant did not return structured analysis output. Got: ${result.type}`,
        };
      }

      const analysis: AnalysisOutput = result.output;
      console.log("[InitialAnalysis] Analysis received:");
      console.log("[InitialAnalysis] - clarificationNeeded:", analysis.clarificationNeeded);
      console.log("[InitialAnalysis] - companyName:", analysis.companyName);
      console.log("[InitialAnalysis] - assetType:", analysis.assetType);
      console.log("[InitialAnalysis] - archetypeOptions count:", analysis.archetypeOptions?.length || 0);
      console.log("[InitialAnalysis] - keyRisks count:", analysis.keyRisks?.length || 0);

      // 7. Build output
      const output: InitialAnalysisOutput = {
        clarificationNeeded: analysis.clarificationNeeded,
        analysisSummary: analysis.analysisSummary,
        companyName: analysis.companyName,
        assetType: analysis.assetType,
        determinedArchetype: analysis.determinedArchetype,
        archetypeOptions: analysis.archetypeOptions,
        conflictingNarratives: analysis.conflictingNarratives,
        keyRisks: analysis.keyRisks || [],
        openQuestions: analysis.openQuestions || [],
        threadId,
        assistantId,
        openaiFileIds: uploadedFileIds, // Store for cleanup after IC memo
      };

      // 9. Save thread info to project
      console.log("[InitialAnalysis] Saving thread info to project...");
      await supabase
        .from("projects")
        .update({
          openai_thread_id: threadId,
          openai_assistant_id: assistantId,
        })
        .eq("id", projectId);

      // 10. Determine if we need user input
      const needsUserInput = 
        analysis.clarificationNeeded && 
        analysis.archetypeOptions && 
        analysis.archetypeOptions.length > 1;

      console.log("[InitialAnalysis] Needs user input?", needsUserInput);

      if (needsUserInput) {
        console.log("[InitialAnalysis] Returning needs_input with archetype options");
        return {
          status: "needs_input",
          output,
          userInputRequest: {
            type: "multi_select",
            question: "Select the portfolio role(s) for this investment",
            description: analysis.conflictingNarratives
              ? "The analysis identified conflicting narratives. Please select how you want to frame this investment."
              : "Please select one or more archetypes that best describe your investment thesis.",
            options: analysis.archetypeOptions!.map(opt => ({
              id: opt.id,
              label: opt.title,
              description: `Primary: ${opt.primary} • Secondary: ${opt.secondary.join(", ")}\n${opt.focusDescription}`,
              metadata: {
                primary: opt.primary,
                secondary: opt.secondary,
              },
            })),
          },
          metadata: {
            llmModel: "gpt-4-turbo",
            tokensUsed: result.tokensUsed,
          },
        };
      }

      // No clarification needed - proceed
      console.log("[InitialAnalysis] No clarification needed - returning completed");
      return {
        status: "completed",
        output,
        metadata: {
          llmModel: "gpt-4-turbo",
          tokensUsed: result.tokensUsed,
        },
      };

    } catch (err) {
      console.error("[InitialAnalysis] EXCEPTION:", err);
      // Clean up on error
      if (uploadedFileIds.length > 0) {
        console.log("[InitialAnalysis] Cleaning up OpenAI files due to error...");
        await deleteFiles(uploadedFileIds);
      }

      return {
        status: "failed",
        error: err instanceof Error ? err.message : "Analysis failed",
      };
    }
  },
});


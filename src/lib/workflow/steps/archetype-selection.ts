/**
 * Archetype Selection Step
 * 
 * This step handles investment archetype determination.
 * 
 * BEHAVIOR:
 * - If user input was provided (from initial_analysis needs_input), uses selected archetypes
 * - If archetype was auto-determined by initial_analysis, uses that
 * - If only one option available, uses that option
 * 
 * Always completes successfully with an archetype output.
 */

import { defineStep } from "../define-step";
import type { InitialAnalysisOutput } from "./initial-analysis";

// =============================================================================
// OUTPUT TYPE
// =============================================================================

export interface ArchetypeSelectionOutput {
  /** Brief summary for timeline display */
  summary?: string;
  
  /** The selected/determined archetype */
  archetype: {
    primary: string;
    secondary: string[];
  };
  
  /** How the archetype was determined */
  source: "user_selected" | "auto_determined" | "skipped";
  
  /** If user selected, which option IDs they chose */
  selectedOptionIds?: string[];
  
  /** Any additional context from user */
  userContext?: string;
}

// =============================================================================
// STEP DEFINITION
// =============================================================================

export const archetypeSelectionStep = defineStep<
  { initial_analysis: InitialAnalysisOutput; initial_analysis_user_input?: UserSelection },
  ArchetypeSelectionOutput
>({
  key: "archetype_selection",
  name: "Archetype Selection",
  description: "User selects investment archetype (or auto-determined if clear)",
  
  llm: null, // No LLM - this is a user input step (or auto-determined)
  
  inputFrom: ["initial_analysis"],
  
  mayRequireUserInput: false, // Already handled by initial_analysis step
  
  async execute({ inputs, context }) {
    const analysis = inputs.initial_analysis;
    const userInput = inputs.initial_analysis_user_input;

    console.log("[ArchetypeSelection] Received userInput:", JSON.stringify(userInput, null, 2));
    console.log("[ArchetypeSelection] userInput type:", typeof userInput);
    console.log("[ArchetypeSelection] selectedOptionIds:", (userInput as any)?.selectedOptionIds);
    console.log("[ArchetypeSelection] analysis.archetypeOptions:", analysis.archetypeOptions?.map(o => ({ id: o.id, label: o.title })));

    // Case 1: User provided input (from initial_analysis needs_input)
    const typedUserInput = userInput as UserSelection | undefined;
    if (typedUserInput && typedUserInput.selectedOptionIds && typedUserInput.selectedOptionIds.length > 0) {
      // Find the selected options
      const selectedOptions = analysis.archetypeOptions?.filter(
        opt => typedUserInput.selectedOptionIds!.includes(opt.id)
      ) || [];

      if (selectedOptions.length === 0) {
        console.log("[ArchetypeSelection] ERROR: No valid options matched the selected IDs");
        console.log("[ArchetypeSelection] Selected IDs:", typedUserInput.selectedOptionIds);
        console.log("[ArchetypeSelection] Available option IDs:", analysis.archetypeOptions?.map(o => o.id));
        return {
          status: "failed",
          error: "No valid options were selected",
        };
      }

      // Use the first selected option as primary, merge secondaries
      const primaryOption = selectedOptions[0];
      const allSecondaries = new Set<string>();
      
      for (const opt of selectedOptions) {
        opt.secondary.forEach(s => allSecondaries.add(s));
        // If multiple options selected, their primaries become secondaries too
        if (opt !== primaryOption) {
          allSecondaries.add(opt.primary);
        }
      }

      // Note: We don't notify the assistant here - ic_memo will include the archetype
      // in its prompt. This avoids issues with runs staying active.
      console.log("[ArchetypeSelection] User selected:", primaryOption.title);
      console.log("[ArchetypeSelection] Primary:", primaryOption.primary);
      console.log("[ArchetypeSelection] Secondary:", Array.from(allSecondaries));

      return {
        status: "completed",
        output: {
          summary: `Archetype: ${primaryOption.primary}`,
          archetype: {
            primary: primaryOption.primary,
            secondary: Array.from(allSecondaries),
          },
          source: "user_selected",
          selectedOptionIds: typedUserInput.selectedOptionIds,
          userContext: typedUserInput.additionalContext,
        },
      };
    }

    // Case 2: Auto-determined (no clarification needed)
    if (analysis.determinedArchetype) {
      return {
        status: "completed",
        output: {
          summary: `Archetype: ${analysis.determinedArchetype.primary}`,
          archetype: {
            primary: analysis.determinedArchetype.primary,
            secondary: analysis.determinedArchetype.secondary,
          },
          source: "auto_determined",
        },
      };
    }

    // Case 3: Only one option available
    if (analysis.archetypeOptions && analysis.archetypeOptions.length === 1) {
      const onlyOption = analysis.archetypeOptions[0];
      return {
        status: "completed",
        output: {
          summary: `Archetype: ${onlyOption.primary}`,
          archetype: {
            primary: onlyOption.primary,
            secondary: onlyOption.secondary,
          },
          source: "auto_determined",
        },
      };
    }

    // Shouldn't reach here - means step should have been skipped or needs_input
    return {
      status: "failed",
      error: "No archetype could be determined",
    };
  },
});

// =============================================================================
// HELPER TYPES
// =============================================================================

interface UserSelection {
  selectedOptionIds: string[];
  additionalContext?: string;
}


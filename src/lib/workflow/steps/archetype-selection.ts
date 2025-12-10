/**
 * Archetype Selection Step
 * 
 * This step handles user selection of investment archetype(s).
 * 
 * SKIP CONDITIONS:
 * - If initial_analysis.clarificationNeeded === false
 * - If initial_analysis.archetypeOptions.length <= 1
 * 
 * When skipped, uses the determinedArchetype from initial analysis.
 */

import { defineStep } from "../define-step";
import type { InitialAnalysisOutput } from "./initial-analysis";

// =============================================================================
// OUTPUT TYPE
// =============================================================================

export interface ArchetypeSelectionOutput {
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
  
  llm: null, // No LLM - this is a user input step (or skip)
  
  inputFrom: ["initial_analysis"],
  
  mayRequireUserInput: false, // Already handled by initial_analysis step
  
  // Skip if no clarification was needed
  skipWhen: (context) => {
    const analysis = context.stepOutputs.initial_analysis as InitialAnalysisOutput | undefined;
    
    if (!analysis) return false;
    
    // Skip if no clarification needed
    if (!analysis.clarificationNeeded) return true;
    
    // Skip if only 0 or 1 option
    if (!analysis.archetypeOptions || analysis.archetypeOptions.length <= 1) return true;
    
    return false;
  },
  
  async execute({ inputs, context }) {
    const analysis = inputs.initial_analysis;
    const userInput = inputs.initial_analysis_user_input;

    // Case 1: User provided input (from initial_analysis needs_input)
    if (userInput && userInput.selectedOptionIds && userInput.selectedOptionIds.length > 0) {
      // Find the selected options
      const selectedOptions = analysis.archetypeOptions?.filter(
        opt => userInput.selectedOptionIds!.includes(opt.id)
      ) || [];

      if (selectedOptions.length === 0) {
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
          archetype: {
            primary: primaryOption.primary,
            secondary: Array.from(allSecondaries),
          },
          source: "user_selected",
          selectedOptionIds: userInput.selectedOptionIds,
          userContext: userInput.additionalContext,
        },
      };
    }

    // Case 2: Auto-determined (no clarification needed)
    if (analysis.determinedArchetype) {
      return {
        status: "completed",
        output: {
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


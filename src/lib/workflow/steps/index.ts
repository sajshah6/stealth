/**
 * Workflow Steps
 * 
 * Import this file to register all steps with the workflow system.
 */

// Export step definitions
export { initialAnalysisStep, type InitialAnalysisOutput } from "./initial-analysis";
export { archetypeSelectionStep, type ArchetypeSelectionOutput } from "./archetype-selection";
export { icMemoStep, type ICMemoOutput } from "./ic-memo";

// Import to trigger registration
import "./initial-analysis";
import "./archetype-selection";
import "./ic-memo";


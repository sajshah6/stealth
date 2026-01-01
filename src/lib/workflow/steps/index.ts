/**
 * Workflow Steps
 * 
 * Import this file to register all steps with the workflow system.
 */

// Export step definitions
export { initialAnalysisStep, type InitialAnalysisOutput } from "./initial-analysis";
export { archetypeSelectionStep, type ArchetypeSelectionOutput } from "./archetype-selection";
export { icMemoStep, type ICMemoOutput } from "./ic-memo";
export { extractOpenQuestionsStep, type ExtractOpenQuestionsOutput } from "./extract-open-questions";
export { deepResearchStep, type DeepResearchOutput } from "./deep-research";
export { researchIntegrationStep } from "./research-integration";
export { finalICMemoStep } from "./final-ic-memo";
export { whitePaperDraft1Step, type WhitePaperDraft1Output } from "./white-paper-draft-1";
export { assembleExpertPanelStep, type AssembleExpertPanelOutput, type ExpertProfile } from "./assemble-expert-panel";
export { expertPanelReviewStep, type ExpertPanelReviewOutput } from "./expert-panel-review";

// Import to trigger registration
import "./initial-analysis";
import "./archetype-selection";
import "./ic-memo";
import "./extract-open-questions";
import "./deep-research";
import "./research-integration";
import "./final-ic-memo";
import "./white-paper-draft-1";
import "./assemble-expert-panel";
import "./expert-panel-review";


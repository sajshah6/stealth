/**
 * Document Upload Step
 * 
 * This step is handled entirely by the UI (NewProjectView).
 * This file exists only to register the step in the workflow
 * so that step numbers align correctly with the database.
 * 
 * The step is never actually executed by the workflow runner.
 */

import { defineStep } from "../define-step";

// =============================================================================
// OUTPUT TYPE
// =============================================================================

export interface DocumentUploadOutput {
  summary: string;
  files: Array<{
    id: string;
    name: string;
    size_bytes: number;
    file_type: string;
  }>;
  files_uploaded: number;
  file_ids: string[];
}

// =============================================================================
// STEP DEFINITION
// =============================================================================

export const documentUploadStep = defineStep<{}, DocumentUploadOutput>({
  key: "document_upload",
  name: "Document Upload",
  description: "Upload company documents for analysis",
  
  llm: null, // No LLM - handled by UI
  
  inputFrom: [],
  
  mayRequireUserInput: false,
  
  async execute() {
    // This should never be called - the step is completed by NewProjectView
    throw new Error("document_upload step should never be executed by the workflow runner");
  },
});


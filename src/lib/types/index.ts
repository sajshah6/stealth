/**
 * Shared types for the application
 */

// ============================================
// FILE TYPES
// ============================================

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export interface StoredFile {
  id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  storage_path: string;
  category: "source_document" | "draft" | "final_whitepaper" | "slide_deck" | "research_output" | "other";
  created_at: string;
}

// ============================================
// PROJECT TYPES
// ============================================

export type ProjectStatus = "in_progress" | "needs_input" | "completed" | "failed" | "cancelled";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  company_name?: string;
  description?: string;
  status: ProjectStatus;
  current_step_number: number;
  current_draft_version: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// WORKFLOW TYPES
// ============================================

export type StepStatus = "pending" | "in_progress" | "completed" | "needs_input" | "failed" | "skipped";

export interface WorkflowStepDefinition {
  id: string;
  step_key: string;
  step_name: string;
  description?: string;
  step_order: number;
  llm_provider?: string;
  requires_user_input: boolean;
  is_loopable: boolean;
  is_active: boolean;
  config: Record<string, unknown>;
}

export interface ProjectStep {
  id: string;
  project_id: string;
  step_key: string;
  step_number: number;
  iteration: number;
  status: StepStatus;
  llm_used?: string;
  output: Record<string, unknown>;
  input_request?: {
    question: string;
    options?: { id: string; label: string; description?: string }[];
    type: "single_select" | "multi_select" | "text";
  };
  user_response?: {
    selected: string | string[];
    comment?: string;
  };
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

// ============================================
// DRAFT & REVIEW TYPES
// ============================================

export interface DraftVersion {
  id: string;
  project_id: string;
  version_number: number;
  content?: string;
  word_count?: number;
  review_complete: boolean;
  all_passed: boolean;
  lowest_score?: number;
  highest_score?: number;
  average_score?: number;
  created_at: string;
}

export interface ExpertReview {
  id: string;
  project_id: string;
  draft_version_id: string;
  llm_name: "gpt" | "gemini" | "claude" | "perplexity";
  score?: number;
  passed: boolean;
  feedback?: string;
  detailed_scores?: Record<string, number>;
  created_at: string;
}


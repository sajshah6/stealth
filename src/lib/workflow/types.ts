/**
 * Core workflow types
 * 
 * This defines the contracts for the step-based workflow system.
 * Each step declares what it needs (inputs) and what it produces (outputs).
 */

// =============================================================================
// STEP STATUS
// =============================================================================

export type StepStatus = 
  | "pending"      // Not started
  | "running"      // Currently executing
  | "needs_input"  // Waiting for user input
  | "completed"    // Finished successfully
  | "skipped"      // Skipped due to condition
  | "failed";      // Error occurred

// =============================================================================
// LLM PROVIDERS
// =============================================================================

export type LLMProvider = "openai" | "google" | "anthropic" | "perplexity";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

// =============================================================================
// STEP DEFINITION
// =============================================================================

/**
 * Defines a workflow step.
 * 
 * Each step declares:
 * - What inputs it needs (from previous steps or user)
 * - What outputs it produces
 * - Which LLM to use (if any)
 * - Conditions for skipping
 */
export interface StepDefinition<
  TInput = Record<string, unknown>,
  TOutput = Record<string, unknown>
> {
  /** Unique identifier for this step */
  key: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what this step does */
  description: string;
  
  /** LLM configuration. Null if this step doesn't use an LLM (e.g., user input) */
  llm: LLMConfig | null;
  
  /** 
   * Keys of previous steps whose outputs this step needs.
   * The runner will gather these from project context.
   */
  inputFrom: string[];
  
  /**
   * Whether this step may require user input.
   * If true, the step can return a "needs_input" status with input options.
   */
  mayRequireUserInput: boolean;
  
  /**
   * Condition to determine if this step should be skipped.
   * Receives the current project context.
   * Return true to skip, false to run.
   */
  skipCondition?: (context: ProjectContext) => boolean;
  
  /**
   * Execute this step.
   * Receives gathered inputs from previous steps.
   * Returns the step output.
   */
  execute: (params: StepExecuteParams<TInput>) => Promise<StepExecuteResult<TOutput>>;
}

// =============================================================================
// STEP EXECUTION
// =============================================================================

/**
 * Parameters passed to a step's execute function
 */
export interface StepExecuteParams<TInput = Record<string, unknown>> {
  /** The project ID */
  projectId: string;
  
  /** Gathered inputs from previous steps */
  inputs: TInput;
  
  /** Full project context (for advanced cases) */
  context: ProjectContext;
  
  /** User input, if this step was waiting for it */
  userInput?: Record<string, unknown>;
}

/**
 * Result returned from a step's execute function
 */
export interface StepExecuteResult<TOutput = Record<string, unknown>> {
  /** Status after execution */
  status: "completed" | "needs_input" | "failed";
  
  /** The step's output data */
  output?: TOutput;
  
  /** If needs_input, what to show the user */
  userInputRequest?: UserInputRequest;
  
  /** Error message if failed */
  error?: string;
  
  /** Metadata about the execution */
  metadata?: {
    llmModel?: string;
    tokensUsed?: number;
    durationMs?: number;
  };
}

// =============================================================================
// USER INPUT
// =============================================================================

export type UserInputType = "single_select" | "multi_select" | "text" | "confirm";

export interface UserInputOption {
  id: string;
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UserInputRequest {
  type: UserInputType;
  question: string;
  description?: string;
  options?: UserInputOption[];
  required?: boolean;
}

// =============================================================================
// PROJECT CONTEXT
// =============================================================================

/**
 * The accumulated context for a project.
 * Contains outputs from all completed steps.
 */
export interface ProjectContext {
  /** Project metadata */
  project: {
    id: string;
    title: string;
    companyName?: string;
  };
  
  /** Source files info */
  files: Array<{
    id: string;
    name: string;
    storagePath: string;
  }>;
  
  /** Outputs from completed steps, keyed by step key */
  stepOutputs: Record<string, unknown>;
  
  /** Current step key */
  currentStep: string;
  
  /** Any user inputs that were provided */
  userInputs: Record<string, unknown>;
}

// =============================================================================
// STEP RESULT (for DB storage)
// =============================================================================

export interface StepRecord {
  id: string;
  projectId: string;
  stepKey: string;
  status: StepStatus;
  
  /** The output data from this step */
  output?: Record<string, unknown>;
  
  /** If waiting for input, the request */
  inputRequest?: UserInputRequest;
  
  /** User's response if input was provided */
  userResponse?: Record<string, unknown>;
  
  /** Error message if failed */
  errorMessage?: string;
  
  /** Execution metadata */
  llmModel?: string;
  tokensUsed?: number;
  durationMs?: number;
  
  /** Timestamps */
  startedAt?: string;
  completedAt?: string;
}


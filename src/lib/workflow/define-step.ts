/**
 * Step Definition Helper
 * 
 * A cleaner way to define and register steps.
 */

import { registerStep } from "./registry";
import type { 
  StepDefinition, 
  StepExecuteParams, 
  StepExecuteResult,
  LLMConfig,
  ProjectContext,
} from "./types";

// =============================================================================
// STEP BUILDER
// =============================================================================

interface StepConfig<TInput, TOutput> {
  /** Unique identifier for this step */
  key: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what this step does */
  description: string;
  
  /** LLM configuration. Null if no LLM needed */
  llm?: LLMConfig | null;
  
  /** Keys of previous steps to get inputs from */
  inputFrom?: string[];
  
  /** Whether this step may require user input */
  mayRequireUserInput?: boolean;
  
  /** Condition to skip this step. Return true to skip */
  skipWhen?: (context: ProjectContext) => boolean;
  
  /** The execute function */
  execute: (params: StepExecuteParams<TInput>) => Promise<StepExecuteResult<TOutput>>;
}

/**
 * Define a workflow step with type safety.
 * Automatically registers the step.
 * 
 * @example
 * ```typescript
 * defineStep({
 *   key: "initial_analysis",
 *   name: "Initial Analysis",
 *   description: "Analyze uploaded documents",
 *   llm: { provider: "openai", model: "gpt-4-turbo" },
 *   inputFrom: ["files"],
 *   async execute({ inputs, context }) {
 *     // ... implementation
 *     return { status: "completed", output: { ... } };
 *   }
 * });
 * ```
 */
export function defineStep<
  TInput = Record<string, unknown>,
  TOutput = Record<string, unknown>
>(config: StepConfig<TInput, TOutput>): StepDefinition<TInput, TOutput> {
  const step: StepDefinition<TInput, TOutput> = {
    key: config.key,
    name: config.name,
    description: config.description,
    llm: config.llm ?? null,
    inputFrom: config.inputFrom ?? [],
    mayRequireUserInput: config.mayRequireUserInput ?? false,
    skipCondition: config.skipWhen,
    execute: config.execute,
  };

  // Auto-register the step
  registerStep(step as StepDefinition);

  return step;
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export type { StepExecuteParams, StepExecuteResult, ProjectContext, LLMConfig };


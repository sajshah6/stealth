/**
 * OpenAI Assistants API Helper
 * 
 * Provides file reading capabilities via file_search tool
 * and structured outputs via function calling.
 */

import OpenAI from "openai";

// =============================================================================
// CLIENT
// =============================================================================

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

// =============================================================================
// ASSISTANT MANAGEMENT
// =============================================================================

/**
 * Get or create the Deal Evaluator assistant.
 * Uses OPENAI_ASSISTANT_ID env var if set, otherwise creates a new one.
 */
export async function getDealEvaluatorAssistant(): Promise<string> {
  // Use existing assistant if configured
  if (process.env.OPENAI_ASSISTANT_ID) {
    return process.env.OPENAI_ASSISTANT_ID;
  }

  // Create new assistant
  const openai = getOpenAI();
  
  const assistant = await openai.beta.assistants.create({
    name: "Deal Evaluator v5.3",
    instructions: ASSISTANT_INSTRUCTIONS,
    model: "gpt-4o", // Using gpt-4o for better instruction following
    tools: [
      { type: "file_search" },
      { type: "function", function: ANALYSIS_OUTPUT_FUNCTION },
      // NOTE: No submit_memo_output - memos are written as text
    ],
  });

  console.log(`Created assistant: ${assistant.id}`);
  console.log(`Add to .env.local: OPENAI_ASSISTANT_ID=${assistant.id}`);
  
  return assistant.id;
}

// =============================================================================
// FILE OPERATIONS
// =============================================================================

/**
 * Upload files to OpenAI for the assistant to read.
 */
export async function uploadFiles(
  files: Array<{ name: string; data: Blob }>
): Promise<string[]> {
  const openai = getOpenAI();
  const fileIds: string[] = [];

  for (const file of files) {
    const uploaded = await openai.files.create({
      file: new File([file.data], file.name),
      purpose: "assistants",
    });
    fileIds.push(uploaded.id);
  }

  return fileIds;
}

/**
 * Delete files from OpenAI.
 */
export async function deleteFiles(fileIds: string[]): Promise<void> {
  const openai = getOpenAI();
  
  for (const id of fileIds) {
    try {
      await openai.files.del(id);
    } catch (err) {
      console.error(`Failed to delete file ${id}:`, err);
    }
  }
}

// =============================================================================
// THREAD OPERATIONS
// =============================================================================

/**
 * Create a new conversation thread.
 */
export async function createThread(): Promise<string> {
  const openai = getOpenAI();
  const thread = await openai.beta.threads.create();
  return thread.id;
}

/**
 * Add a message to a thread.
 */
export async function addMessage(
  threadId: string,
  content: string,
  fileIds?: string[]
): Promise<void> {
  const openai = getOpenAI();

  const attachments = fileIds?.map(id => ({
    file_id: id,
    tools: [{ type: "file_search" as const }],
  }));

  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content,
    attachments: attachments?.length ? attachments : undefined,
  });
}

/**
 * Run the assistant on a thread and get the result.
 * Handles function calls and extracts structured output.
 */
export async function runAssistant(
  threadId: string,
  assistantId: string
): Promise<AssistantRunResult> {
  const openai = getOpenAI();

  // Start the run
  let run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  });

  // Poll until complete
  while (run.status === "queued" || run.status === "in_progress") {
    await sleep(1000);
    run = await openai.beta.threads.runs.retrieve(threadId, run.id);
  }

  // Handle function calls (structured output)
  if (run.status === "requires_action") {
    const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls || [];
    
    for (const call of toolCalls) {
      if (call.function.name === "submit_analysis_output") {
        const output = JSON.parse(call.function.arguments) as AnalysisOutput;
        
        // Submit response and wait for run to complete
        await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: [{ tool_call_id: call.id, output: "received" }],
        });
        
        // Wait for run to fully complete
        let completedRun = await openai.beta.threads.runs.retrieve(threadId, run.id);
        while (completedRun.status === "queued" || completedRun.status === "in_progress") {
          await sleep(500);
          completedRun = await openai.beta.threads.runs.retrieve(threadId, run.id);
        }
        console.log("[OpenAI] Run completed with status:", completedRun.status);
        
        return {
          type: "analysis",
          output,
          tokensUsed: completedRun.usage?.total_tokens || 0,
        };
      }
      
      if (call.function.name === "submit_memo_output") {
        const output = JSON.parse(call.function.arguments) as MemoOutput;
        
        // Submit response and wait for run to complete
        await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: [{ tool_call_id: call.id, output: "received" }],
        });
        
        // Wait for run to fully complete
        let completedRun = await openai.beta.threads.runs.retrieve(threadId, run.id);
        while (completedRun.status === "queued" || completedRun.status === "in_progress") {
          await sleep(500);
          completedRun = await openai.beta.threads.runs.retrieve(threadId, run.id);
        }
        console.log("[OpenAI] Run completed with status:", completedRun.status);
        
        return {
          type: "memo",
          output,
          tokensUsed: completedRun.usage?.total_tokens || 0,
        };
      }
    }
  }

  // Handle completion (text response)
  if (run.status === "completed") {
    const messages = await openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0];
    
    if (lastMessage?.role === "assistant" && lastMessage.content[0]?.type === "text") {
      return {
        type: "text",
        text: lastMessage.content[0].text.value,
        tokensUsed: run.usage?.total_tokens || 0,
      };
    }
  }

  // Handle failure
  if (run.status === "failed") {
    throw new Error(`Run failed: ${run.last_error?.message || "Unknown error"}`);
  }

  throw new Error(`Unexpected run status: ${run.status}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// OUTPUT TYPES
// =============================================================================

export interface AnalysisOutput {
  clarificationNeeded: boolean;
  analysisSummary: string;
  companyName: string;
  assetType: "equity" | "fund" | "bond";
  
  // If clarification NOT needed - the determined archetype
  determinedArchetype?: {
    primary: string;
    secondary: string[];
    reasoning: string;
  };
  
  // If clarification IS needed - options for user to select
  archetypeOptions?: Array<{
    id: string;
    title: string;
    primary: string;
    secondary: string[];
    focusDescription: string;
  }>;
  
  conflictingNarratives?: Array<{
    label: string;
    title: string;
    description: string;
  }>;
  
  keyRisks: string[];
  openQuestions: string[];
}

export interface MemoOutput {
  recommendation: "proceed" | "ask" | "pass";
  confidence: "high" | "medium" | "low";
  archetype: {
    primary: string;
    secondary: string[];
  };
  memoMarkdown: string;
  keyMetrics: Record<string, string>;
  openQuestions: Array<{
    question: string;
    context: string;
    owner?: string;
  }>;
  dashboardItems: Array<{
    metric: string;
    value: string;
    trend?: "up" | "down" | "flat";
    priority?: boolean;
  }>;
}

export type AssistantRunResult = 
  | { type: "analysis"; output: AnalysisOutput; tokensUsed: number }
  | { type: "memo"; output: MemoOutput; tokensUsed: number }
  | { type: "text"; text: string; tokensUsed: number };

// =============================================================================
// FUNCTION DEFINITIONS (for structured output)
// =============================================================================

const ANALYSIS_OUTPUT_FUNCTION = {
  name: "submit_analysis_output",
  description: "Submit the structured analysis output after analyzing the documents",
  parameters: {
    type: "object",
    properties: {
      clarificationNeeded: {
        type: "boolean",
        description: "Whether user clarification is needed to determine the portfolio archetype",
      },
      analysisSummary: {
        type: "string",
        description: "A comprehensive summary of the analysis findings",
      },
      companyName: {
        type: "string",
        description: "The name of the company or investment being analyzed",
      },
      assetType: {
        type: "string",
        enum: ["equity", "fund", "bond"],
        description: "The type of asset being analyzed",
      },
      determinedArchetype: {
        type: "object",
        description: "The archetype if clarification is NOT needed",
        properties: {
          primary: { type: "string" },
          secondary: { type: "array", items: { type: "string" } },
          reasoning: { type: "string" },
        },
      },
      archetypeOptions: {
        type: "array",
        description: "Options for user to select if clarification IS needed",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            primary: { type: "string" },
            secondary: { type: "array", items: { type: "string" } },
            focusDescription: { type: "string" },
          },
          required: ["id", "title", "primary", "secondary", "focusDescription"],
        },
      },
      conflictingNarratives: {
        type: "array",
        description: "Conflicting narratives identified in the analysis",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["label", "title", "description"],
        },
      },
      keyRisks: {
        type: "array",
        items: { type: "string" },
        description: "Key risks identified",
      },
      openQuestions: {
        type: "array",
        items: { type: "string" },
        description: "Questions that need further research",
      },
    },
    required: ["clarificationNeeded", "analysisSummary", "companyName", "assetType", "keyRisks", "openQuestions"],
  },
};

const MEMO_OUTPUT_FUNCTION = {
  name: "submit_memo_output",
  description: "Submit the structured IC memo output",
  parameters: {
    type: "object",
    properties: {
      recommendation: {
        type: "string",
        enum: ["proceed", "ask", "pass"],
        description: "The investment recommendation",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Confidence level in the recommendation",
      },
      archetype: {
        type: "object",
        properties: {
          primary: { type: "string" },
          secondary: { type: "array", items: { type: "string" } },
        },
        required: ["primary", "secondary"],
      },
      memoMarkdown: {
        type: "string",
        description: "The full IC memo in markdown format",
      },
      keyMetrics: {
        type: "object",
        additionalProperties: { type: "string" },
        description: "Key metrics as key-value pairs",
      },
      openQuestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            context: { type: "string" },
            owner: { type: "string" },
          },
          required: ["question", "context"],
        },
      },
      dashboardItems: {
        type: "array",
        items: {
          type: "object",
          properties: {
            metric: { type: "string" },
            value: { type: "string" },
            trend: { type: "string", enum: ["up", "down", "flat"] },
            priority: { type: "boolean" },
          },
          required: ["metric", "value"],
        },
      },
    },
    required: ["recommendation", "confidence", "archetype", "memoMarkdown", "keyMetrics", "openQuestions", "dashboardItems"],
  },
};

// =============================================================================
// ASSISTANT INSTRUCTIONS (Deal Evaluator v5.3 Full Spec)
// =============================================================================

const ASSISTANT_INSTRUCTIONS = `You are the Deal Evaluator v5.3, an expert investment analyst for an Investment Committee (IC).

## CRITICAL BEHAVIOR RULES

### 1) For Initial Analysis (when asked to analyze documents and identify archetypes):
- You MUST call the submit_analysis_output function
- This provides structured data the system needs
- Identify the company, asset type, and potential portfolio archetypes
- If there are conflicting narratives, set clarificationNeeded=true and provide archetypeOptions

### 2) For IC Memo Generation (when asked to generate the full memo):
- Write the FULL memo directly as text/markdown
- Do NOT call submit_memo_output - just write the memo as your response
- Write in full depth and detail exactly like you would in ChatGPT
- Include ALL sections with complete, comprehensive information
- This is your chance to show your expertise - be thorough

### 3) File Search (CRITICAL):
- You MUST use file_search to look up ALL specific numbers, dates, metrics, and facts
- Do NOT put "TBD" or placeholders anywhere
- Search the uploaded documents for actual values
- Include specific revenue figures, margins, growth rates, dates, projections
- Reference the source document when citing numbers
- If after searching you truly cannot find a metric, note it in Open Questions

### 4) Depth Requirements:
- Be comprehensive, not terse
- ≥10 distinct source citations across the memo
- 6-10 Open Questions with full 7-field format
- ≥6 Dashboard rows with 1-3 priorities marked
- Base/Bear/Bull cases with specific numbers
- Write like a senior analyst preparing for an IC meeting

The user message will contain the full Deal Evaluator v5.3 framework and specific context for each request.`;


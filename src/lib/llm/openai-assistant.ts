/**
 * OpenAI Assistants API Helper
 * 
 * Provides file reading capabilities via file_search tool
 * and structured outputs via function calling.
 */

import OpenAI from "openai";
import { withRetry } from "@/lib/utils/retry";

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
    const { result: uploaded } = await withRetry(
      async () => {
        return await openai.files.create({
          file: new File([file.data], file.name),
          purpose: "assistants",
        });
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        logPrefix: `[OpenAI-Files/${file.name}]`,
      }
    );
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
      await withRetry(
        async () => {
          return await openai.files.del(id);
        },
        {
          maxRetries: 2,
          initialDelayMs: 500,
          logPrefix: `[OpenAI-Files/delete/${id}]`,
        }
      );
    } catch (err) {
      console.error(`Failed to delete file ${id} after retries:`, err);
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
  const { result: thread } = await withRetry(
    async () => {
      return await openai.beta.threads.create();
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      logPrefix: "[OpenAI-Thread/create]",
    }
  );
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

  await withRetry(
    async () => {
      return await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content,
        attachments: attachments?.length ? attachments : undefined,
      });
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      logPrefix: `[OpenAI-Thread/message/${threadId}]`,
    }
  );
}

/**
 * Extract open questions from a memo using GPT with function calling.
 * Returns structured open questions data.
 */
export async function extractOpenQuestions(
  memoMarkdown: string
): Promise<OpenQuestionsOutput> {
  const openai = getOpenAI();
  
  console.log("[ExtractOpenQuestions] Extracting open questions from memo...");
  
  // Use GPT-4o with function calling (not the assistant API, just regular chat completion)
  const completion = await withRetry(
    async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting structured data from Investment Committee memos.

CRITICAL RULES:
1. Find the "Open Questions" section (usually section 8) in the memo
2. Extract EVERY SINGLE question - do not skip any
3. Copy the text EXACTLY as written - do NOT summarize, rephrase, or add interpretation
4. Preserve ALL details - if a question mentions "US, EU, and Japan", include all three
5. Extract the FULL text from each field - do not truncate

Each question has these 7 fields:
1. **Context**: Background for the question
2. **What we know**: Current information  
3. **What we need**: Specific information gap
4. **Why it matters**: Impact on investment thesis
5. **Source path**: Where to find the answer
6. **Owner**: Who is responsible
7. **Due date**: When it's needed

EXAMPLE FROM MEMO:
"1. **Context:** Timeline for FDA approval in US, EU, and Japan
   - **What we know:** Products submitted Q4 2024
   - **What we need:** Region-specific dates and competitor timelines
   ..."

YOUR EXTRACTION:
{
  "context": "Timeline for FDA approval in US, EU, and Japan",
  "whatWeKnow": "Products submitted Q4 2024", 
  "whatWeNeed": "Region-specific dates and competitor timelines",
  ...
}

Copy EXACTLY. Do not lose ANY detail.`,
      },
      {
        role: "user",
        content: `Extract all open questions from this IC memo:\n\n${memoMarkdown}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: EXTRACT_OPEN_QUESTIONS_FUNCTION,
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: "submit_open_questions" },
    },
      });
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      logPrefix: "[OpenAI-ExtractQuestions]",
    }
  ).then(r => r.result);
  
  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== "submit_open_questions") {
    throw new Error("Failed to extract open questions - no function call returned");
  }
  
  const result = JSON.parse(toolCall.function.arguments) as OpenQuestionsOutput;
  console.log(`[ExtractOpenQuestions] Extracted ${result.openQuestions.length} questions`);
  
  return result;
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

  // Start the run with retry
  let run = await withRetry(
    async () => {
      return await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      logPrefix: `[OpenAI-Run/create]`,
    }
  ).then(r => r.result);

  // Poll until complete with retry on each poll
  while (run.status === "queued" || run.status === "in_progress") {
    await sleep(1000);
    run = await withRetry(
      async () => {
        return await openai.beta.threads.runs.retrieve(threadId, run.id);
      },
      {
        maxRetries: 3,
        initialDelayMs: 500,
        logPrefix: `[OpenAI-Run/poll]`,
      }
    ).then(r => r.result);
  }

  // Handle function calls (structured output)
  if (run.status === "requires_action") {
    const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls || [];
    
    for (const call of toolCalls) {
      if (call.function.name === "submit_analysis_output") {
        const output = JSON.parse(call.function.arguments) as AnalysisOutput;
        
        // Submit response and wait for run to complete with retry
        await withRetry(
          async () => {
            return await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
              tool_outputs: [{ tool_call_id: call.id, output: "received" }],
            });
          },
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            logPrefix: `[OpenAI-Run/submitToolOutputs]`,
          }
        );
        
        // Wait for run to fully complete with retry on each poll
        let completedRun = await withRetry(
          async () => {
            return await openai.beta.threads.runs.retrieve(threadId, run.id);
          },
          {
            maxRetries: 3,
            initialDelayMs: 500,
            logPrefix: `[OpenAI-Run/poll-completion]`,
          }
        ).then(r => r.result);
        while (completedRun.status === "queued" || completedRun.status === "in_progress") {
          await sleep(500);
          completedRun = await withRetry(
            async () => {
              return await openai.beta.threads.runs.retrieve(threadId, run.id);
            },
            {
              maxRetries: 3,
              initialDelayMs: 500,
              logPrefix: `[OpenAI-Run/poll-completion]`,
            }
          ).then(r => r.result);
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
        
        // Submit response and wait for run to complete with retry
        await withRetry(
          async () => {
            return await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
              tool_outputs: [{ tool_call_id: call.id, output: "received" }],
            });
          },
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            logPrefix: `[OpenAI-Run/submitToolOutputs]`,
          }
        );
        
        // Wait for run to fully complete with retry on each poll
        let completedRun = await withRetry(
          async () => {
            return await openai.beta.threads.runs.retrieve(threadId, run.id);
          },
          {
            maxRetries: 3,
            initialDelayMs: 500,
            logPrefix: `[OpenAI-Run/poll-completion]`,
          }
        ).then(r => r.result);
        while (completedRun.status === "queued" || completedRun.status === "in_progress") {
          await sleep(500);
          completedRun = await withRetry(
            async () => {
              return await openai.beta.threads.runs.retrieve(threadId, run.id);
            },
            {
              maxRetries: 3,
              initialDelayMs: 500,
              logPrefix: `[OpenAI-Run/poll-completion]`,
            }
          ).then(r => r.result);
        }
        console.log("[OpenAI] Run completed with status:", completedRun.status);
        
        return {
          type: "memo",
          output,
          tokensUsed: completedRun.usage?.total_tokens || 0,
        };
      }
      
      if (call.function.name === "submit_open_questions") {
        const output = JSON.parse(call.function.arguments) as OpenQuestionsOutput;
        
        // Submit response and wait for run to complete with retry
        await withRetry(
          async () => {
            return await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
              tool_outputs: [{ tool_call_id: call.id, output: "received" }],
            });
          },
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            logPrefix: `[OpenAI-Run/submitToolOutputs]`,
          }
        );
        
        // Wait for run to fully complete with retry on each poll
        let completedRun = await withRetry(
          async () => {
            return await openai.beta.threads.runs.retrieve(threadId, run.id);
          },
          {
            maxRetries: 3,
            initialDelayMs: 500,
            logPrefix: `[OpenAI-Run/poll-completion]`,
          }
        ).then(r => r.result);
        while (completedRun.status === "queued" || completedRun.status === "in_progress") {
          await sleep(500);
          completedRun = await withRetry(
            async () => {
              return await openai.beta.threads.runs.retrieve(threadId, run.id);
            },
            {
              maxRetries: 3,
              initialDelayMs: 500,
              logPrefix: `[OpenAI-Run/poll-completion]`,
            }
          ).then(r => r.result);
        }
        console.log("[OpenAI] Run completed with status:", completedRun.status);
        
        return {
          type: "open_questions",
          output,
          tokensUsed: completedRun.usage?.total_tokens || 0,
        };
      }
    }
  }

  // Handle completion (text response)
  if (run.status === "completed") {
    const messages = await withRetry(
      async () => {
        return await openai.beta.threads.messages.list(threadId);
      },
      {
        maxRetries: 3,
        initialDelayMs: 500,
        logPrefix: `[OpenAI-Messages/list]`,
      }
    ).then(r => r.result);
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

export interface OpenQuestion {
  question: string;
  context: string;
  whatWeKnow: string;
  whatWeNeed: string;
  whyItMatters: string;
  sourcePath: string;
  owner: string;
  dueDate: string;
}

export interface OpenQuestionsOutput {
  openQuestions: OpenQuestion[];
}

export type AssistantRunResult = 
  | { type: "analysis"; output: AnalysisOutput; tokensUsed: number }
  | { type: "memo"; output: MemoOutput; tokensUsed: number }
  | { type: "open_questions"; output: OpenQuestionsOutput; tokensUsed: number }
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

const EXTRACT_OPEN_QUESTIONS_FUNCTION = {
  name: "submit_open_questions",
  description: "Submit the extracted open questions from an IC memo in structured format",
  parameters: {
    type: "object",
    properties: {
      openQuestions: {
        type: "array",
        description: "Array of open questions from the memo",
        items: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The main question - copy EXACTLY as written in the memo, preserve all detail",
            },
            context: {
              type: "string",
              description: "Background context - copy the FULL text from the memo verbatim",
            },
            whatWeKnow: {
              type: "string",
              description: "What we know - extract the COMPLETE text, do not summarize",
            },
            whatWeNeed: {
              type: "string",
              description: "What we need - extract the FULL text exactly as written",
            },
            whyItMatters: {
              type: "string",
              description: "Why it matters - copy the COMPLETE explanation from the memo",
            },
            sourcePath: {
              type: "string",
              description: "Source path - extract EXACTLY as written (e.g., 'regulatory filings, market research')",
            },
            owner: {
              type: "string",
              description: "Owner - copy the exact name/role from the memo",
            },
            dueDate: {
              type: "string",
              description: "Due date - extract exactly as written (e.g., 'Q1 2026')",
            },
          },
          required: ["question", "context", "whatWeKnow", "whatWeNeed", "whyItMatters", "sourcePath", "owner", "dueDate"],
        },
      },
    },
    required: ["openQuestions"],
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


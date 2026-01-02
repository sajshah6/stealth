/**
 * Gemini Expert Panel Review
 * 
 * Uses Gemini Deep Research for comprehensive analysis,
 * then GPT function calling to extract structured reviews
 */

import { GoogleGenAI } from '@google/genai';
import OpenAI from "openai";
import { withRetry } from '@/lib/utils/retry';
import {
  buildExpertPanelPrompt,
  buildIterationReviewPrompt,
  calculateAverageScore,
  getCriticalExperts,
  validateExpertPanel,
  type ExpertPanelResult,
  type ExpertReview,
  type ExpertProfile,
} from "./expert-panel";

let geminiClient: GoogleGenAI | null = null;
let openaiClient: OpenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY environment variable is not set");
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const EXTRACT_EXPERTS_FUNCTION = {
  name: "extract_expert_reviews",
  description: "Extract the 15 expert reviews from the Gemini output",
  parameters: {
    type: "object",
    properties: {
      experts: {
        type: "array",
        description: "Array of exactly 15 expert reviews",
        items: {
          type: "object",
          properties: {
            expertIndex: {
              type: "number",
              description: "The expert's index number (1-15) from the provided panel list",
              minimum: 1,
              maximum: 15,
            },
            name: {
              type: "string",
              description: "Expert's full name",
            },
            role: {
              type: "string",
              description: "Expert's area of expertise",
            },
            rating: {
              type: "number",
              description: "Rating from 1-10",
            },
            priority: {
              type: "number",
              description: "How urgently this concern should be addressed (1=most critical, 5=lowest priority). Use your judgment based on impact.",
              minimum: 1,
              maximum: 5,
            },
            theme: {
              type: "string",
              description: "Concise label (2-4 words) describing the primary focus of feedback, e.g., 'Valuation Methodology', 'Market Sizing', 'Competitive Moat'",
            },
            feedback: {
              type: "string",
              description: "Expert's feedback",
            },
          },
          required: ["expertIndex", "name", "role", "rating", "priority", "theme", "feedback"],
        },
        minItems: 15,
        maxItems: 15,
      },
    },
    required: ["experts"],
  },
};

export async function getGeminiExpertPanel(
  whitePaper: string,
  companyName: string,
  expertProfiles: ExpertProfile[],
  iteration: number = 1,
  previousInteractionId?: string
): Promise<{ review: ExpertPanelResult; interactionId: string }> {
  console.log("[Gemini-ExpertPanel] Starting review with Gemini Deep Research...");
  console.log(`[Gemini-ExpertPanel] Iteration: ${iteration}`);
  console.log("[Gemini-ExpertPanel] White paper length:", whitePaper.length);
  console.log(`[Gemini-ExpertPanel] Using ${expertProfiles.length} pre-selected expert profiles`);
  
  if (iteration > 1 && previousInteractionId) {
    console.log(`[Gemini-ExpertPanel] 🔗 Continuing from previous interaction: ${previousInteractionId}`);
  }

  const gemini = getGeminiClient();
  
  // Build appropriate prompt based on iteration
  const prompt = iteration === 1
    ? buildExpertPanelPrompt(whitePaper, companyName, expertProfiles)
    : buildIterationReviewPrompt(whitePaper, companyName, expertProfiles, iteration);

  const startTime = Date.now();

  // Step 1: Gemini Deep Research generates comprehensive expert reviews
  console.log("[Gemini-ExpertPanel] Creating Gemini interaction (this may take 10-30 minutes)...");
  
  const interaction = await withRetry(
    async () => {
      const createParams: any = {
        input: prompt,
        agent: 'deep-research-pro-preview-12-2025',
        background: true,
      };
      
      // Add previousInteractionId if this is a continuation
      if (previousInteractionId) {
        createParams.previousInteractionId = previousInteractionId;
      }
      
      return await gemini.interactions.create(createParams);
    },
    {
      maxRetries: 3,
      initialDelayMs: 2000,
      logPrefix: "[Gemini-ExpertPanel/create]",
    }
  ).then(r => r.result);

  console.log(`[Gemini-ExpertPanel] Interaction started: ${interaction.id}`);
  console.log("[Gemini-ExpertPanel] Polling for completion...");

  // Poll until complete
  let pollCount = 0;
  let geminiOutput: string | null = null;

  while (true) {
    pollCount++;
    const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);

    if (pollCount % 6 === 0) {  // Log every minute (6 polls * 10s)
      console.log(`[Gemini-ExpertPanel] Poll #${pollCount} (${elapsedMinutes}m elapsed)...`);
    }

    const result = await withRetry(
      async () => {
        return await gemini.interactions.get(interaction.id);
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        logPrefix: "[Gemini-ExpertPanel/poll]",
      }
    ).then(r => r.result);

    if (result.status === 'completed') {
      const durationMs = Date.now() - startTime;
      const durationMinutes = (durationMs / 60000).toFixed(1);

      console.log(`[Gemini-ExpertPanel] ✅ Gemini completed in ${durationMinutes} minutes`);

      if (!result.outputs || result.outputs.length === 0) {
        throw new Error("Gemini completed but no outputs found");
      }

      const finalOutput = result.outputs[result.outputs.length - 1];

      if (!finalOutput || !('text' in finalOutput) || typeof finalOutput.text !== 'string') {
        throw new Error("Gemini completed but no output text found");
      }

      geminiOutput = finalOutput.text;
      break;
    }

    if (result.status === 'failed') {
      throw new Error(`Gemini Deep Research failed`);
    }

    // Wait 10 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  if (!geminiOutput) {
    throw new Error("No output from Gemini");
  }

  console.log("[Gemini-ExpertPanel] Gemini output length:", geminiOutput.length);
  console.log("[Gemini-ExpertPanel] Parsing with GPT function calling...");

  // Step 2: Use GPT to parse Gemini's output into structured format
  const openai = getOpenAIClient();

  console.log("[Gemini-ExpertPanel] Calling GPT-4o to extract structured data...");
  const parseStartTime = Date.now();

  const { result: completion, attempts } = await withRetry(
    async () => {
      console.log("[Gemini-ExpertPanel/parse] Sending request to GPT-4o...");
      return await openai.chat.completions.create(
        {
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: `You are extracting structured data from a Gemini Deep Research output.

**ORIGINAL PROMPT SENT TO GEMINI:**
${prompt}

**GEMINI'S RESPONSE:**
${geminiOutput}

---

**YOUR TASK:**
Extract the 15 expert reviews from Gemini's response. For each expert, parse:

- **expertIndex**: The expert's number (1-15) from the original panel list
- **name**: Full name (should match the expert names from the prompt)
- **role**: Area of expertise (should match the roles from the prompt)
- **rating**: Score from 1-10
- **priority**: How urgently this concern should be addressed (1-5, where 1=most critical, 5=lowest)
  * Extract from text if mentioned, or infer based on the severity/importance of their feedback
  * Use your judgment - what matters most for the investment decision?
- **theme**: A concise label (2-4 words) describing the primary focus of their feedback
  * Examples: "Valuation Methodology", "Market Sizing", "Competitive Moat", "Management Track Record", etc.
  * Extract or infer the most appropriate theme from their feedback
- **feedback**: Their detailed feedback

Make sure you extract reviews for all 15 experts listed in the original prompt.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: EXTRACT_EXPERTS_FUNCTION,
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_expert_reviews" },
          },
        },
        {
          timeout: 5 * 60 * 1000,  // 5 minute timeout in request options
        }
      );
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      logPrefix: "[Gemini-ExpertPanel/parse]",
    }
  );

  const parseDuration = ((Date.now() - parseStartTime) / 1000).toFixed(1);
  console.log(`[Gemini-ExpertPanel] GPT parsing completed in ${parseDuration}s (${attempts} attempt${attempts > 1 ? 's' : ''})`);

  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];

  if (!toolCall || toolCall.function.name !== "extract_expert_reviews") {
    throw new Error("GPT failed to extract expert reviews from Gemini output");
  }

  const parsed = JSON.parse(toolCall.function.arguments);

  // Validate
  validateExpertPanel(parsed.experts);

  const experts: ExpertReview[] = parsed.experts;
  const averageScore = calculateAverageScore(experts);
  const criticalExperts = getCriticalExperts(experts);

  console.log(`[Gemini-ExpertPanel] Review complete:`);
  console.log(`[Gemini-ExpertPanel] - 15 experts assembled`);
  console.log(`[Gemini-ExpertPanel] - Average score: ${averageScore}`);
  console.log(`[Gemini-ExpertPanel] - Experts below 9: ${criticalExperts.length}`);
  console.log(`[Gemini-ExpertPanel] - Interaction ID: ${interaction.id}`);

  return {
    review: {
    provider: "gemini",
    model: "deep-research-pro-preview-12-2025",
    experts,
    averageScore,
    criticalExperts,
    },
    interactionId: interaction.id,
  };
}


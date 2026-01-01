/**
 * GPT Expert Panel Review
 * 
 * Uses OpenAI function calling to get structured expert panel reviews
 */

import OpenAI from "openai";
import { withRetry } from "@/lib/utils/retry";
import {
  buildExpertPanelPrompt,
  calculateAverageScore,
  getCriticalExperts,
  validateExpertPanel,
  type ExpertPanelResult,
  type ExpertReview,
  type ExpertProfile,
} from "./expert-panel";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EXPERT_PANEL_FUNCTION = {
  name: "submit_expert_panel_review",
  description: "Submit the 15-expert panel review with ratings and feedback",
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
              description: "Expert's full name with credentials",
            },
            role: {
              type: "string",
              description: "Expert's specific area of expertise",
            },
            rating: {
              type: "number",
              description: "Rating from 1-10 (integer)",
              minimum: 1,
              maximum: 10,
            },
            priority: {
              type: "number",
              description: "How urgently this concern should be addressed (1=most critical, 5=lowest priority). Use your judgment based on impact to investment decision.",
              minimum: 1,
              maximum: 5,
            },
            theme: {
              type: "string",
              description: "Concise label (2-4 words) describing the primary focus of feedback, e.g., 'Valuation Methodology', 'Market Sizing', 'Competitive Moat'",
            },
            feedback: {
              type: "string",
              description: "Detailed, actionable feedback on the white paper",
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

export async function getGPTExpertPanel(
  whitePaper: string,
  companyName: string,
  expertProfiles: ExpertProfile[],
  model: "gpt-4o" | "o1" = "gpt-4o"
): Promise<ExpertPanelResult> {
  console.log(`[GPT-ExpertPanel] Starting review with ${model}...`);
  console.log("[GPT-ExpertPanel] White paper length:", whitePaper.length);
  console.log(`[GPT-ExpertPanel] Using ${expertProfiles.length} pre-selected expert profiles`);

  const prompt = buildExpertPanelPrompt(whitePaper, companyName, expertProfiles);

  // Use retry for rate limits
  const { result: completion, attempts } = await withRetry(
    async () => {
      return await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        tools: [
          {
            type: "function",
            function: EXPERT_PANEL_FUNCTION,
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "submit_expert_panel_review" },
        },
      });
    },
    {
      maxRetries: 5,
      initialDelayMs: 2000,
      logPrefix: `[GPT-ExpertPanel/${model}]`,
    }
  );

  console.log(`[GPT-ExpertPanel] Response received (${attempts} attempt${attempts > 1 ? 's' : ''})`);

  // Extract function call result
  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
  
  if (!toolCall || toolCall.function.name !== "submit_expert_panel_review") {
    throw new Error("GPT did not return expert panel review function call");
  }

  const result = JSON.parse(toolCall.function.arguments);
  
  // Validate the result
  validateExpertPanel(result.experts);

  const experts: ExpertReview[] = result.experts;
  const averageScore = calculateAverageScore(experts);
  const criticalExperts = getCriticalExperts(experts);

  console.log(`[GPT-ExpertPanel] Review complete:`);
  console.log(`[GPT-ExpertPanel] - 15 experts assembled`);
  console.log(`[GPT-ExpertPanel] - Average score: ${averageScore}`);
  console.log(`[GPT-ExpertPanel] - Experts below 9: ${criticalExperts.length}`);

  return {
    provider: "gpt",
    model,
    experts,
    averageScore,
    criticalExperts,
  };
}


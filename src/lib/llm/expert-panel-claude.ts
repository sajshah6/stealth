/**
 * Claude Expert Panel Review
 * 
 * Uses Anthropic's tool use to get structured expert panel reviews
 */

import Anthropic from "@anthropic-ai/sdk";
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

let client: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

const EXPERT_PANEL_TOOL = {
  name: "submit_expert_panel_review",
  description: "Submit the 15-expert panel review with ratings and feedback",
  input_schema: {
    type: "object" as const,
    properties: {
      experts: {
        type: "array",
        description: "Array of exactly 15 expert reviews",
        items: {
          type: "object",
          properties: {
            expertIndex: {
              type: "integer",
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
              type: "integer",
              description: "Rating from 1-10",
              minimum: 1,
              maximum: 10,
            },
            priority: {
              type: "integer",
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

export async function getClaudeExpertPanel(
  whitePaper: string,
  companyName: string,
  expertProfiles: ExpertProfile[],
  model: string = "claude-opus-4-20250514"
): Promise<ExpertPanelResult> {
  console.log(`[Claude-ExpertPanel] Starting review with ${model}...`);
  console.log("[Claude-ExpertPanel] White paper length:", whitePaper.length);
  console.log(`[Claude-ExpertPanel] Using ${expertProfiles.length} pre-selected expert profiles`);

  const anthropic = getAnthropicClient();
  const prompt = buildExpertPanelPrompt(whitePaper, companyName, expertProfiles);

  // Use streaming for long requests (required by Claude for >10 min operations)
  console.log("[Claude-ExpertPanel] Using streaming mode for long request...");
  
  const { result: stream, attempts } = await withRetry(
    async () => {
      return await anthropic.messages.stream({
        model,
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        tools: [EXPERT_PANEL_TOOL],
        tool_choice: {
          type: "tool",
          name: "submit_expert_panel_review",
        },
      });
    },
    {
      maxRetries: 5,
      initialDelayMs: 2000,
      logPrefix: `[Claude-ExpertPanel/${model}]`,
    }
  );

  console.log(`[Claude-ExpertPanel] Stream started (${attempts} attempt${attempts > 1 ? 's' : ''})`);
  console.log("[Claude-ExpertPanel] Waiting for completion...");

  // Wait for the stream to complete and get final message
  const message = await stream.finalMessage();

  console.log(`[Claude-ExpertPanel] Response received`);

  // Extract tool use result
  const toolUse = message.content.find((block) => block.type === "tool_use");
  
  if (!toolUse || toolUse.type !== "tool_use" || toolUse.name !== "submit_expert_panel_review") {
    throw new Error("Claude did not return expert panel review tool use");
  }

  const result = toolUse.input as { experts: ExpertReview[] };
  
  // Validate the result
  validateExpertPanel(result.experts);

  const experts: ExpertReview[] = result.experts;
  const averageScore = calculateAverageScore(experts);
  const criticalExperts = getCriticalExperts(experts);

  console.log(`[Claude-ExpertPanel] Review complete:`);
  console.log(`[Claude-ExpertPanel] - 15 experts assembled`);
  console.log(`[Claude-ExpertPanel] - Average score: ${averageScore}`);
  console.log(`[Claude-ExpertPanel] - Experts below 9: ${criticalExperts.length}`);

  return {
    provider: "claude",
    model,
    experts,
    averageScore,
    criticalExperts,
  };
}


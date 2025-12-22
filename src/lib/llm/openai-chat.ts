/**
 * OpenAI Chat Completions API helpers
 * For direct text-to-text LLM calls (not Assistants API)
 */

import OpenAI from "openai";
import { withRetry } from "@/lib/utils/retry";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Call o1 model for reasoning/analysis tasks
 * Note: o1 models don't support system messages or temperature
 */
export async function callO1(
  prompt: string,
  options: {
    model?: "o1" | "o1-mini" | "o1-2024-12-17";
    maxCompletionTokens?: number;
  } = {}
): Promise<string> {
  const { model = "o1-2024-12-17", maxCompletionTokens = 25000 } = options;

  console.log(`[OpenAI-Chat] Calling ${model}...`);
  console.log(`[OpenAI-Chat] Prompt length: ${prompt.length} characters`);

  // Use retry wrapper for rate limiting and transient failures
  const { result: response, attempts, totalTimeMs } = await withRetry(
    async () => {
      return await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: maxCompletionTokens,
      });
    },
    {
      maxRetries: 5,
      initialDelayMs: 1000,
      logPrefix: `[OpenAI-Chat/${model}]`,
    }
  );

  const result = response.choices[0]?.message?.content || "";

  console.log(`[OpenAI-Chat] Response received in ${totalTimeMs}ms (${attempts} attempt${attempts > 1 ? 's' : ''})`);
  console.log(`[OpenAI-Chat] Response length: ${result.length} characters`);
  console.log(
    `[OpenAI-Chat] Tokens used: ${response.usage?.total_tokens || "unknown"}`
  );

  return result;
}

/**
 * Call GPT-4o for general tasks
 * Supports system messages, temperature, and other parameters
 */
export async function callGPT4o(
  prompt: string,
  options: {
    systemMessage?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const {
    systemMessage = "You are a helpful AI assistant.",
    temperature = 0.3,
    maxTokens = 16000,
  } = options;

  console.log(`[OpenAI-Chat] Calling gpt-4o...`);
  console.log(`[OpenAI-Chat] Prompt length: ${prompt.length} characters`);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemMessage },
    { role: "user", content: prompt },
  ];

  // Use retry wrapper for rate limiting and transient failures
  const { result: response, attempts, totalTimeMs } = await withRetry(
    async () => {
      return await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature,
        max_tokens: maxTokens,
      });
    },
    {
      maxRetries: 5,
      initialDelayMs: 1000,
      logPrefix: "[OpenAI-Chat/gpt-4o]",
    }
  );

  const result = response.choices[0]?.message?.content || "";

  console.log(`[OpenAI-Chat] Response received in ${totalTimeMs}ms (${attempts} attempt${attempts > 1 ? 's' : ''})`);
  console.log(`[OpenAI-Chat] Response length: ${result.length} characters`);
  console.log(
    `[OpenAI-Chat] Tokens used: ${response.usage?.total_tokens || "unknown"}`
  );

  return result;
}


/**
 * Google Gemini Deep Research Integration
 * 
 * Uses Gemini's Deep Research agent to conduct thorough research
 * on open questions from the IC memo.
 */

import { GoogleGenAI } from '@google/genai';
import type { OpenQuestion } from './openai-assistant';
import { withRetry } from '@/lib/utils/retry';

// =============================================================================
// CLIENT
// =============================================================================

let client: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY environment variable is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

// =============================================================================
// DEEP RESEARCH
// =============================================================================

export interface DeepResearchResult {
  /** Full research report in markdown/text */
  researchReport: string;
  
  /** Gemini interaction ID */
  interactionId: string;
  
  /** Number of questions researched */
  questionsResearched: number;
  
  /** Research duration in milliseconds */
  researchDurationMs: number;
}

/**
 * Conduct deep research on open questions using Gemini Deep Research.
 * This will take several minutes (5-30+ minutes typical).
 * 
 * The function polls every 10 seconds until research is complete.
 */
export async function conductDeepResearch(
  openQuestions: OpenQuestion[],
  companyName: string
): Promise<DeepResearchResult> {
  console.log(`[GeminiDeepResearch] Starting research for ${openQuestions.length} questions...`);
  
  const client = getGeminiClient();
  const startTime = Date.now();
  
  // Build comprehensive research prompt
  const prompt = buildResearchPrompt(openQuestions, companyName);
  
  console.log("[GeminiDeepResearch] Creating interaction...");
  
  // Start deep research (background=true means it runs async) with retry
  const interaction = await withRetry(
    async () => {
      return await client.interactions.create({
        input: prompt,
        agent: 'deep-research-pro-preview-12-2025',
        background: true,
      });
    },
    {
      maxRetries: 3,
      initialDelayMs: 2000,
      logPrefix: "[GeminiDeepResearch/create]",
    }
  ).then(r => r.result);
  
  console.log(`[GeminiDeepResearch] Research started: ${interaction.id}`);
  console.log("[GeminiDeepResearch] Polling for completion (checks every 10s)...");
  
  // Poll until complete (no timeout - let it run as long as needed)
  let pollCount = 0;
  while (true) {
    pollCount++;
    const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
    
    console.log(
      `[GeminiDeepResearch] Poll #${pollCount} (${elapsedMinutes}m elapsed) - checking status...`
    );
    
    const result = await withRetry(
      async () => {
        return await client.interactions.get(interaction.id);
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        logPrefix: "[GeminiDeepResearch/poll]",
      }
    ).then(r => r.result);
    
    if (result.status === 'completed') {
      const durationMs = Date.now() - startTime;
      const durationMinutes = (durationMs / 60000).toFixed(1);
      
      console.log(`[GeminiDeepResearch] ✅ Research completed in ${durationMinutes} minutes`);
      
      // Check if outputs exist
      if (!result.outputs || result.outputs.length === 0) {
        throw new Error("Research completed but no outputs found");
      }
      
      // Get the final output (last item in outputs array)
      const finalOutput = result.outputs[result.outputs.length - 1];
      
      // Type guard: check if output has text property
      if (!finalOutput || !('text' in finalOutput) || typeof finalOutput.text !== 'string') {
        throw new Error("Research completed but no output text found");
      }
      
      console.log(`[GeminiDeepResearch] Report length: ${finalOutput.text.length} characters`);
      
      return {
        researchReport: finalOutput.text,
        interactionId: interaction.id,
        questionsResearched: openQuestions.length,
        researchDurationMs: durationMs,
      };
    }
    
    if (result.status === 'failed') {
      console.error(`[GeminiDeepResearch] ❌ Research failed`);
      throw new Error(`Research failed with status: ${result.status}`);
    }
    
    // Still in progress - wait 10 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

/**
 * Build the research prompt from open questions.
 */
function buildResearchPrompt(
  openQuestions: OpenQuestion[],
  companyName: string
): string {
  const questionsSection = openQuestions
    .map((q, index) => {
      return `
## Question ${index + 1}: ${q.question}

**Context:** ${q.context}

**What we know:** ${q.whatWeKnow}

**What we need to know:** ${q.whatWeNeed}

**Why this matters:** ${q.whyItMatters}

---
`;
    })
    .join('\n');

  return `You are an independent research analyst conducting comprehensive, in-depth research on the following questions.

Your task is to provide thorough, objective analysis on EACH question below. Research each topic comprehensively and provide detailed findings.

# Research Questions:

${questionsSection}

---

# RESEARCH INSTRUCTIONS:

1. **Research EACH question thoroughly and independently**
   - Provide comprehensive analysis and information
   - Find specific data, numbers, dates, and facts where relevant
   - Cover recent developments and current state
   - Include historical context when helpful

2. **For each question, provide:**
   - Direct, detailed answer to what we need to know
   - Specific data points, figures, and timelines
   - Key factors and considerations
   - Different perspectives or scenarios where applicable
   - Important caveats or uncertainties

3. **Report Structure:**
   - Executive Summary (2-3 paragraphs synthesizing key findings across all questions)
   - Detailed Findings (one comprehensive section per question)
   - Key Insights (cross-cutting themes and patterns)
   - Strategic Implications (how findings connect to decision-making)

4. **Quality Standards:**
   - Be specific and detailed - avoid vague generalities
   - Provide quantitative data where possible
   - Cover multiple angles and perspectives
   - Highlight areas of uncertainty or conflicting views
   - Use clear, accessible language

5. **Output Format:**
   - Use clear markdown formatting with headers
   - Include tables or bullet lists where helpful
   - Make findings actionable and easy to understand
   - Structure for easy reference and decision-making

Generate a comprehensive, independent research report addressing all ${openQuestions.length} questions above.`;
}


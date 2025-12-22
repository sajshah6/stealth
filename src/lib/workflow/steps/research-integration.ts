/**
 * Step 6: Research Integration & Analysis
 *
 * Analyzes the deep research report against the original IC memo
 * to identify what changed, what we learned, and how it impacts
 * the investment thesis.
 */

import { defineStep } from "../define-step";
import { callO1 } from "@/lib/llm/openai-chat";

interface ResearchIntegrationOutput {
  fullAnalysis: string;
}

/**
 * Build the prompt for o1 to analyze research impact
 */
function buildIntegrationPrompt(
  originalMemo: string,
  researchReport: string,
  companyName: string
): string {
  return `You are an expert investment analyst conducting a post-research review of an Investment Committee memo.

**CONTEXT:**
You previously wrote an IC memo for ${companyName}. Since then, a comprehensive deep research report was generated to answer open questions and validate assumptions.

**YOUR TASK:**
Analyze the research findings and determine how they impact the original investment thesis.

**Focus on:**
- What did we learn from the research?
- How does it change our views on this investment?
- What is the impact on our valuation assumptions?
- Should our recommendation change?

Be thorough and specific. Reference concrete findings from the research.

---

## ORIGINAL IC MEMO

${originalMemo}

---

## DEEP RESEARCH REPORT

${researchReport}

---

## ANALYSIS REQUIRED

Please provide a comprehensive analysis addressing:

### 1. KEY FINDINGS
What are the 5-7 most important insights from the research?
- Be specific and cite findings
- Focus on insights that materially impact the investment decision

### 2. VALUATION IMPACT
How does the research affect our valuation assumptions?
- What assumptions were validated or invalidated?
- Should our price target or valuation range change?
- Any new comparable companies or metrics to consider?

### 3. RISK UPDATES
How does the research change our risk assessment?
- Were existing risks mitigated or amplified?
- Any new risks identified?
- Should our risk rating change?

### 4. RECOMMENDATION ANALYSIS
Does the research support, challenge, or change our recommendation?
- Should we upgrade/downgrade?
- Does the investment archetype still fit?
- Any changes to portfolio positioning?

### 5. CONFIDENCE CHANGE
How does this research affect our confidence level?
- More confident, less confident, or unchanged?
- What would increase confidence further?
- What are remaining uncertainties?

---

## OUTPUT FORMAT

Structure your response with clear headers for each section above. Be thorough and specific. Reference actual data points from the research.

Start your analysis now:`;
}

export const researchIntegrationStep = defineStep({
  key: "research_integration",
  name: "Research Integration & Analysis",
  description: "Analyze how deep research findings impact the investment thesis",
  
  inputFrom: ["ic_memo", "deep_research"],
  
  llm: {
    provider: "openai",
    model: "o1-2024-12-17",
  },

  async execute({ projectId, context, inputs }) {
    console.log("[ResearchIntegration] Starting analysis...");
    console.log("[ResearchIntegration] Project:", projectId);

    // Extract inputs
    const icMemo = inputs.ic_memo as {
      memoMarkdown: string;
      archetype?: { primary: string; secondary: string[] };
    } | undefined;

    const deepResearch = inputs.deep_research as {
      researchReport: string;
      companyName: string;
    } | undefined;

    if (!icMemo?.memoMarkdown) {
      throw new Error("IC memo not found in inputs");
    }

    if (!deepResearch?.researchReport) {
      throw new Error("Deep research report not found in inputs");
    }

    console.log("[ResearchIntegration] IC memo length:", icMemo.memoMarkdown.length);
    console.log("[ResearchIntegration] Research report length:", deepResearch.researchReport.length);

    // Build prompt
    const prompt = buildIntegrationPrompt(
      icMemo.memoMarkdown,
      deepResearch.researchReport,
      deepResearch.companyName
    );

    console.log("[ResearchIntegration] Calling o1 model (this may take 30-60 seconds)...");

    // Call o1 for deep analysis
    const analysisText = await callO1(prompt, {
      maxCompletionTokens: 10000, // Allow for detailed analysis
    });

    console.log("[ResearchIntegration] Analysis completed");
    console.log("[ResearchIntegration] Analysis length:", analysisText.length);

    // Store the full analysis text - no extraction needed
    const output: ResearchIntegrationOutput = {
      fullAnalysis: analysisText,
    };

    return {
      status: "completed" as const,
      output,
    };
  },
});


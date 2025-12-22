/**
 * Step 7: Final Audited IC Memo
 *
 * Generates the comprehensive, final IC memo incorporating all research findings.
 * This is the definitive investment document with maximum detail.
 */

import { defineStep } from "../define-step";
import { callO1 } from "@/lib/llm/openai-chat";

interface FinalICMemoOutput {
  finalMemoMarkdown: string;
  recommendation: "buy" | "sell" | "hold" | "ask";
  confidence: "high" | "medium" | "low";
  sectionsIncluded: string[];
  changesSummary: string;
}

/**
 * Build the prompt for o1 to generate the final, audited IC memo
 */
function buildFinalMemoPrompt(
  originalMemo: string,
  researchReport: string,
  integrationAnalysis: string,
  companyName: string
): string {
  return `You are an expert investment analyst preparing the FINAL, AUDITED Investment Committee memo for ${companyName}.

**CONTEXT:**
1. You previously wrote a preliminary IC memo
2. Deep research was conducted to answer open questions and validate assumptions
3. An integration analysis assessed how research impacts the thesis
4. NOW: You must produce the definitive, final IC memo

**CRITICAL REQUIREMENTS:**
- Use the EXACT SAME FORMAT as the original memo (same 13 sections, same structure)
- INCORPORATE all research findings and integration insights
- UPDATE valuations, risks, and recommendations based on new information
- DETAIL IS YOUR FRIEND - be comprehensive and thorough (3,000-5,000 words minimum)
- Do NOT skip sections or use placeholders like "TBD"
- This is the final memo that will be presented to the Investment Committee

---

## ORIGINAL IC MEMO

${originalMemo}

---

## DEEP RESEARCH REPORT

${researchReport}

---

## INTEGRATION ANALYSIS

${integrationAnalysis}

---

## YOUR TASK: GENERATE FINAL AUDITED IC MEMO

Write the complete, final IC memo following the EXACT SAME STRUCTURE as the original memo.

Use the Deal Evaluator v2 — Instruction v5.3 format with ALL 13 SECTIONS:

**Section 0: Purpose & Canon**
**Section 1: Non-Negotiables**
**Section 2: Evidence**
**Section 3: Page-1 — Executive Summary**
- "In Plain English" box with 3-5 bullets
- Summary Block (Model, Float/ADV, Valuation Tiles, SBC/Dilution, Top-3 Risks)
- Recommendation (⬆️ Proceed | ⚠️ Ask | ⛔ Pass with Primary/Secondary archetype)
- Chain-of-Thought (2-3 sentences)
- Null (single fact that would falsify)
- Breakpoint (metric/level for review/exit)

**Section 4: Strategy** (~1 full page)
- Business/monetization explainer
- Capability map
- Comps rationale

**Section 5: Operator/Manager Assessment**
- Capital allocation history
- Customer trust signals
- Red-flag thresholds

**Section 6: Risk & Downside**
- Base/Bear/Bull cases with specific numbers
- Concentration risk
- Pricing power durability
- Margin tree analysis

**Section 7: Portfolio Fit**
- Role label (archetype)
- Concentration vs house caps
- Tax/estate considerations
- Sector exposure check (≤25%)
- Single issuer check (≤3% MV)

**Section 8: Open Questions** (6-10 items, 7-field format each)
- Context
- What we know
- What we need
- Why it matters
- Source path
- Owner
- Due date

**Section 9: Quarterly Dashboard** (≥6 rows)
- NRR, CAC Payback, FCF Margin, Win-Rate (or relevant metrics)
- Include archetype-specific KPIs
- Use PF9 table format with trends/priorities

**Section 10: Governance & Verification**
**Section 11: Outputs & Workflow**
**Section 12: Minimal Ops Checklist**

---

## HOW TO INCORPORATE RESEARCH:

1. **Update Valuation** - Reflect new assumptions, comparables, or price targets from research
2. **Refine Risk Assessment** - Add/remove/modify risks based on research findings
3. **Strengthen Evidence** - Add citations and data points from research report
4. **Resolve Open Questions** - If research answered previous open questions, incorporate findings and remove or replace them
5. **Adjust Recommendation** - If integration analysis suggests upgrade/downgrade, reflect that
6. **Update Confidence** - Reflect increased/decreased confidence based on research validation

---

## DEPTH REQUIREMENTS:

- Minimum 3,000 words (be comprehensive like a senior analyst)
- ≥10 distinct citations across the memo
- 6-10 Open Questions using full 7-field format
- ≥6 Dashboard rows with metrics, values, trends
- Specific numbers from original documents AND research (no "TBD")
- Base/Bear/Bull scenarios with updated valuations
- All 13 sections in full depth

---

## OUTPUT FORMAT:

Write the full IC memo as markdown text. At the very END, add this metadata section:

---
## MEMO METADATA (for system parsing)

**Recommendation**: [proceed/ask/pass]
**Confidence**: [high/medium/low]
**Primary Archetype**: [archetype name]
**Secondary Archetypes**: [list]

### Key Metrics
| Metric | Value | Source |
|--------|-------|--------|
| [metric] | [value] | [source] |

### Dashboard Items
| Metric | Value | Trend | Priority |
|--------|-------|-------|----------|
| [metric] | [value] | [up/down/flat] | [yes/no] |
---

**NOW BEGIN WRITING THE FULL, FINAL IC MEMO FOR ${companyName}.**

Use the same format as the original. Incorporate all research findings. Be comprehensive. Write every section in full depth.`;
}

export const finalICMemoStep = defineStep({
  key: "final_ic_memo",
  name: "Final Audited IC Memo",
  description: "Generate the comprehensive, final IC memo with all research incorporated",
  
  inputFrom: ["ic_memo", "deep_research", "research_integration"],
  
  llm: {
    provider: "openai",
    model: "o1-2024-12-17",
  },

  async execute({ projectId, context, inputs }) {
    console.log("[FinalICMemo] Starting final memo generation...");
    console.log("[FinalICMemo] Project:", projectId);

    // Extract inputs
    const icMemo = inputs.ic_memo as {
      memoMarkdown: string;
    } | undefined;

    const deepResearch = inputs.deep_research as {
      researchReport: string;
      companyName: string;
    } | undefined;

    const integration = inputs.research_integration as {
      fullAnalysis: string;
    } | undefined;

    if (!icMemo?.memoMarkdown) {
      throw new Error("IC memo not found in inputs");
    }

    if (!deepResearch?.researchReport) {
      throw new Error("Deep research report not found in inputs");
    }

    if (!integration?.fullAnalysis) {
      throw new Error("Research integration analysis not found in inputs");
    }

    console.log("[FinalICMemo] Original memo length:", icMemo.memoMarkdown.length);
    console.log("[FinalICMemo] Research report length:", deepResearch.researchReport.length);
    console.log("[FinalICMemo] Integration analysis length:", integration.fullAnalysis.length);

    // Build prompt
    const prompt = buildFinalMemoPrompt(
      icMemo.memoMarkdown,
      deepResearch.researchReport,
      integration.fullAnalysis,
      deepResearch.companyName
    );

    console.log("[FinalICMemo] Calling o1 model (this may take 60-120 seconds for detailed output)...");
    console.log("[FinalICMemo] Prompt length:", prompt.length, "characters");

    // Call o1 for comprehensive memo generation
    const finalMemoText = await callO1(prompt, {
      maxCompletionTokens: 30000, // Allow for very detailed output
    });

    console.log("[FinalICMemo] Final memo generated");
    console.log("[FinalICMemo] Final memo length:", finalMemoText.length, "characters");

    // Parse metadata from the memo
    const metadata = parseMetadataFromMemo(finalMemoText);

    // Audit: Check for required sections
    const requiredSections = [
      "Executive Summary",
      "Strategy",
      "Operator/Manager Assessment",
      "Risk & Downside",
      "Portfolio Fit",
    ];

    const sectionsIncluded: string[] = [];
    for (const section of requiredSections) {
      if (finalMemoText.toLowerCase().includes(section.toLowerCase())) {
        sectionsIncluded.push(section);
      } else {
        console.warn(`[FinalICMemo] WARNING: Section "${section}" may be missing from final memo`);
      }
    }

    console.log("[FinalICMemo] Sections audited:", sectionsIncluded.length, "/", requiredSections.length);

    // Generate changes summary
    const changesSummary = generateChangesSummary(integration.fullAnalysis);

    const output: FinalICMemoOutput = {
      finalMemoMarkdown: finalMemoText,
      recommendation: metadata.recommendation || "ask",
      confidence: metadata.confidence || "medium",
      sectionsIncluded,
      changesSummary,
    };

    console.log("[FinalICMemo] Recommendation:", output.recommendation);
    console.log("[FinalICMemo] Confidence:", output.confidence);

    return {
      status: "completed" as const,
      output,
    };
  },
});

/**
 * Parse metadata from the memo markdown
 */
function parseMetadataFromMemo(markdown: string): {
  recommendation?: "buy" | "sell" | "hold" | "ask";
  confidence?: "high" | "medium" | "low";
} {
  const result: {
    recommendation?: "buy" | "sell" | "hold" | "ask";
    confidence?: "high" | "medium" | "low";
  } = {};

  // Look for metadata section
  const metadataMatch = markdown.match(/MEMO METADATA[\s\S]*?---/i);
  if (!metadataMatch) {
    console.warn("[FinalICMemo] Could not find MEMO METADATA section");
    return result;
  }

  const metadataText = metadataMatch[0];

  // Extract recommendation
  const recMatch = metadataText.match(/Recommendation:\s*(buy|sell|hold|ask)/i);
  if (recMatch) {
    result.recommendation = recMatch[1].toLowerCase() as "buy" | "sell" | "hold" | "ask";
  }

  // Extract confidence
  const confMatch = metadataText.match(/Confidence:\s*(high|medium|low)/i);
  if (confMatch) {
    result.confidence = confMatch[1].toLowerCase() as "high" | "medium" | "low";
  }

  return result;
}

/**
 * Generate a summary of changes from the integration analysis
 */
function generateChangesSummary(integrationAnalysis: string): string {
  // Extract the first few key findings as a summary
  const lines = integrationAnalysis.split("\n").filter((line) => line.trim());
  const summaryLines: string[] = [];

  for (const line of lines) {
    if (/^[-*+]\s/.test(line.trim()) || /^\d+\.\s/.test(line.trim())) {
      summaryLines.push(line.trim().replace(/^[-*+]\s/, "").replace(/^\d+\.\s/, ""));
      if (summaryLines.length >= 3) break;
    }
  }

  return summaryLines.length > 0
    ? summaryLines.join("; ")
    : "Research findings incorporated into final memo.";
}


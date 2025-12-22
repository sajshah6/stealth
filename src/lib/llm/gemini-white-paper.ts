/**
 * Google Gemini Deep Research for White Paper Generation
 * 
 * Uses the Deep Revision framework to transform an IC memo
 * into a decision-ready white paper.
 */

import { GoogleGenAI } from '@google/genai';
import { withRetry } from '@/lib/utils/retry';

// Reuse client from gemini-deep-research
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

export interface WhitePaperResult {
  /** The generated white paper in markdown/text */
  whitePaper: string;
  
  /** Gemini interaction ID */
  interactionId: string;
  
  /** Research duration in milliseconds */
  durationMs: number;
}

/**
 * Generate a white paper from an IC memo using Gemini Deep Research
 * with the Deep Revision framework.
 * 
 * This will take 10-30+ minutes.
 */
export async function generateWhitePaper(
  icMemo: string,
  companyName: string
): Promise<WhitePaperResult> {
  console.log(`[GeminiWhitePaper] Starting white paper generation for ${companyName}...`);
  
  const client = getGeminiClient();
  const startTime = Date.now();
  
  // Build the deep revision prompt
  const prompt = buildDeepRevisionPrompt(icMemo, companyName);
  
  console.log("[GeminiWhitePaper] Creating interaction...");
  
  // Start deep research with revision framework (NEW interaction)
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
      logPrefix: "[GeminiWhitePaper/create]",
    }
  ).then(r => r.result);
  
  console.log(`[GeminiWhitePaper] White paper generation started: ${interaction.id}`);
  console.log("[GeminiWhitePaper] Polling for completion (checks every 10s)...");
  
  // Poll until complete (no timeout - let it run as long as needed)
  let pollCount = 0;
  while (true) {
    pollCount++;
    const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
    
    console.log(
      `[GeminiWhitePaper] Poll #${pollCount} (${elapsedMinutes}m elapsed) - checking status...`
    );
    
    const result = await withRetry(
      async () => {
        return await client.interactions.get(interaction.id);
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        logPrefix: "[GeminiWhitePaper/poll]",
      }
    ).then(r => r.result);
    
    if (result.status === 'completed') {
      const durationMs = Date.now() - startTime;
      const durationMinutes = (durationMs / 60000).toFixed(1);
      
      console.log(`[GeminiWhitePaper] ✅ White paper completed in ${durationMinutes} minutes`);
      
      // Check if outputs exist
      if (!result.outputs || result.outputs.length === 0) {
        throw new Error("White paper generation completed but no outputs found");
      }
      
      // Get the final output (last item in outputs array)
      const finalOutput = result.outputs[result.outputs.length - 1];
      
      // Type guard: check if output has text property
      if (!finalOutput || !('text' in finalOutput) || typeof finalOutput.text !== 'string') {
        throw new Error("White paper generation completed but no output text found");
      }
      
      console.log(`[GeminiWhitePaper] White paper length: ${finalOutput.text.length} characters`);
      
      return {
        whitePaper: finalOutput.text,
        interactionId: interaction.id,
        durationMs,
      };
    }
    
    if (result.status === 'failed') {
      console.error(`[GeminiWhitePaper] ❌ White paper generation failed`);
      throw new Error(`White paper generation failed with status: ${result.status}`);
    }
    
    // Still in progress - wait 10 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

/**
 * Build the Deep Revision framework prompt
 */
function buildDeepRevisionPrompt(icMemo: string, companyName: string): string {
  return `# Initial Revisions - Deep Revision Framework

## Mandate

Produce a decision-ready white paper from the article_in_question.

Apply full analytical rigor, stress-test the thesis (including sensitivity analysis), fix what's broken (no quotas), and document remaining unknowns as actionable open questions.

**Facts Lock:** All checks and sources are current as of today (America/Chicago).

---

## 🧾 Inputs

**article_in_question:**
${icMemo}

**audience_in_question:** Investment Committee

**audience_knowledge_level:** Expert

**stakeholder_decision_makers:** IC Chair, CFO, Portfolio Managers

**purpose / decision_to_enable:** Investment decision approval

**stakes_of_failure:** Mispriced risk, missed opportunity, poor capital allocation

**document_type_calibration:** Academic/Technical - IC-grade rigor

**audience_mode_toggle:** IC-grade precision

**deadline / urgency:** Immediate

**revision_scope:** Deep Revision (full framework)

**iteration_marker:** v1.0 (final white paper)

**user_role:** Final Approver

**facts_lock:** TODAY (America/Chicago)

---

## ⚙️ Operating Principles

1. **Decision orientation:** Every edit must advance the investment decision.
2. **As-of-today discipline:** Verify all claims vs. current facts.
3. **No quotas:** Minimal necessary intervention.
4. **Explicit uncertainty:** Mark Unproven + give verification path.
5. **Bias control:** Track and mitigate (see Bias Audit).
6. **Audience calibration:** Decode jargon; align tone to IC-grade precision.

---

## 🔧 Execution Workflow

Execute the following in sequence:

1. **Diagnostic Summary** - Assess overall viability and severity of required changes
2. **Fact-Check & Evidence Triangulation** - Verify all claims against current sources
3. **Expert Panel + Calibration** - Synthesize expert perspectives and resolve biases
4. **Structure & Clarity Audit** - Optimize flow and logic
5. **Narrative & Visuals** - Strengthen engagement and comprehension
6. **Stress-Test & Decision Impact** - Apply sensitivity analysis and pre-mortem
7. **Key Edits & Rewrites** - Implement critical changes
8. **Open Questions & Research Plan** - Document remaining unknowns
9. **Sources & Bias Audit** - Complete bibliography and bias check
10. **Package / Export** - Finalize version with change-log

---

## ♟️ Concept Genesis (anchor)

- **Thesis / Central Question:** Should we invest in ${companyName}?
- **Reader Tension / Why Now:** Investment decision pending; market timing critical
- **Desired Reader Action:** Approve/reject investment with full risk awareness
- **One-Sentence Through-Line:** [Extract from IC memo]

---

## 👥 Expert Panel + Calibration

Create a table with the following experts and synthesize their perspectives:

| Expert | Role | Why Selected | Bias Risk | Weight | Confidence |
|--------|------|--------------|-----------|--------|------------|
| Industry Analyst | Sector expertise | Deep domain knowledge | Bullish bias | High | High |
| Risk Manager | Downside analysis | Conservative view | Pessimistic bias | High | Medium |
| Financial Auditor | Numbers verification | Quantitative rigor | Data-only bias | Medium | High |
| Market Strategist | Timing & positioning | Market context | Momentum bias | Medium | Medium |

**Synthesis:** Identify convergences, disagreements (+ why), missing evidence, and minimum edit set.

**Bias Resolution Note:** Changes made after Devil's Advocate review.

---

## 🩺 Diagnostic Summary (today)

- **Verdict:** Fit / Partial / Not yet viable
- **Severity of change:** Minor / Major / Full rewrite (+ why)
- **Top failure modes:** (one-liners)
- **Key leverage points for impact:**
- **Publication Gate:** Fail if 🟥 Critical or High-Risk Open Question unresolved.

---

## ✅ Fact-Check & Evidence Log (as of today)

Create a table verifying all major claims:

| Claim | Status (True / Needs Fix / Unproven) | Corrected Wording | Primary Source (URL + page) | Notes |

**Evidence Triangulation:** Convergence check → quality ladder → conflict resolution.

---

## 🧩 Clarity & Flow (surgical)

- Reorder / merge / split for logic
- **Transitions:** Score Weak / OK / Strong
- **Line-edits:** Before → After → Why
- **Argument Spine Map:** Visualize section support to through-line

---

## 🧱 Completeness & Relevance

| Missing / Redundant | Why It Matters | Level (1-3) | Source(s) | Drop-in Edit |

**Levels:** 1 = must-have; 2 = strengthens; 3 = context.

---

## 🎨 Narrative & Engagement (+ Visuals)

- **Hooks (2):** With stakes/contrast
- **Refined through-line:** (1 sentence)
- **Visual exhibits (2–4):** Title = takeaway + narration

---

## 🔄 Stress-Test / Pre-Mortem (+ Sensitivity Analysis)

- **Steelman counter-argument:** (robust opposition)
- **Fragile assumptions (1–3):** → Vulnerability map
- **Pre-mortem:** 3 plausible failure modes
- **Required fortifications:** Data / framing fixes
- **Sensitivity Analysis:** Test key variables ±10–20%; document elasticities and inflection points

---

## 🎯 Decision Impact Matrix

| Finding | If True → Impact | If False → Impact | Confidence (L/M/H) | Priority (1-5) |

---

## 🧮 Key Edits & Rebuild Plan

Prioritized list:
- 🟥 Critical
- 🟧 Important
- 🟩 Polish

(+ owners / due dates if known)

---

## ✍️ Polished Rewrites

Provide paste-ready sections only where needed (keep voice unless unclear).

---

## 🔍 Open Questions Log (required if gaps remain)

| # | Context | Why It Matters | What We Know | What We Want to Know | Decision Risk | Rigor Standard | Sources to Explore | Owner / Path | Target Date | Notes |

---

## 📚 Source Appendix

- Primary vs Secondary with URL + page + access date = today

---

## ⚖️ Systematic Bias Audit

Check for:
- Selection / Survivorship / Recency / Confirmation / Funding biases

**Devil's Advocate:** Record changes made.

---

## 📄 Packaging & Export

- **Version / Change-log:** v1.0 ${new Date().toISOString().split('T')[0]} — Final White Paper
- **Plain-English Summary:** (≤ 120 words)
- **Ensure:** Numbered exhibits + citations

---

## 📌 Footer (Execution Behavior)

**Run Deep Revision:**
1. Build Expert Panel
2. Fact-Check
3. Clarity Surgery
4. Narrative + Visuals
5. Stress-Test (+ Sensitivity)
6. Decision Matrix
7. Edits + Rewrites
8. Open Questions
9. Bias Audit
10. Package

**Mark Unproven claims + exact verification path. No hedging.**

---

# YOUR TASK:

Execute the full Deep Revision framework on the IC memo for **${companyName}** provided above.

Generate a comprehensive, decision-ready white paper that:
1. Maintains all analytical rigor from the IC memo
2. Stress-tests the investment thesis
3. Includes sensitivity analysis on key assumptions
4. Documents all remaining uncertainties as actionable open questions
5. Provides a clear investment recommendation

Begin the deep revision process now.`;
}


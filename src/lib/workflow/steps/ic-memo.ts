/**
 * IC Memo Generation Step
 * 
 * Generates the full Investment Committee memo using:
 * - The initial analysis
 * - The selected/determined archetype
 * - The Deal Evaluator v5.3 framework
 * 
 * Uses the same assistant thread to maintain context.
 */

import { defineStep } from "../define-step";
import { addMessage, runAssistant, deleteFiles, type MemoOutput } from "@/lib/llm";
import type { InitialAnalysisOutput } from "./initial-analysis";
import type { ArchetypeSelectionOutput } from "./archetype-selection";
import { withRetry } from "@/lib/utils/retry";

// =============================================================================
// OUTPUT TYPE
// =============================================================================

export interface ICMemoOutput {
  /** Investment recommendation */
  recommendation: "proceed" | "ask" | "pass";
  
  /** Confidence level */
  confidence: "high" | "medium" | "low";
  
  /** The archetype used for framing */
  archetype: {
    primary: string;
    secondary: string[];
  };
  
  /** The full memo in markdown format */
  memoMarkdown: string;
  
  /** Key metrics extracted */
  keyMetrics: Record<string, string>;
  
  /** Open questions for further research */
  openQuestions: Array<{
    question: string;
    context: string;
    owner?: string;
  }>;
  
  /** Dashboard items for tracking */
  dashboardItems: Array<{
    metric: string;
    value: string;
    trend?: "up" | "down" | "flat";
    priority?: boolean;
  }>;
}

// =============================================================================
// STEP DEFINITION
// =============================================================================

export const icMemoStep = defineStep<
  {
    initial_analysis: InitialAnalysisOutput;
    archetype_selection: ArchetypeSelectionOutput;
  },
  ICMemoOutput
>({
  key: "ic_memo",
  name: "IC Memo Generation",
  description: "Generate the Investment Committee memo using Deal Evaluator framework",
  
  llm: {
    provider: "openai",
    model: "gpt-4o", // Using gpt-4o for better instruction following
  },
  
  inputFrom: ["initial_analysis", "archetype_selection"],
  
  mayRequireUserInput: false,
  
  async execute({ inputs }) {
    console.log("[ICMemo] Starting execution...");
    console.log("[ICMemo] Inputs available:", Object.keys(inputs));
    
    const { initial_analysis, archetype_selection } = inputs;

    // Get thread info from initial analysis output
    const { threadId, assistantId } = initial_analysis;
    console.log("[ICMemo] Thread ID:", threadId);
    console.log("[ICMemo] Assistant ID:", assistantId);
    console.log("[ICMemo] Archetype selection:", archetype_selection);

    if (!threadId || !assistantId) {
      return {
        status: "failed",
        error: "No assistant thread context found from initial analysis",
      };
    }

    // Handle missing archetype_selection - derive from initial_analysis
    let effectiveArchetypeSelection = archetype_selection;
    if (!archetype_selection || !archetype_selection.archetype) {
      console.log("[ICMemo] No archetype_selection found, deriving from initial_analysis...");
      
      // Check if user selected options directly on initial_analysis
      const userSelectedIds = initial_analysis.userSelectedOptionIds;
      if (userSelectedIds && userSelectedIds.length > 0 && initial_analysis.archetypeOptions) {
        const selectedOption = initial_analysis.archetypeOptions.find(
          (opt: { id: string }) => userSelectedIds.includes(opt.id)
        );
        if (selectedOption) {
          effectiveArchetypeSelection = {
            archetype: {
              primary: selectedOption.primary,
              secondary: selectedOption.secondary,
            },
            source: "user_selected" as const,
            selectedOptionIds: userSelectedIds,
          };
          console.log("[ICMemo] Derived archetype from user selection:", effectiveArchetypeSelection);
        }
      }
      
      // Fall back to determined archetype if available
      if (!effectiveArchetypeSelection && initial_analysis.determinedArchetype) {
        effectiveArchetypeSelection = {
          archetype: {
            primary: initial_analysis.determinedArchetype.primary,
            secondary: initial_analysis.determinedArchetype.secondary,
          },
          source: "auto_determined" as const,
        };
        console.log("[ICMemo] Using auto-determined archetype:", effectiveArchetypeSelection);
      }
      
      // Last resort - use first archetype option
      if (!effectiveArchetypeSelection && initial_analysis.archetypeOptions?.[0]) {
        const firstOption = initial_analysis.archetypeOptions[0];
        effectiveArchetypeSelection = {
          archetype: {
            primary: firstOption.primary,
            secondary: firstOption.secondary,
          },
          source: "auto_determined" as const,
        };
        console.log("[ICMemo] Falling back to first archetype option:", effectiveArchetypeSelection);
      }
    }

    if (!effectiveArchetypeSelection?.archetype) {
      return {
        status: "failed",
        error: "Could not determine archetype for memo generation",
      };
    }

    try {
      // Build the memo generation prompt
      const memoPrompt = buildMemoPrompt(initial_analysis, effectiveArchetypeSelection);

      // Re-attach files to ensure file_search can access them
      const fileIds = initial_analysis.openaiFileIds || [];
      console.log("[ICMemo] Re-attaching", fileIds.length, "files for file_search");
      
      // Add message to existing thread WITH files for file_search
      await addMessage(threadId, memoPrompt, fileIds);

      // Run assistant to generate memo with retry for rate limits
      console.log("[ICMemo] Generating IC memo with file_search enabled...");
      const { result, attempts } = await withRetry(
        async () => await runAssistant(threadId, assistantId),
        {
          maxRetries: 5,
          initialDelayMs: 2000,
          maxDelayMs: 120000, // 2 minutes max wait
          logPrefix: "[ICMemo/runAssistant]",
        }
      );
      console.log(`[ICMemo] Assistant completed (${attempts} attempt${attempts > 1 ? 's' : ''})`);

      // Handle text response (preferred path - full memo as markdown)
      if (result.type === "text") {
        console.log("[ICMemo] Received full memo as text (" + result.text.length + " characters)");
        
        // Validate memo has all required sections
        const requiredSections = [
          "0) Purpose & Canon",
          "1) Non-Negotiables", 
          "3) Page-1",
          "4) Strategy",
          "5) Operator",
          "6) Risk & Downside",
          "8) Open Questions",
          "9) Quarterly Dashboard",
          "12) Minimal Ops Checklist"
        ];
        
        const missingSections = requiredSections.filter(
          section => !result.text.includes(section)
        );
        
        if (missingSections.length > 0) {
          console.warn(
            "[ICMemo] WARNING: Memo is missing sections:",
            missingSections.join(", ")
          );
        }
        
        // Parse metadata from the end of the memo
        const metadata = parseMetadataFromMemo(result.text);
        
        // Validate metadata was parsed
        if (!metadata.recommendation) {
          console.warn("[ICMemo] WARNING: Failed to parse recommendation from memo");
        }
        if (!metadata.keyMetrics || Object.keys(metadata.keyMetrics).length === 0) {
          console.warn("[ICMemo] WARNING: No key metrics found in memo metadata");
        }
        if (!metadata.dashboardItems || metadata.dashboardItems.length === 0) {
          console.warn("[ICMemo] WARNING: No dashboard items found in memo metadata");
        }
        
        return {
          status: "completed",
          output: {
            recommendation: metadata.recommendation || "ask",
            confidence: metadata.confidence || "medium",
            archetype: effectiveArchetypeSelection.archetype,
            memoMarkdown: result.text,
            keyMetrics: metadata.keyMetrics || {},
            openQuestions: metadata.openQuestions || [],
            dashboardItems: metadata.dashboardItems || [],
          },
          metadata: {
            llmModel: "gpt-4o",
            tokensUsed: result.tokensUsed,
          },
        };
      }

      // Fallback to function call response (for backwards compatibility)
      if (result.type !== "memo") {
        return {
          status: "failed",
          error: "Assistant did not return memo output",
        };
      }

      const memo: MemoOutput = result.output;
      console.log("[ICMemo] Received memo via function call (legacy path)");

      // Clean up OpenAI files now that we're done with the assistant
      if (initial_analysis.openaiFileIds && initial_analysis.openaiFileIds.length > 0) {
        console.log("Cleaning up files from OpenAI...");
        try {
          await deleteFiles(initial_analysis.openaiFileIds);
        } catch (cleanupErr) {
          console.error("Failed to clean up OpenAI files:", cleanupErr);
          // Don't fail the step if cleanup fails
        }
      }

      return {
        status: "completed",
        output: {
          recommendation: memo.recommendation,
          confidence: memo.confidence,
          archetype: memo.archetype,
          memoMarkdown: memo.memoMarkdown,
          keyMetrics: memo.keyMetrics,
          openQuestions: memo.openQuestions,
          dashboardItems: memo.dashboardItems,
        },
        metadata: {
          llmModel: "gpt-4o",
          tokensUsed: result.tokensUsed,
        },
      };

    } catch (err) {
      return {
        status: "failed",
        error: err instanceof Error ? err.message : "Memo generation failed",
      };
    }
  },
});

// =============================================================================
// HELPERS
// =============================================================================

function buildMemoPrompt(
  analysis: InitialAnalysisOutput,
  archetype: ArchetypeSelectionOutput
): string {
  const archetypeInfo = archetype.source === "user_selected"
    ? `User selected archetype(s): ${archetype.selectedOptionIds?.join(", ")}`
    : "Auto-determined based on clear investment thesis";

  return `# CRITICAL INSTRUCTIONS - READ FIRST

You are writing a comprehensive, multi-page Investment Committee memo. This is NOT a summary - it is a FULL, DETAILED analysis.

**YOU MUST WRITE ALL 13 SECTIONS (0 through 12) IN COMPLETE DETAIL:**
- Section 0: Purpose & Canon
- Section 1: Non-Negotiables  
- Section 2: Evidence
- Section 3: Page-1 — Executive Summary (with "In Plain English" box)
- Section 4: Strategy (~1 full page)
- Section 5: Operator/Manager Assessment
- Section 6: Risk & Downside (with Base/Bear/Bull cases)
- Section 7: Portfolio Fit
- Section 8: Open Questions (6-10 items, full 7-field format)
- Section 9: Quarterly Dashboard (≥6 rows)
- Section 10: Governance & Verification
- Section 11: Outputs & Workflow
- Section 12: Minimal Ops Checklist

**LENGTH REQUIREMENT**: Your memo should be 3,000-5,000 words minimum. Be comprehensive like a senior analyst.

**NO SHORTCUTS**: Do not skip sections. Do not summarize. Write every section in full depth with specific numbers from the documents.

---

## Context for This Memo
- **Company/Asset**: ${analysis.companyName}
- **Asset Type**: ${analysis.assetType}
- **Primary Archetype**: ${archetype.archetype.primary}
- **Secondary Archetype(s)**: ${archetype.archetype.secondary.join(", ") || "None"}
- **Archetype Source**: ${archetypeInfo}

---

# Deal Evaluator v2 — Instruction v5.3

Owner: IC Chair • Tracks: Equity/Company, Fund/Vehicle, Bonds/Fixed Income

**Plain English & Visuals (mandatory)**. Explain-it box: Page-1 must include a "In Plain English (Key Takeaways)" callout with 3–5 bullets any non-specialist can understand. Acronym rule: On first use, spell it out in the text (e.g., "free cash flow (FCF)"). Icons: Use PF6 archetype/role icons on Page-1; repeat as chips in Dashboard. Visual standard: Use the PF9 table for the dashboard; include 1–3 micro-charts on Page-1. Quality gate: IC packet is not acceptable if any of the above elements are missing.

## 0) Purpose & Canon

Answer-first, evidence-based IC memos. Core = what/when; Project Files (PF) = how/details. PF index: [PF1] Equity sample — Airbnb (ABNB); [PF2] Fund/RE sample — Alpha Senior Housing; [PF3] Bonds sample — MAIN 2026s; [PF4] IC Diligence Setup (Team/Experts, MNPI/AI hygiene); [PF5] Operator Manual v2 (+ VC addendum); [PF6] Archetype Library; [PF7] Evidence Protocol; [PF8] Red Flags & Actions; [PF9] Dashboard Scaffold. Link syntax: cite methods as per [PF# §Section.Tag] (e.g., per [PF3 §Bond.Math.SectorFloor]).

## 1) Non-Negotiables

- **Team**: Assign Diligence Team + Expert Panel per [PF4]; log whose input shifted the view.
- **Two-source rule**: Non-obvious claims need ≥2 independent sources or are labeled operator-provided (unaudited).
- **As-of discipline**: All Page-1 numbers show As of: DATE • TIME • TZ (CT + local if needed).
- **Order**: Summary → Recommendation → Strategy → Operator/Manager → Risk → Portfolio Fit → Open Qs → Dashboard → Governance → Ops Checklist.
- **No placeholders**: If missing, omit and add to Open Qs (owner + due date).

### Depth Gates (anti-terse)

- **Exhibits**: ≥3 (valuation/comp; benchmark; risk/shock).
- **Open Qs**: 6–10 items using Context → What we know → What we need → Why it matters → Source path → Owner → Due date.
- **Citations**: ≥10 distinct sources across the memo.
- **Dashboard rows**: ≥6 incl. 1–3 ⭐ priorities and ⚑ decision flags.
- **Bonds (if applicable)**: pricing provenance (2 quotes or TRACE) + TCA, DV01/SDV01, OAS vs Sector Floor per [PF3 §Bond.Math].
- **Funds/RE (if applicable)**: DPI@Yr-4 and NAV aging table per [PF2 §Page1.DealSummary].
- **Archetypes**: choose 1 Primary (Structure Play | Alpha Bet) + ≤2 Secondary per [PF6 §1–4]; show badge metrics on Page-1 and wire to Dashboard.

## 2) Evidence

Accepted sources: filings/rating reports 🔎, benchmarks 📊, LinkedIn/Glassdoor 👥, Similarweb 🌐, G2/Trustpilot/App Store 💬, legal/LPA ⚖️, tax/regulatory 🧾. Full protocol per [PF7].

## 3) Page-1 — Executive Summary (one screen)

**Summary Block (match PF layout)**:
- Equity: fields per [PF1 §Page1.Fields] (model, float/ADV, valuation tiles, SBC/dilution, Top-3 risks).
- Fund/RE: fields per [PF2 §Page1.Fields] (structure, fees/waterfall, NAV age, liquidity/gates, DPI velocity).
- Bonds: fields per [PF3 §Page1.Fields] (CUSIP, YTW/call, OAS, duration/convexity, protections, Liquidity Tier, tax flags).
- Funds/RE Deal Summary table per [PF2 §Page1.DealSummary] (includes Tax form / IRA / UBTI).

**Recommendation (mandatory format)**: ⬆️ Proceed | ⚠️ Ask | ⛔ Pass — [Primary: Structure Play | Alpha Bet] — [≤2 Secondary per PF6] — Upside: … • Risk: …

**Chain-of-Thought (2–3 sentences)**: Approach → biggest assumption → decisive signal (and source/expert).

**Null**: single fact that would falsify.

**Breakpoint**: metric/level for review/exit.

## 4) Strategy (depth; ~1 page)

- **Equity**: business/monetization explainer, capability map, comps rationale per [PF1].
- **Funds/RE**: return engine vs repeatability; TVPI → DPI framing; evergreen/gates; fee-drag waterfall per [PF2].
- **Bonds**: carry + pull-to-par + optionality; OAS model provenance; OAS vs Sector Floor call-out per [PF3].
- **VC/Early-Stage**: PoS/rNPV, endpoints, payer codes, PMF evidence per [PF5].

## 5) Operator / Manager Assessment

Follow checklists per [PF5]. Add: capital allocation (buybacks vs IV, M&A ROIC); customer trust (G2/Trustpilot/App Store). Funds/RE: DPI velocity, governance (carry style, loss-netting, GP commit, LPAC), sub-line usage & any IRR-uplift disclosure. Bonds/Private Credit: issuer quality, refi credibility, sponsor support; documentation stance (SOFR floors, MFN, baskets, add-back caps); servicer history.

**Red-flag thresholds (one-line list)**: Glassdoor <3.0 and CEO <50%; >20% churn (12m); >2 raises with <0.2x DPI; ≥2 pivots w/o ARR growth; >2 C-suite exits/24m. Full table + actions per [PF8 §Operator.Thresholds].

## 6) Risk & Downside

- **Equity**: concentration, pricing power, margin tree; Base/Bear/Bull anchors.
- **Funds/RE**: leverage/refi path; NAV age/tail-end; alignment (loss-netting, carry style); liquidity frictions.
- **Bonds**: rate shocks (±100/±200, steepener/flattener), spread shocks (±100), call/prepay (YTW vs YTM), covenant headroom, Liquidity Tier.
- **Evergreen/SPV liquidity mechanics**: NAV redemptions, cash-flow sweep, gates/side-pockets; redemption stress.
- **Method fit**: IRR vs TWR appropriateness; quantify sub-line IRR uplift.

**Triggers**: GP-led with no carry rollover ⇒ require fairness opinion; SPV with no loss netting ⇒ highlight in Fees/Structure and adjust expected net; RE negative leverage ⇒ IRR stress; VC TVPI>1.5x & DPI<0.1x @Yr-4 ⇒ flag liquidity risk per [PF8 §Triggers].

## 7) Portfolio Fit (role & caps)

Use role labels from PFs and apply caps.
- **Bonds**: post-trade duration & rating mix, Rate-DV01 & Spread-DV01, issuer exposure vs house caps.
- **Funds/RE**: sleeve = Structure/Access/Income; note diversification/overlap.
- **Equity**: Compounder/Catalyst/Turnaround/Yield; tax/estate flags.

**House caps**: single-name DV01 ≤5% FI DV01; HY ≤15% FI DV01; BBB- & lower ≤35% MV; sector ≤25%; issuer ≤3% MV (munis per obligor). Dashboard mapping per [PF9].

## 8) Open Questions (MECE)

**Queues**: A) Operator/Issuer/Manager • B) Research (benchmarks/regulatory/claims audits) • C) Valuation (sensitivities, fee-drag, DV01/OAS settings, scenario P&L tie-outs). Use the 7-field format above. Exemplars per [PF1/2/3].

## 9) Quarterly Dashboard (shared scaffold)

Use the table and chip/arrow/dot legend per [PF9].
- **Equity KPIs**: NRR, CAC payback, FCF margin, win-rate.
- **Fund/RE KPIs**: LCR, DPI@Yr-4, net-vs-gross IRR gap.
- **Bonds KPIs**: YTW, OAS, Duration, DV01, Rating watch (compute TEY for munis).

Add Archetype KPIs for each chosen badge per [PF6].

## 10) Governance & Verification

- **Funds/RE**: carry style (Am vs Eu), loss-netting, GP commit, LPAC, audit cadence, sub-line metrics & any IRR-uplift disclosure, cross-fund trade policy per [PF2].
- **Bonds**: make-whole/Par window, change-of-control put, ranking, pricing provenance (quotes/TRACE + TCA) per [PF3].
- **Tax specifics (Funds/RE)**: Tax form, IRA eligibility, UBTI risk, state K-1 exposure.
- **Archive & hygiene**: maintain source archive (doc hash/URL); comply with MNPI/AI rules per [PF4].

## 11) Outputs & Workflow (lean)

Upload materials → 2) Run prompt → 3) Review rec + question set → 4) Assign (operator vs research) → 5) Log & track (Notion/Airtable) → 6) Update IC deck per [PF4 §Ops].

## 12) Minimal Ops Checklist

Team named • Two-source rule applied • Benchmarks tied-out • As-of stamped • Pricing provenance + Liquidity Tier + TCA (bonds) • Case pack (Base/Bear/Bull; sensitivities; fee-drag; DV01/OAS) • Dashboard row created • Appendix dates cited (e.g., Sector Floor) • Red-flag tables reviewed • Change log updated • Cross-section tie-outs (>1% variance flagged) • Primary archetype selected.

---

## CRITICAL INSTRUCTIONS

**YOU MUST use file_search to look up ALL specific numbers, dates, metrics, and facts from the uploaded documents.**

- Do NOT put "TBD" anywhere - search the documents for actual values
- Include specific revenue figures, margins, growth rates, dates, and projections
- Reference the source document and page/section when citing numbers
- If a metric truly cannot be found after searching, note it in Open Questions with what document might contain it

---

## OUTPUT FORMAT & REQUIREMENTS

### How to Write Your Response:

1. **Write the full IC memo directly as markdown text**
   - Do NOT call any function
   - Do NOT use submit_memo_output
   - Just write the complete memo as your response

2. **Structure - Write ALL 13 sections in order:**

   YOUR MEMO STRUCTURE:
   
   # Investment Committee Memo: ${analysis.companyName}
   
   ## 0) Purpose & Canon
   [Write this section fully]
   
   ## 1) Non-Negotiables
   [Write this section fully with all subsections]
   
   ## 2) Evidence
   [Write this section fully]
   
   ## 3) Page-1 — Executive Summary
   [Include: "In Plain English" box, Summary Block, Recommendation, Chain-of-Thought, Null, Breakpoint]
   
   ## 4) Strategy
   [~1 full page with business explainer, capability map, comps]
   
   ## 5) Operator/Manager Assessment
   [Capital allocation, customer trust, red-flags]
   
   ## 6) Risk & Downside
   [Base/Bear/Bull cases with specific numbers, concentration, pricing, margins]
   
   ## 7) Portfolio Fit
   [Role label, caps, exposure checks]
   
   ## 8) Open Questions
   [6-10 items with full 7-field format for each]
   
   ## 9) Quarterly Dashboard
   [≥6 rows with metrics, values, trends, priorities]
   
   ## 10) Governance & Verification
   [Full governance details]
   
   ## 11) Outputs & Workflow
   [Process steps]
   
   ## 12) Minimal Ops Checklist
   [All checklist items]
   
   ---
   ## MEMO METADATA (for system parsing)
   **Recommendation**: [proceed/ask/pass]
   **Confidence**: [high/medium/low]
   ...

3. **Depth Requirements:**
   - Minimum 3,000 words
   - ≥10 distinct citations
   - 6-10 Open Questions (full 7-field format)
   - ≥6 Dashboard rows
   - Specific numbers from documents (no "TBD")
   - Base/Bear/Bull scenarios with valuations

4. **At the very END, add this metadata section:**

   ---
   ## MEMO METADATA (for system parsing)
   
   **Recommendation**: [proceed/ask/pass]
   **Confidence**: [high/medium/low]
   **Primary Archetype**: ${archetype.archetype.primary}
   **Secondary Archetypes**: ${archetype.archetype.secondary.join(", ") || "None"}
   
   ### Key Metrics
   | Metric | Value | Source |
   |--------|-------|--------|
   | Market Cap | $XB | [source] |
   | Revenue | $XB | [source] |
   | ... | ... | ... |
   
   ### Dashboard Items  
   | Metric | Value | Trend | Priority |
   |--------|-------|-------|----------|
   | [metric] | [value] | [up/down/flat] | [yes/no] |
   | ... | ... | ... | ... |
   ---

**NOW BEGIN WRITING THE FULL IC MEMO FOR ${analysis.companyName}.**

Write every section. Be comprehensive. Use specific numbers from the documents.`;
}

/**
 * Parse metadata from the memo text.
 * Looks for the "MEMO METADATA" section at the end.
 */
function parseMetadataFromMemo(text: string): {
  recommendation?: "proceed" | "ask" | "pass";
  confidence?: "high" | "medium" | "low";
  keyMetrics?: Record<string, string>;
  openQuestions?: Array<{ question: string; context: string; owner?: string }>;
  dashboardItems?: Array<{ metric: string; value: string; trend?: "up" | "down" | "flat"; priority?: boolean }>;
} {
  const result: ReturnType<typeof parseMetadataFromMemo> = {};
  
  try {
    // Extract recommendation
    const recMatch = text.match(/\*\*Recommendation\*\*:\s*(proceed|ask|pass)/i);
    if (recMatch) {
      result.recommendation = recMatch[1].toLowerCase() as "proceed" | "ask" | "pass";
    }
    
    // Extract confidence
    const confMatch = text.match(/\*\*Confidence\*\*:\s*(high|medium|low)/i);
    if (confMatch) {
      result.confidence = confMatch[1].toLowerCase() as "high" | "medium" | "low";
    }
    
    // Extract key metrics table
    const metricsMatch = text.match(/### Key Metrics[\s\S]*?\|[\s\S]*?(?=###|\n---|\n\n\n|$)/);
    if (metricsMatch) {
      result.keyMetrics = {};
      const rows = metricsMatch[0].split('\n').filter(line => 
        line.includes('|') && !line.includes('---') && !line.includes('Metric')
      );
      for (const row of rows) {
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 2) {
          result.keyMetrics[cells[0]] = cells[1];
        }
      }
    }
    
    // Extract dashboard items table
    const dashMatch = text.match(/### Dashboard Items[\s\S]*?\|[\s\S]*?(?=###|\n---|\n\n\n|$)/);
    if (dashMatch) {
      result.dashboardItems = [];
      const rows = dashMatch[0].split('\n').filter(line => 
        line.includes('|') && !line.includes('---') && !line.includes('Metric')
      );
      for (const row of rows) {
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 2) {
          result.dashboardItems.push({
            metric: cells[0],
            value: cells[1],
            trend: (cells[2]?.toLowerCase() as "up" | "down" | "flat") || "flat",
            priority: cells[3]?.toLowerCase() === "yes",
          });
        }
      }
    }
    
    // Note: Open questions are embedded in the memo itself, 
    // we don't need to parse them separately as they're in the markdown
    
  } catch (err) {
    console.warn("[ICMemo] Failed to parse metadata from memo:", err);
  }
  
  return result;
}


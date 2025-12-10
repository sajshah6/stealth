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
    model: "gpt-4-turbo",
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

      // Add message to existing thread (maintains full context)
      await addMessage(threadId, memoPrompt);

      // Run assistant to generate memo
      console.log("Generating IC memo...");
      const result = await runAssistant(threadId, assistantId);

      // Validate result
      if (result.type !== "memo") {
        // If we got text instead of structured output, try to extract what we can
        if (result.type === "text") {
          return {
            status: "completed",
            output: {
              recommendation: "ask",
              confidence: "medium",
              archetype: effectiveArchetypeSelection.archetype,
              memoMarkdown: result.text,
              keyMetrics: {},
              openQuestions: [],
              dashboardItems: [],
            },
            metadata: {
              llmModel: "gpt-4-turbo",
              tokensUsed: result.tokensUsed,
            },
          };
        }

        return {
          status: "failed",
          error: "Assistant did not return structured memo output",
        };
      }

      const memo: MemoOutput = result.output;

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
          llmModel: "gpt-4-turbo",
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
    ? `User selected: ${archetype.selectedOptionIds?.join(", ")}`
    : "Auto-determined based on clear investment thesis";

  const assetType = analysis.assetType;

  return `Now generate the full IC memo for ${analysis.companyName} (${assetType}).

## Archetype Framing
Primary: ${archetype.archetype.primary}
Secondary: ${archetype.archetype.secondary.join(", ") || "None"}
Source: ${archetypeInfo}

---

# Deal Evaluator v5.3 — IC Memo Requirements

## Non-Negotiables

- **Two-source rule**: Non-obvious claims need ≥2 independent sources or label as "operator-provided (unaudited)"
- **As-of discipline**: All Page-1 numbers show "As of: DATE • TIME • TZ"
- **No placeholders**: If data is missing, omit and add to Open Questions with owner + due date
- **Order**: Summary → Recommendation → Strategy → Operator/Manager → Risk → Portfolio Fit → Open Qs → Dashboard → Governance → Ops Checklist

## Depth Gates (Anti-Terse)

- Exhibits: ≥3 (valuation/comp; benchmark; risk/shock)
- Open Questions: 6–10 items with full 7-field format
- Citations: ≥10 distinct sources across the memo
- Dashboard rows: ≥6 including 1–3 ⭐ priorities and ⚑ decision flags

---

## Section Requirements

### 1) Page-1 — Executive Summary (one screen)

**"In Plain English" Box (mandatory)**: 3-5 bullets any non-specialist can understand.

**Summary Block** (${assetType}-specific):
${assetType === "equity" ? `- Model, float/ADV, valuation tiles, SBC/dilution, Top-3 risks` : ""}
${assetType === "fund" ? `- Structure, fees/waterfall, NAV age, liquidity/gates, DPI velocity` : ""}
${assetType === "bond" ? `- CUSIP, YTW/call, OAS, duration/convexity, protections, Liquidity Tier, tax flags` : ""}

**Recommendation (mandatory format)**:
⬆️ Proceed | ⚠️ Ask | ⛔ Pass — [Primary: ${archetype.archetype.primary}] — [Secondary: ${archetype.archetype.secondary.join(", ") || "None"}]
- Upside: [specific upside]
- Risk: [specific risk]

**Chain-of-Thought** (2-3 sentences): Approach → biggest assumption → decisive signal (and source)

**Null Hypothesis**: Single fact that would falsify the thesis

**Breakpoint**: Metric/level that triggers review or exit

---

### 2) Strategy (~1 page depth)

${assetType === "equity" ? `- Business/monetization explainer
- Capability map
- Comps rationale with specific multiples` : ""}
${assetType === "fund" ? `- Return engine vs repeatability
- TVPI → DPI framing
- Evergreen/gates mechanics
- Fee-drag waterfall` : ""}
${assetType === "bond" ? `- Carry + pull-to-par + optionality analysis
- OAS model provenance
- OAS vs Sector Floor comparison` : ""}

---

### 3) Operator/Manager Assessment

- Capital allocation history (buybacks vs internal investment, M&A ROIC)
- Customer trust signals (G2/Trustpilot/App Store ratings if applicable)
- Red-flag thresholds check:
  - Glassdoor <3.0 and CEO approval <50%?
  - >20% customer churn (12m)?
  - ≥2 C-suite exits in 24 months?

---

### 4) Risk & Downside

**Base/Bear/Bull Cases** with specific numbers:
- Base: [scenario + valuation]
- Bear: [scenario + valuation]
- Bull: [scenario + valuation]

${assetType === "equity" ? `- Concentration risk
- Pricing power durability
- Margin tree analysis` : ""}
${assetType === "fund" ? `- Leverage/refi path
- NAV age/tail-end risk
- Alignment (loss-netting, carry style)
- Liquidity frictions` : ""}
${assetType === "bond" ? `- Rate shocks (±100bp, ±200bp)
- Spread shocks (±100bp)
- Call/prepay risk (YTW vs YTM)
- Covenant headroom` : ""}

---

### 5) Portfolio Fit

- Role label: ${archetype.archetype.primary}
- Concentration vs house caps
${assetType === "equity" ? `- Tax/estate considerations
- Sector exposure check (≤25%)
- Single issuer check (≤3% MV)` : ""}
${assetType === "bond" ? `- Post-trade duration impact
- Rating mix impact
- DV01 exposure vs caps` : ""}

---

### 6) Open Questions (6-10 items, MECE)

For each question use this format:
1. **Context**: Background
2. **What we know**: Current information
3. **What we need**: Specific gap
4. **Why it matters**: Impact on thesis
5. **Source path**: Where to find answer
6. **Owner**: Who is responsible
7. **Due date**: When needed

Categories:
- A) Operator/Issuer/Manager questions
- B) Research (benchmarks, regulatory, claims audits)
- C) Valuation (sensitivities, fee-drag, scenario P&L)

---

### 7) Quarterly Dashboard

≥6 rows with:
- Metric name
- Current value
- Trend (↑/↓/→)
- 1-3 items marked as ⭐ priority
- Decision flags (⚑) where applicable

${assetType === "equity" ? `Include: NRR, CAC payback, FCF margin, win-rate` : ""}
${assetType === "fund" ? `Include: LCR, DPI@Yr-4, net-vs-gross IRR gap` : ""}
${assetType === "bond" ? `Include: YTW, OAS, Duration, DV01, Rating watch` : ""}

---

### 8) Ops Checklist (confirm each)

- [ ] Team named
- [ ] Two-source rule applied
- [ ] Benchmarks tied-out
- [ ] As-of stamped
- [ ] Case pack complete (Base/Bear/Bull)
- [ ] Dashboard row created
- [ ] Red-flag tables reviewed
- [ ] Primary archetype selected: ${archetype.archetype.primary}

---

## Output Instructions

Call **submit_memo_output** with:
- recommendation: "proceed" | "ask" | "pass"
- confidence: "high" | "medium" | "low"
- archetype: { primary, secondary[] }
- memoMarkdown: The full memo in markdown format
- keyMetrics: Key numbers as { metric: value }
- openQuestions: Array of { question, context, owner }
- dashboardItems: Array of { metric, value, trend, priority }

Be specific. Use real numbers from the analysis. No placeholders.`;
}


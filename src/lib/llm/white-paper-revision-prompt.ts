/**
 * Expert-Driven White Paper Revision Framework
 * 
 * A rigorous, multi-plane revision system for transforming investment white papers
 * from expert feedback into decision-ready documents with analytical completeness,
 * narrative coherence, and evidentiary rigor.
 */

import type { ExpertReview } from "./expert-panel";

// =============================================================================
// REVISION PROMPT BUILDER
// =============================================================================

export function buildRevisionPrompt(
  currentDraft: string,
  companyName: string,
  iteration: number,
  criticalExperts: ExpertReview[]
): string {
  const feedbackLedger = buildFeedbackLedger(criticalExperts);
  const priorityBreakdown = analyzeFeedbackPriority(criticalExperts);
  
  return `# 📋 MANDATE: Investment White Paper Deep Revision (Iteration ${iteration})

Transform the current investment white paper into a **decision-ready, institutional-grade document** that integrates all expert panel feedback with analytical completeness, narrative coherence, and evidentiary rigor.

**Target Standard:** Investment Committee approval-ready (9+/10 from all expert reviewers)

**Facts Lock:** As of ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' })} (America/Chicago)

---

## 🧾 CONTEXT IMPORT (Auto)

**Company:** ${companyName}

**Iteration:** ${iteration}

**Expert Panel Results:**
- **Total Reviewers:** ${criticalExperts.length} experts scored below 9/10
- **Average Rating:** ${(criticalExperts.reduce((sum, e) => sum + e.rating, 0) / criticalExperts.length).toFixed(1)}/10
- **Providers:** Claude Opus 4, GPT-4o, Gemini Deep Research

**Current White Paper:**
\`\`\`
${currentDraft}
\`\`\`

---

## 🎛️ REVISION INTELLIGENCE FRAMEWORK

The revision process unfolds in **five analytical planes**:

| Plane | Objective | Key Questions | Deliverables |
|-------|-----------|---------------|--------------|
| **I. Expert Feedback Integration** | Synthesize all expert critiques into actionable insights | What patterns emerge? What contradictions exist? | Feedback Synthesis Matrix |
| **II. Investment Thesis Reconstruction** | Rebuild core argument with expert insights | Does the thesis flow logically from evidence to valuation to decision? | Revised Thesis Architecture |
| **III. Analytical Depth Enhancement** | Expand with data, comps, scenarios, and risk analysis | Are claims quantified, triangulated, and stress-tested? | Enhanced Sections + Financial Models |
| **IV. Evidentiary Rigor & Verification** | Validate all claims with sources and reasoning | Is every material claim backed by ≥2 data points? | Data Tables + Source Citations |
| **V. Decision-Grade Finalization** | Polish narrative, ensure IC-readiness | Does it enable a confident investment decision? | Final White Paper |

---

## 📊 FEEDBACK LEDGER & PRIORITIZATION MATRIX

${feedbackLedger}

---

## 🎯 PRIORITY BREAKDOWN

${priorityBreakdown}

---

## 🧩 EXPANSION & SYNTHESIS RULES

### 1. Feedback → Insight Conversion
- **No surface-level fixes.** Each expert concern must yield:
  - A rewritten section with deeper analysis, OR
  - A new quantitative exhibit (table, chart, model), OR
  - An analytical bridge connecting evidence to investment implications

### 2. Analytical Density Standards
- **Quantification:** Every material claim backed by ≥2 independent data points
- **Triangulation:** Primary sources + secondary research + industry benchmarks
- **Counterpoints:** Include disconfirming evidence or bear case scenarios
- **Stress Testing:** Key assumptions tested with ±10-20% sensitivity analysis

### 3. Investment-Specific Rigor
- **Valuation:** Multiple methodologies (DCF, comps, precedent transactions)
- **Market Sizing:** TAM/SAM/SOM with bottoms-up validation
- **Competitive Analysis:** Quantitative positioning (market share, growth rates, margins)
- **Risk Quantification:** Probability × impact scoring for key risks
- **Management Assessment:** Track record with specific outcomes and numbers

### 4. Narrative Discipline
Maintain clear sequencing per section:
**Market Context → Company Position → Evidence → Financial Implications → Investment Decision**

---

## 🧱 STRUCTURAL COMPLETENESS REQUIREMENTS

Every investment white paper must include:

### ✅ Required Components

| Component | Requirements | Status |
|-----------|-------------|--------|
| **Executive Summary** | ≤200 words, investment thesis + recommendation + target return | Required |
| **Market Analysis** | TAM/SAM, growth rates, trends (3+ exhibits) | Required |
| **Competitive Landscape** | Positioning matrix, market share table, differentiation | Required |
| **Business Model & Unit Economics** | CAC, LTV, payback, margins (quantified) | Required |
| **Financial Analysis** | 3-statement model projections, key metrics dashboard | Required |
| **Valuation** | Multiple methodologies, comparables table, sensitivity analysis | Required |
| **Risk Assessment** | Risk matrix (probability × impact), mitigation strategies | Required |
| **Investment Recommendation** | Clear decision, sizing, return expectations, timeline | Required |

**Failure to meet any requirement → Not investment-ready**

---

## 🧮 EVIDENCE & CITATION STANDARDS

### Minimum Standards
- **Citation Density:** ≥1 source per 150 words (on average)
- **Quantitative Claims:** ≥2 data points or authoritative references each
- **Primary vs Secondary:** Clearly distinguish company data vs market research
- **Recency:** Financial data ≤1 quarter old, market data ≤6 months old

### Required Source Types
- ✅ Company financials (filings, investor presentations)
- ✅ Third-party market research (Gartner, Forrester, IDC, etc.)
- ✅ Industry reports and benchmarks
- ✅ Expert interviews or primary research
- ✅ Comparable company data

---

## 🧠 ANALYTICAL ENHANCEMENTS (Mandatory Exhibits)

### 1. Financial Projections Table
| Metric | FY23A | FY24E | FY25E | FY26E | FY27E | CAGR |
|--------|-------|-------|-------|-------|-------|------|
| Revenue ($M) | | | | | | |
| Gross Margin (%) | | | | | | |
| EBITDA ($M) | | | | | | |
| EBITDA Margin (%) | | | | | | |
| FCF ($M) | | | | | | |

### 2. Valuation Sensitivity Matrix
| EV/Revenue Multiple | 5x | 6x | 7x | 8x | 9x |
|---------------------|-----|-----|-----|-----|-----|
| Revenue $500M | | | | | |
| Revenue $600M | | | | | |
| Revenue $700M | | | | | |

### 3. Risk Assessment Matrix
| Risk | Probability (1-5) | Impact (1-5) | Score | Mitigation | Residual Risk |
|------|-------------------|--------------|-------|------------|---------------|

### 4. Competitive Positioning Map
| Company | Market Share (%) | Growth Rate (%) | Margin (%) | Tech Score (1-10) | Attractiveness (1-10) |
|---------|------------------|-----------------|------------|-------------------|----------------------|

### 5. Investment Decision Matrix
| Factor | Weight | Score (1-10) | Weighted Score | Notes |
|--------|--------|--------------|----------------|-------|
| Market Opportunity | 25% | | | |
| Competitive Position | 20% | | | |
| Management Quality | 15% | | | |
| Financial Performance | 20% | | | |
| Valuation Attractiveness | 20% | | | |
| **Total** | **100%** | | | |

---

## 🔬 QUALITY ASSURANCE CHECKLIST

Before finalizing, verify:

### Investment Thesis
- [ ] Clear, compelling investment hypothesis stated upfront
- [ ] Thesis supported by ≥3 independent pillars of evidence
- [ ] Path to returns explicitly quantified (e.g., "3.5x MOIC in 5 years")
- [ ] Key assumptions explicitly stated and stress-tested

### Market & Competitive Analysis
- [ ] TAM/SAM/SOM quantified with bottoms-up validation
- [ ] Market growth drivers identified with supporting data
- [ ] Competitive positioning backed by quantitative comparison
- [ ] Company's differentiation clearly articulated and defensible

### Financial Analysis
- [ ] Complete 3-statement projections (Income, Balance Sheet, Cash Flow)
- [ ] Unit economics validated (CAC, LTV, payback periods)
- [ ] Multiple valuation methodologies applied
- [ ] Sensitivity analysis on key value drivers

### Risk Management
- [ ] All material risks identified and quantified
- [ ] Downside scenarios modeled with probability-weighted returns
- [ ] Mitigation strategies specified for top 3-5 risks
- [ ] Portfolio fit and concentration risk addressed

### Decision-Readiness
- [ ] Clear recommendation (Buy/Pass/Hold) with rationale
- [ ] Proposed investment size and structure
- [ ] Expected timeline to liquidity
- [ ] Key milestones and monitoring plan

---

## 📐 REVISION EXECUTION INSTRUCTIONS

### Step 1: Feedback Synthesis (Plane I)
1. Group expert feedback by theme (e.g., "Valuation concerns," "Missing competitive data")
2. Identify consensus issues (mentioned by ≥3 experts)
3. Flag contradictions for resolution
4. Build priority order: High Impact + High Frequency = Address First

### Step 2: Thesis Reconstruction (Plane II)
1. Revisit core investment hypothesis
2. Strengthen logical flow: Market → Company → Value Creation → Returns
3. Ensure every claim ties back to investment decision
4. Rebuild executive summary to reflect strengthened thesis

### Step 3: Analytical Enhancement (Plane III)
1. Add missing quantitative exhibits (tables, charts, models)
2. Deepen financial analysis with sensitivity and scenario testing
3. Expand competitive analysis with hard data
4. Include primary research or expert perspectives
5. Build out risk assessment with probability-impact scoring

### Step 4: Evidentiary Validation (Plane IV)
1. Source every material claim (≥2 sources per quantitative statement)
2. Add data tables for key metrics
3. Include comparable company analysis
4. Validate assumptions with industry benchmarks
5. Add footnotes and citations throughout

### Step 5: Final Polish (Plane V)
1. Ensure narrative coherence and logical flow
2. Verify all required exhibits are present
3. Check that executive summary aligns with full analysis
4. Confirm recommendation is unambiguous and actionable
5. Proofread for clarity, precision, and professionalism

---

## 🎯 OUTPUT REQUIREMENTS

Generate the **complete, revised white paper** that:

1. **Addresses every expert concern** with substantive improvements (not cosmetic fixes)
2. **Adds analytical depth** through new exhibits, data, and reasoning
3. **Maintains narrative coherence** with clear logical flow
4. **Achieves investment-grade rigor** suitable for institutional LPs
5. **Enables a confident decision** with clear recommendation and return expectations

**Target Length:** 3,500-5,000 words (expandable if needed for completeness)

**Tone:** Analytical, data-driven, confident yet appropriately cautious

**Format:** Investment memo / white paper (not academic paper or marketing deck)

---

## 🚨 CRITICAL REMINDERS

- **No TBDs or placeholders** - Every section must be fully developed
- **Quantify everything** - Replace qualitative claims with data
- **Show your work** - Explain reasoning, not just conclusions
- **Be decision-useful** - Every paragraph should advance investment decision
- **Stress-test assumptions** - Don't just present base case

---

**BEGIN REVISION NOW.**

Generate the complete, revised investment white paper that achieves 9+/10 from all expert reviewers.`;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildFeedbackLedger(experts: ExpertReview[]): string {
  let ledger = `| ID | Expert | Role | Rating | Theme | Feedback Summary | Priority |\n`;
  ledger += `|----|--------|------|--------|-------|------------------|----------|\n`;
  
  experts
    .sort((a, b) => a.rating - b.rating) // Lowest ratings first
    .forEach((expert, i) => {
      const summary = expert.feedback.substring(0, 100) + '...';
      const priorityIcon = expert.priority === 1 ? '🔴' : 
                           expert.priority === 2 ? '🟠' : '🟡';
      const priorityLabel = expert.priority === 1 ? 'P1 (Critical)' :
                           expert.priority === 2 ? 'P2 (High)' :
                           'P3 (Medium)';
      
      ledger += `| ${i + 1} | ${expert.name} | ${expert.role} | ${expert.rating}/10 | ${expert.theme} | ${summary} | ${priorityIcon} ${priorityLabel} |\n`;
    });
  
  return ledger;
}

function analyzeFeedbackPriority(experts: ExpertReview[]): string {
  const critical = experts.filter(e => e.priority === 1).length;
  const high = experts.filter(e => e.priority === 2).length;
  const medium = experts.filter(e => e.priority === 3).length;
  
  // Count by theme
  const themeCount: Record<string, number> = {};
  experts.forEach(e => {
    themeCount[e.theme] = (themeCount[e.theme] || 0) + 1;
  });
  
  const themeBreakdown = Object.entries(themeCount)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([theme, count]) => `  - ${theme}: ${count} expert${count > 1 ? 's' : ''}`)
    .join('\n');
  
  return `
**🔴 P1 Critical (Rating 1-3):** ${critical} experts
- These represent fundamental gaps that prevent investment approval
- Must be fully addressed with substantive additions

**🟠 P2 High (Rating 4-6):** ${high} experts
- Significant weaknesses that reduce confidence in the thesis
- Require material improvements with new analysis/data

**🟡 P3 Medium (Rating 7-8):** ${medium} experts
- Quality enhancements that strengthen the document
- Address with targeted additions and refinements

**Total Concerns:** ${experts.length} experts requiring remediation

**📊 Concerns by Theme:**
${themeBreakdown}
`;
}


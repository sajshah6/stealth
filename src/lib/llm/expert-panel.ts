/**
 * Expert Panel Review System
 * 
 * Shared types and prompts for multi-LLM expert panel reviews
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ExpertReview {
  name: string;
  role: string;
  rating: number;  // 1-10
  priority: number;  // 1-5 where 1 = highest priority (most critical), 5 = lowest priority
  theme: string;  // Free-form: e.g., "Valuation Methodology", "Market Sizing", "Competitive Moat", etc.
  feedback: string;
}

export interface ExpertPanelResult {
  provider: "claude" | "gpt" | "gemini";
  model: string;
  experts: ExpertReview[];
  averageScore: number;
  criticalExperts: ExpertReview[];  // Experts with rating < 9
}

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

export function buildExpertPanelPrompt(
  whitePaper: string,
  companyName: string
): string {
  return `You are assembling an expert panel to review an investment white paper and provide ratings and feedback.

**Company:** ${companyName}

**White Paper:**
${whitePaper}

---

## YOUR TASK:

1. **Identify the Industry:** Based on the white paper content, determine the company's industry, sector, and business model.

2. **Assemble 15 Experts:** Create a panel of 15 experts who are best qualified to evaluate this specific investment opportunity. Tailor the panel to the industry and investment context.

   The panel should include (adapted to the specific industry):
   - Industry analysts and sector specialists
   - Financial analysts (valuation, modeling, cap structure)
   - Operational experts (business model, execution risk)
   - Market strategists (competitive positioning, timing)
   - Risk managers (downside scenarios, tail risks)
   - Technical/domain experts (if applicable - e.g., biotech, fintech, etc.)
   - Investment committee members (portfolio fit, allocation)

3. **Each Expert Must Provide:**
   - **Name:** Full name with credentials
   - **Role:** Specific area of expertise (be detailed)
   - **Rating:** Score from 1-10 evaluating the investment white paper quality
     - 1-3: Major flaws, not investment-ready
     - 4-6: Significant gaps or concerns
     - 7-8: Good but needs improvement
     - 9-10: Excellent, investment-ready
   - **Priority:** Urgency level from 1-5 based on your rating (1 = highest priority, 5 = lowest):
     - **1 (Critical)**: If rating 1-3 - Fundamental flaws, not investment-ready
     - **2 (High)**: If rating 4-6 - Significant gaps or concerns
     - **3 (Medium)**: If rating 7-8 - Good but needs improvement
     - **4-5**: Not applicable (ratings 9-10 pass, won't need revision)
   - **Theme:** A concise label describing the primary focus of your feedback
     - Examples: "Valuation Methodology", "Market Sizing", "Competitive Moat", "Management Track Record", "Financial Projections", "Risk Quantification", "Data Quality", etc.
     - Use whatever theme best captures your concern (2-4 words)
   - **Feedback:** Detailed, actionable feedback on how to improve the white paper
     - What's missing or unclear
     - What assumptions need validation
     - What risks are understated or overstated
     - Specific suggestions for improvement

4. **Rating Criteria:**
   Each expert should evaluate:
   - Completeness of analysis
   - Quality of evidence and sources
   - Soundness of financial assumptions
   - Adequacy of risk assessment
   - Clarity of investment thesis
   - Actionability for decision-makers

---

## IMPORTANT:

- Provide EXACTLY 15 experts (no more, no fewer)
- Be critical and thorough - this is for a real investment decision
- Focus feedback on substantive issues, not minor stylistic points
- Experts should have diverse perspectives (some bullish, some cautious)
- Ratings should be honest - don't inflate scores

Assemble your expert panel now.`;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function calculateAverageScore(experts: ExpertReview[]): number {
  if (experts.length === 0) return 0;
  const sum = experts.reduce((acc, e) => acc + e.rating, 0);
  return Math.round((sum / experts.length) * 10) / 10;  // Round to 1 decimal
}

export function getCriticalExperts(experts: ExpertReview[]): ExpertReview[] {
  return experts.filter(e => e.rating < 9);
}

export function validateExpertPanel(experts: ExpertReview[]): void {
  if (!Array.isArray(experts)) {
    throw new Error("Experts must be an array");
  }
  
  if (experts.length !== 15) {
    throw new Error(`Must have exactly 15 experts, got ${experts.length}`);
  }
  
  for (let i = 0; i < experts.length; i++) {
    const expert = experts[i];
    
    if (!expert.name || typeof expert.name !== 'string') {
      throw new Error(`Expert ${i + 1}: name is required and must be a string`);
    }
    
    if (!expert.role || typeof expert.role !== 'string') {
      throw new Error(`Expert ${i + 1}: role is required and must be a string`);
    }
    
    if (typeof expert.rating !== 'number' || expert.rating < 1 || expert.rating > 10) {
      throw new Error(`Expert ${i + 1}: rating must be a number between 1 and 10, got ${expert.rating}`);
    }
    
    if (typeof expert.priority !== 'number' || expert.priority < 1 || expert.priority > 5) {
      throw new Error(`Expert ${i + 1}: priority must be a number between 1 and 5, got ${expert.priority}`);
    }
    
    // Validate priority matches rating
    const expectedPriority = expert.rating <= 3 ? 1 : 
                            expert.rating <= 6 ? 2 : 
                            3;  // rating 7-8
    if (expert.priority !== expectedPriority) {
      throw new Error(`Expert ${i + 1}: priority ${expert.priority} doesn't match rating ${expert.rating} (expected ${expectedPriority})`);
    }
    
    if (!expert.theme || typeof expert.theme !== 'string' || expert.theme.trim().length === 0) {
      throw new Error(`Expert ${i + 1}: theme is required and must be a non-empty string`);
    }
    
    if (!expert.feedback || typeof expert.feedback !== 'string') {
      throw new Error(`Expert ${i + 1}: feedback is required and must be a string`);
    }
  }
}


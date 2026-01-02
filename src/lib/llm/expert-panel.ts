/**
 * Expert Panel Review System
 * 
 * Shared types and prompts for multi-LLM expert panel reviews
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ExpertProfile {
  index: number;  // 1-15
  name: string;
  role: string;
  credentials: string;
  expertise: string;
}

export interface ExpertReview {
  expertIndex: number;  // 1-15, matches ExpertProfile.index
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

/**
 * Build prompt for expert panel review with pre-selected experts
 */
export function buildExpertPanelPrompt(
  whitePaper: string,
  companyName: string,
  expertProfiles: ExpertProfile[]
): string {
  const expertsListText = expertProfiles
    .map((expert) => {
      return `**Expert #${expert.index}: ${expert.name}** - ${expert.role}
   - Credentials: ${expert.credentials}
   - Expertise: ${expert.expertise}`;
    })
    .join('\n\n');

  return `You are role-playing as a panel of 15 investment experts reviewing a white paper.

**Company:** ${companyName}

**White Paper:**
${whitePaper}

---

## THE EXPERT PANEL:

You will role-play as each of these 15 experts, providing feedback from their unique perspective:

${expertsListText}

---

## YOUR TASK:

For EACH of the 15 experts listed above (Expert #1 through Expert #15), provide their review of the white paper.

**Each expert must provide:**

1. **Expert Index:** The expert's number (1-15) from the list above

2. **Rating (1-10):** Score evaluating the investment white paper quality
   - 1-3: Major flaws, not investment-ready
   - 4-6: Significant gaps or concerns
   - 7-8: Good but needs improvement
   - 9-10: Excellent, investment-ready

3. **Priority (1-5):** How urgently their concern should be addressed
   - **1**: Most critical - must address immediately
   - **2**: High priority - significant concern
   - **3**: Medium priority - important but not blocking
   - **4-5**: Lower priority - nice to have improvements

4. **Theme:** A concise label (2-4 words) describing their primary focus
   - Examples: "Valuation Methodology", "Market Sizing", "Competitive Moat", "Management Track Record", "Financial Projections", "Risk Quantification", etc.

5. **Feedback:** Detailed, actionable feedback from their expert perspective
   - What's missing or unclear
   - What assumptions need validation
   - What risks are understated or overstated
   - Specific suggestions for improvement

---

## RATING CRITERIA:

Each expert should evaluate based on their area of expertise:
- Completeness of analysis
- Quality of evidence and sources
- Soundness of assumptions
- Adequacy of risk assessment
- Clarity of investment thesis
- Actionability for decision-makers

---

## IMPORTANT:

- Provide feedback for ALL 15 experts (no more, no fewer)
- Role-play each expert authentically based on their background
- Be critical and thorough - this is for a real investment decision
- Focus on substantive issues relevant to each expert's domain
- Experts should have diverse perspectives based on their backgrounds
- Ratings should be honest - don't inflate scores

Provide your expert panel review now.`;
}

/**
 * Build prompt for subsequent iteration reviews
 */
export function buildIterationReviewPrompt(
  whitePaper: string,
  companyName: string,
  expertProfiles: ExpertProfile[],
  iteration: number
): string {
  const expertsListText = expertProfiles
    .map((expert) => {
      return `**Expert #${expert.index}: ${expert.name}** - ${expert.role}
   - Credentials: ${expert.credentials}
   - Expertise: ${expert.expertise}`;
    })
    .join('\n\n');

  return `🔄 **ITERATION ${iteration} - CONTINUED REVIEW**

You are continuing your role-play as a panel of 15 investment experts reviewing a white paper for ${companyName}.

**CONTEXT:**
- You previously reviewed earlier draft(s) and provided ratings and feedback
- The team has revised the white paper based on feedback from experts who scored below 9
- You should recall your previous concerns and evaluate if they were addressed

**REVISED WHITE PAPER (Draft ${iteration}):**
${whitePaper}

---

## THE EXPERT PANEL:

You will continue role-playing as each of these 15 experts, providing feedback from their unique perspective:

${expertsListText}

---

## YOUR TASK:

For EACH of the 15 experts listed above (Expert #1 through Expert #15), provide their review of this REVISED white paper.

**Each expert must provide:**

1. **Expert Index:** The expert's number (1-15) from the list above

2. **Rating (1-10):** Score evaluating the investment white paper quality
   - 1-3: Major flaws, not investment-ready
   - 4-6: Significant gaps or concerns
   - 7-8: Good but needs improvement
   - 9-10: Excellent, investment-ready
   
   **Consider your previous rating:**
   - If previous concerns were well-addressed: Consider raising your rating
   - If concerns remain unresolved: Keep or lower your rating
   - If new issues appeared: Adjust rating accordingly

3. **Priority (1-5):** How urgently their concern should be addressed
   - **1**: Most critical - must address immediately
   - **2**: High priority - significant concern
   - **3**: Medium priority - important but not blocking
   - **4-5**: Lower priority - nice to have improvements

4. **Theme:** A concise label (2-4 words) describing their primary focus
   - Examples: "Valuation Methodology", "Market Sizing", "Competitive Moat", "Management Track Record", "Financial Projections", "Risk Quantification", etc.

5. **Feedback:** Detailed, actionable feedback from their expert perspective
   - **Acknowledge what was fixed or improved** from your previous feedback
   - Point out any new issues that appeared in this revision
   - Identify remaining gaps or concerns that still need work
   - Be specific about what still needs improvement
   - Reference your previous concerns to show continuity

---

## RATING CRITERIA:

Each expert should evaluate based on their area of expertise:
- Completeness of analysis
- Quality of evidence and sources
- Soundness of assumptions
- Adequacy of risk assessment
- Clarity of investment thesis
- Actionability for decision-makers

**For this iteration, also consider:**
- Were previous issues addressed adequately?
- Has the overall quality improved?
- Are there any regressions or new problems?

---

## IMPORTANT:

- Provide feedback for ALL 15 experts (no more, no fewer)
- Role-play each expert authentically based on their background
- Be critical and thorough - this is for a real investment decision
- Focus on substantive issues relevant to each expert's domain
- **Reference your conversation history** - recall what you said before
- Acknowledge improvements where credit is due
- Be honest about remaining gaps or new issues
- Ratings should reflect actual progress (or lack thereof)

Provide your expert panel review for iteration ${iteration} now.`;
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
  
  // Check that all indices 1-15 are present
  const indices = experts.map(e => e.expertIndex).sort((a, b) => a - b);
  const expectedIndices = Array.from({ length: 15 }, (_, i) => i + 1);
  const indicesMatch = indices.length === 15 && indices.every((val, i) => val === expectedIndices[i]);
  
  if (!indicesMatch) {
    throw new Error(`Expert indices must be 1-15 (each used exactly once), got: [${indices.join(', ')}]`);
  }
  
  for (let i = 0; i < experts.length; i++) {
    const expert = experts[i];
    
    if (typeof expert.expertIndex !== 'number' || expert.expertIndex < 1 || expert.expertIndex > 15) {
      throw new Error(`Expert ${i + 1}: expertIndex must be a number between 1 and 15, got ${expert.expertIndex}`);
    }
    
    if (!expert.name || typeof expert.name !== 'string') {
      throw new Error(`Expert #${expert.expertIndex}: name is required and must be a string`);
    }
    
    if (!expert.role || typeof expert.role !== 'string') {
      throw new Error(`Expert #${expert.expertIndex}: role is required and must be a string`);
    }
    
    if (typeof expert.rating !== 'number' || expert.rating < 1 || expert.rating > 10) {
      throw new Error(`Expert #${expert.expertIndex}: rating must be a number between 1 and 10, got ${expert.rating}`);
    }
    
    if (typeof expert.priority !== 'number' || expert.priority < 1 || expert.priority > 5) {
      throw new Error(`Expert #${expert.expertIndex}: priority must be a number between 1 and 5, got ${expert.priority}`);
    }
    
    if (!expert.theme || typeof expert.theme !== 'string' || expert.theme.trim().length === 0) {
      throw new Error(`Expert #${expert.expertIndex}: theme is required and must be a non-empty string`);
    }
    
    if (!expert.feedback || typeof expert.feedback !== 'string') {
      throw new Error(`Expert #${expert.expertIndex}: feedback is required and must be a string`);
    }
  }
}


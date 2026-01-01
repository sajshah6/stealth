/**
 * Step 9a: Assemble Expert Panel (One-Time)
 * 
 * Picks 15 experts tailored to the investment/company based on white paper content.
 * These same experts will provide feedback across all review iterations.
 */

import { defineStep } from "../define-step";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { withRetry } from "@/lib/utils/retry";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExpertProfile {
  index: number;  // 1-15
  name: string;
  role: string;
  credentials: string;
  expertise: string;
}

interface AssembleExpertPanelOutput {
  experts: ExpertProfile[];
  companyName: string;
  industry: string;
}

const ASSEMBLE_PANEL_FUNCTION = {
  name: "submit_expert_panel",
  description: "Submit the 15-person expert panel for this investment",
  parameters: {
    type: "object",
    properties: {
      industry: {
        type: "string",
        description: "The industry/sector of the company (e.g., 'Biotech/Pharmaceuticals', 'Enterprise SaaS', 'Fintech')",
      },
      experts: {
        type: "array",
        description: "Array of exactly 15 expert profiles",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Expert's full name with credentials (e.g., 'Dr. Sarah Chen, CFA, MD')",
            },
            role: {
              type: "string",
              description: "Expert's specific area of expertise (e.g., 'Healthcare Valuation Specialist')",
            },
            credentials: {
              type: "string",
              description: "Professional credentials and background (e.g., 'Former Managing Director at Goldman Sachs Healthcare, 20+ years biotech investing')",
            },
            expertise: {
              type: "string",
              description: "Why this expert is relevant for this investment (e.g., 'Deep experience in mRNA technology commercialization and pharma M&A')",
            },
          },
          required: ["name", "role", "credentials", "expertise"],
        },
        minItems: 15,
        maxItems: 15,
      },
    },
    required: ["industry", "experts"],
  },
};

export const assembleExpertPanelStep = defineStep({
  key: "assemble_expert_panel",
  name: "Assemble Expert Panel",
  description: "Select 15 experts tailored to this investment for consistent review across iterations",
  
  inputFrom: ["white_paper_draft_1", "initial_analysis"],
  
  llm: {
    provider: "openai",
    model: "gpt-4o",
  },

  async execute({ projectId, inputs }) {
    console.log("[AssembleExpertPanel] Assembling expert panel...");
    console.log("[AssembleExpertPanel] Project:", projectId);

    // Get white paper draft 1 from database
    const supabase = await createClient();
    const { data: draft, error } = await supabase
      .from('white_paper_drafts')
      .select('content')
      .eq('project_id', projectId)
      .eq('draft_version', 1)
      .single();

    if (error || !draft) {
      throw new Error("White paper draft 1 not found");
    }

    const whitePaper = draft.content;
    
    // Get company name
    const initialAnalysis = inputs.initial_analysis as {
      companyName?: string;
    } | undefined;
    const companyName = initialAnalysis?.companyName || "the company";

    console.log("[AssembleExpertPanel] White paper length:", whitePaper.length);
    console.log("[AssembleExpertPanel] Company:", companyName);

    // Build prompt to assemble panel
    const prompt = `You are assembling an expert panel to review an investment white paper.

**Company:** ${companyName}

**White Paper (excerpt):**
${whitePaper.substring(0, 5000)}...

---

## YOUR TASK:

1. **Identify the Industry:** Based on the white paper content, determine the company's industry, sector, and business model.

2. **Assemble 15 Experts:** Create a panel of 15 experts who are best qualified to evaluate this specific investment opportunity. Tailor the panel to the industry and investment context.

   The panel should include experts across:
   - Industry analysts and sector specialists
   - Financial analysts (valuation, modeling, cap structure)
   - Operational experts (business model, execution risk)
   - Market strategists (competitive positioning, timing)
   - Risk managers (downside scenarios, tail risks)
   - Technical/domain experts (if applicable - e.g., biotech scientists, tech architects)
   - Investment committee members (portfolio fit, allocation)

3. **Each Expert Profile Must Include:**
   - **Name:** Full name with relevant credentials
   - **Role:** Specific area of expertise (be detailed and relevant to THIS investment)
   - **Credentials:** Professional background and experience
   - **Expertise:** Why this expert is relevant for evaluating THIS specific investment

4. **Make It Realistic:**
   - Use realistic names and credentials
   - Ensure diversity of perspectives (some bullish, some cautious)
   - Tailor each expert's background to the specific company/industry

Assemble your 15-person expert panel now.`;

    console.log("[AssembleExpertPanel] Calling GPT-4o to assemble panel...");

    const { result: completion, attempts } = await withRetry(
      async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          tools: [
            {
              type: "function",
              function: ASSEMBLE_PANEL_FUNCTION,
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "submit_expert_panel" },
          },
        });
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        logPrefix: "[AssembleExpertPanel]",
      }
    );

    console.log(`[AssembleExpertPanel] Panel assembled (${attempts} attempt${attempts > 1 ? 's' : ''})`);

    // Extract function call result
    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "submit_expert_panel") {
      throw new Error("GPT did not return expert panel");
    }

    const result = JSON.parse(toolCall.function.arguments) as {
      industry: string;
      experts: Omit<ExpertProfile, 'index'>[];
    };

    // Validate
    if (!result.experts || result.experts.length !== 15) {
      throw new Error(`Must have exactly 15 experts, got ${result.experts?.length || 0}`);
    }

    for (let i = 0; i < result.experts.length; i++) {
      const expert = result.experts[i];
      if (!expert.name || !expert.role || !expert.credentials || !expert.expertise) {
        throw new Error(`Expert ${i + 1}: missing required fields`);
      }
    }

    // Assign indices to experts (1-15)
    const expertsWithIndices: ExpertProfile[] = result.experts.map((expert, i) => ({
      index: i + 1,
      ...expert,
    }));

    console.log("[AssembleExpertPanel] ✅ Expert panel assembled:");
    console.log(`[AssembleExpertPanel] - Industry: ${result.industry}`);
    console.log(`[AssembleExpertPanel] - 15 experts selected`);
    expertsWithIndices.forEach((e) => {
      console.log(`[AssembleExpertPanel]   #${e.index}. ${e.name} - ${e.role}`);
    });

    const output: AssembleExpertPanelOutput = {
      experts: expertsWithIndices,
      companyName,
      industry: result.industry,
    };

    return {
      status: "completed" as const,
      output,
    };
  },
});

export type { AssembleExpertPanelOutput, ExpertProfile };


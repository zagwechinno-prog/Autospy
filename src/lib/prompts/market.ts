import type Anthropic from "@anthropic-ai/sdk";
import { callStructured, DEFAULT_MODEL, getAnthropicClient } from "../anthropic";
import type { MarketableCapability, MarketArtifact } from "../types";

const RESEARCH_SYSTEM_PROMPT = `SYSTEM ROLE
You are the Market Intelligence Engine.

INPUT
Candidate capabilities from the capability-translation stage.

TASK
Research the real market for each capability using web search. Evaluate:
1. Demand
2. Buyer types
3. Buyer pain
4. Problem frequency
5. Economic importance
6. Existing solutions
7. Competitors
8. Freelance/consulting/service positioning
9. Typical deliverables
10. Pricing signals where reliable
11. Entry barriers
12. Differentiation opportunities
13. Market saturation
14. Evidence of current demand
15. Relevant trends

Do not treat search volume as equivalent to demand. Do not equate a high salary with
freelance or consulting opportunity. Distinguish employment demand from service demand from
consulting demand from product opportunity. Every market claim must have a source or be
clearly labeled as an inference.

OUTPUT FORMAT FOR THIS STEP
For each capability, write a section starting with "## <capability name>" covering the
dimensions above in prose or bullet points. Put the literal source URL in parentheses right
next to any claim that came from a search result. If a claim is your own inference rather
than something a source stated, say "(inference)" instead of a URL — never fabricate a URL.
End your entire response with a line that begins "SUMMARY:" followed by 2-3 sentences on
where this person's experience intersects with a real market problem. Do not recommend an
opportunity yet — this step is research, not a decision.`;

function buildResearchUserMessage(capabilities: MarketableCapability[]): string {
  const active = capabilities.filter((c) => c.reviewStatus !== "rejected");
  return `CANDIDATE CAPABILITIES TO RESEARCH:\n\n${active
    .map(
      (c, i) =>
        `${i + 1}. ${c.userEdit ?? c.capability}\n   Description: ${c.description}\n   Hypothesized buyer problems: ${c.buyerProblems.join("; ")}\n   Hypothesized buyers: ${c.potentialBuyers.join("; ")}`
    )
    .join("\n\n")}`;
}

async function runMarketResearch(capabilities: MarketableCapability[]): Promise<string> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8192,
    system: RESEARCH_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildResearchUserMessage(capabilities) }],
    tools: [
      {
        type: "web_search_20260318",
        name: "web_search",
        max_uses: 10,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");

  if (!text.trim()) {
    throw new Error("Market research returned no analysis — the model may have been unable to search.");
  }
  return text;
}

// ---------------------------------------------------------------------------
// Structured extraction pass: turn the research narrative into MarketRead[]
// ---------------------------------------------------------------------------

const EXTRACTION_SYSTEM_PROMPT = `You convert market research notes into structured data. The notes below were produced by
researching each candidate capability with live web search; URLs appear in parentheses next
to the claims they support, and "(inference)" marks claims that are the researcher's own
reasoning rather than a sourced fact.

For each capability, extract: market_demand, buyer_segments, buyer_problems,
economic_significance, existing_solutions, competitive_intensity, pricing_signals,
entry_barriers, differentiation_opportunities, current_market_signals, sources (the actual
URLs that appeared in the notes for this capability — never invent one), and
research_confidence (a short qualitative note, e.g. "several sourced claims" or "mostly
inference, no strong sources found" — never a fabricated numeric score).

Also extract the intersection_summary from the notes' final "SUMMARY:" line.

Respond only through the provided tool call.`;

const MARKET_SCHEMA = {
  type: "object" as const,
  properties: {
    reads: {
      type: "array",
      items: {
        type: "object",
        properties: {
          capability: { type: "string" },
          market_demand: { type: "string" },
          buyer_segments: { type: "array", items: { type: "string" } },
          buyer_problems: { type: "array", items: { type: "string" } },
          economic_significance: { type: "string" },
          existing_solutions: { type: "array", items: { type: "string" } },
          competitive_intensity: { type: "string" },
          pricing_signals: { type: "array", items: { type: "string" } },
          entry_barriers: { type: "array", items: { type: "string" } },
          differentiation_opportunities: { type: "array", items: { type: "string" } },
          current_market_signals: { type: "array", items: { type: "string" } },
          sources: { type: "array", items: { type: "string" } },
          research_confidence: { type: "string" },
        },
        required: [
          "capability",
          "market_demand",
          "buyer_segments",
          "buyer_problems",
          "economic_significance",
          "existing_solutions",
          "competitive_intensity",
          "pricing_signals",
          "entry_barriers",
          "differentiation_opportunities",
          "current_market_signals",
          "sources",
          "research_confidence",
        ],
      },
    },
    intersection_summary: { type: "string" },
  },
  required: ["reads", "intersection_summary"],
};

interface MarketReadToolOutput {
  capability: string;
  market_demand: string;
  buyer_segments: string[];
  buyer_problems: string[];
  economic_significance: string;
  existing_solutions: string[];
  competitive_intensity: string;
  pricing_signals: string[];
  entry_barriers: string[];
  differentiation_opportunities: string[];
  current_market_signals: string[];
  sources: string[];
  research_confidence: string;
}

interface MarketToolOutput {
  reads: MarketReadToolOutput[];
  intersection_summary: string;
}

export async function researchMarket(capabilities: MarketableCapability[]): Promise<MarketArtifact> {
  const researchNotes = await runMarketResearch(capabilities);

  const output = await callStructured<MarketToolOutput>({
    system: EXTRACTION_SYSTEM_PROMPT,
    userMessage: `RESEARCH NOTES:\n\n${researchNotes}`,
    toolName: "emit_market_reads",
    toolDescription: "Emit the structured market read per capability.",
    inputSchema: MARKET_SCHEMA,
    maxTokens: 4096,
  });

  return {
    reads: output.reads.map((r, i) => ({
      id: `${i}-${r.capability.slice(0, 24).replace(/\s+/g, "-").toLowerCase()}`,
      capability: r.capability,
      marketDemand: r.market_demand,
      buyerSegments: r.buyer_segments,
      buyerProblems: r.buyer_problems,
      economicSignificance: r.economic_significance,
      existingSolutions: r.existing_solutions,
      competitiveIntensity: r.competitive_intensity,
      pricingSignals: r.pricing_signals,
      entryBarriers: r.entry_barriers,
      differentiationOpportunities: r.differentiation_opportunities,
      currentMarketSignals: r.current_market_signals,
      sources: r.sources,
      researchConfidence: r.research_confidence,
      reviewStatus: "pending" as const,
    })),
    intersectionSummary: output.intersection_summary,
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

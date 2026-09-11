import { randomUUID } from "crypto";
import { callStructured } from "../anthropic";
import type {
  Autopsy,
  CapabilitiesArtifact,
  MarketArtifact,
  OpportunitiesArtifact,
  Profile,
  RankedOpportunity,
} from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Opportunity Ranking Engine.

INPUTS
Professional Profile, Resume Autopsy, Marketable Capabilities, Market Research.

TASK
Rank the best opportunities available to this user. Use a transparent scoring model.

DEFAULT SCORE
Opportunity Score = Demand x Buyer Value x Evidence x Fit x Accessibility
Use a 0-10 scale for each dimension. DO NOT pretend these scores are objective measurements.
They are structured decision-support estimates based on available evidence.

Evaluate: market demand, buyer economic value, user evidence, experience fit, ability to enter
the market, problem clarity, offerability, differentiation, proof potential, speed to first
validation. Fold this evaluation into the five scored dimensions and the rationale/risk text —
do not invent numbers you can't ground in the inputs given.

For every opportunity provide: score (the five dimensions), rationale, evidence, market
evidence, buyer, problem, possible outcome, potential service, major risk, proof gap,
confidence.

Define each opportunity as a specific buyer + problem + capability combination grounded in the
capabilities and market research provided — not a vague restatement of a capability name.
Produce between 3 and 5 opportunities (fewer only if fewer than 3 well-evidenced capabilities
are available), ordered by the Opportunity Score formula above, strongest first.

For the #1 opportunity (the first one in your ordered list) also produce why_ranked_first
(plain-language explanation) and what_could_change_ranking (the missing information or
assumption that could materially change the recommendation).

OUTPUT
Respond only through the provided tool call.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    opportunities: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          demand: { type: "number", minimum: 0, maximum: 10 },
          buyer_value: { type: "number", minimum: 0, maximum: 10 },
          evidence: { type: "number", minimum: 0, maximum: 10 },
          fit: { type: "number", minimum: 0, maximum: 10 },
          accessibility: { type: "number", minimum: 0, maximum: 10 },
          rationale: { type: "string" },
          evidence_text: { type: "string" },
          market_evidence: { type: "string" },
          buyer: { type: "string" },
          problem: { type: "string" },
          possible_outcome: { type: "string" },
          potential_service: { type: "string" },
          major_risk: { type: "string" },
          proof_gap: { type: "string" },
          confidence: { type: "string" },
        },
        required: [
          "title",
          "demand",
          "buyer_value",
          "evidence",
          "fit",
          "accessibility",
          "rationale",
          "evidence_text",
          "market_evidence",
          "buyer",
          "problem",
          "possible_outcome",
          "potential_service",
          "major_risk",
          "proof_gap",
          "confidence",
        ],
      },
    },
    why_ranked_first: { type: "string" },
    what_could_change_ranking: { type: "string" },
  },
  required: ["opportunities", "why_ranked_first", "what_could_change_ranking"],
};

interface OpportunityToolOutput {
  title: string;
  demand: number;
  buyer_value: number;
  evidence: number;
  fit: number;
  accessibility: number;
  rationale: string;
  evidence_text: string;
  market_evidence: string;
  buyer: string;
  problem: string;
  possible_outcome: string;
  potential_service: string;
  major_risk: string;
  proof_gap: string;
  confidence: string;
}

interface OpportunitiesToolOutput {
  opportunities: OpportunityToolOutput[];
  why_ranked_first: string;
  what_could_change_ranking: string;
}

function compositeScore(o: OpportunityToolOutput): number {
  const product = o.demand * o.buyer_value * o.evidence * o.fit * o.accessibility;
  return Math.round(Math.pow(Math.max(product, 0), 1 / 5) * 10) / 10;
}

function buildUserMessage(
  profile: Profile,
  autopsy: Autopsy,
  capabilities: CapabilitiesArtifact,
  market: MarketArtifact
): string {
  const parts: string[] = [];

  parts.push(`PROFESSIONAL IDENTITY:\n${profile.professionalIdentity}`);

  const activeStrengths = autopsy.findings.filter((f) => f.reviewStatus !== "rejected" && f.category === "strength");
  if (activeStrengths.length > 0) {
    parts.push(`RESUME AUTOPSY STRENGTHS:\n${activeStrengths.map((f) => `- ${f.userEdit ?? f.text}`).join("\n")}`);
  }
  if (autopsy.strongestDiscoveries.length > 0) {
    parts.push(`STRONGEST DISCOVERIES:\n${autopsy.strongestDiscoveries.map((d) => `- ${d}`).join("\n")}`);
  }

  const activeCapabilities = capabilities.capabilities.filter((c) => c.reviewStatus !== "rejected");
  parts.push(
    `MARKETABLE CAPABILITIES:\n${activeCapabilities
      .map(
        (c) =>
          `- ${c.userEdit ?? c.capability} [${c.evidenceStrength} evidence]: ${c.description}\n  Buyer problems: ${c.buyerProblems.join("; ")}\n  Potential buyers: ${c.potentialBuyers.join("; ")}\n  Economic value: ${c.economicValue}`
      )
      .join("\n")}`
  );

  const activeReads = market.reads.filter((r) => r.reviewStatus !== "rejected");
  parts.push(
    `MARKET RESEARCH:\n${activeReads
      .map(
        (r) =>
          `- ${r.capability}: demand=${r.marketDemand}; economic significance=${r.economicSignificance}; competitive intensity=${r.competitiveIntensity}; entry barriers=${r.entryBarriers.join("; ")}; confidence=${r.researchConfidence}`
      )
      .join("\n")}\n\nMARKET SUMMARY: ${market.intersectionSummary}`
  );

  return parts.join("\n\n");
}

export async function rankOpportunities(
  profile: Profile,
  autopsy: Autopsy,
  capabilities: CapabilitiesArtifact,
  market: MarketArtifact
): Promise<OpportunitiesArtifact> {
  const output = await callStructured<OpportunitiesToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(profile, autopsy, capabilities, market),
    toolName: "emit_opportunities",
    toolDescription: "Emit the ranked opportunities.",
    inputSchema: SCHEMA,
    maxTokens: 4096,
  });

  const opportunities: RankedOpportunity[] = output.opportunities.map((o) => ({
    id: randomUUID(),
    title: o.title,
    scores: {
      demand: o.demand,
      buyerValue: o.buyer_value,
      evidence: o.evidence,
      fit: o.fit,
      accessibility: o.accessibility,
    },
    compositeScore: compositeScore(o),
    rationale: o.rationale,
    evidence: o.evidence_text,
    marketEvidence: o.market_evidence,
    buyer: o.buyer,
    problem: o.problem,
    possibleOutcome: o.possible_outcome,
    potentialService: o.potential_service,
    majorRisk: o.major_risk,
    proofGap: o.proof_gap,
    confidence: o.confidence,
    reviewStatus: "pending" as const,
  }));

  opportunities.sort((a, b) => b.compositeScore - a.compositeScore);

  return {
    opportunities,
    whyRankedFirst: output.why_ranked_first,
    whatCouldChangeRanking: output.what_could_change_ranking,
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

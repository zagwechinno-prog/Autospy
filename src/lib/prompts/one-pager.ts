import { callStructured } from "../anthropic";
import type { MarketArtifact, OfferCritique, OfferDocument, OnePagerDocument, Profile } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Offer Asset Architect.

INPUT
Approved Offer, Professional Profile, Evidence, Market Research, Offer Review.

TASK
Generate a concise one-page sales asset. The document must be buyer-oriented. Do not write a
resume. Do not write an AI-generated biography. Do not over-explain the user's career.

STRUCTURE
1. Offer name
2. Who this is for
3. The problem
4. The outcome
5. What we do
6. What you get
7. How it works
8. Timeline
9. Why trust us
10. Starting price or pricing model
11. Call to action

COPY PRINCIPLES
Lead with buyer pain. Use concrete language. Avoid these words unless genuinely necessary:
transform, elevate, unlock, leverage, cutting-edge, revolutionary, game-changing.

Never invent: clients, testimonials, results, certifications, statistics. Use only verified
evidence from the inputs given. The one-pager should feel like a real commercial document that
could be sent to a prospect today.

OUTPUT
Respond only through the provided tool call.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    offer_name: { type: "string" },
    who_this_is_for: { type: "string" },
    the_problem: { type: "string" },
    the_outcome: { type: "string" },
    what_we_do: { type: "string" },
    what_you_get: { type: "string" },
    how_it_works: { type: "string" },
    timeline: { type: "string" },
    why_trust_us: { type: "string" },
    pricing_model: { type: "string" },
    call_to_action: { type: "string" },
  },
  required: [
    "offer_name",
    "who_this_is_for",
    "the_problem",
    "the_outcome",
    "what_we_do",
    "what_you_get",
    "how_it_works",
    "timeline",
    "why_trust_us",
    "pricing_model",
    "call_to_action",
  ],
};

interface OnePagerToolOutput {
  offer_name: string;
  who_this_is_for: string;
  the_problem: string;
  the_outcome: string;
  what_we_do: string;
  what_you_get: string;
  how_it_works: string;
  timeline: string;
  why_trust_us: string;
  pricing_model: string;
  call_to_action: string;
}

function buildUserMessage(offer: OfferDocument, profile: Profile, market: MarketArtifact, review: OfferCritique): string {
  return [
    `APPROVED OFFER:\n${JSON.stringify(offer, null, 2)}`,
    `PROFESSIONAL PROFILE — EVIDENCE:\n${profile.professionalIdentity}\n${profile.humanSummary}\nPatterns: ${profile.experiencePatterns.join("; ")}`,
    `MARKET RESEARCH SUMMARY:\n${market.intersectionSummary}`,
    `OFFER REVIEW — WHAT TO KEEP:\n${review.whatToKeep.join("; ")}\nHealth score: ${review.healthScore}/10. Ready for market test: ${review.readyForMarketTest}.`,
  ].join("\n\n");
}

export async function generateOnePager(
  offer: OfferDocument,
  profile: Profile,
  market: MarketArtifact,
  review: OfferCritique
): Promise<OnePagerDocument> {
  const output = await callStructured<OnePagerToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(offer, profile, market, review),
    toolName: "emit_one_pager",
    toolDescription: "Emit the one-page sales asset.",
    inputSchema: SCHEMA,
    maxTokens: 2048,
  });

  return {
    offerName: output.offer_name,
    whoThisIsFor: output.who_this_is_for,
    theProblem: output.the_problem,
    theOutcome: output.the_outcome,
    whatWeDo: output.what_we_do,
    whatYouGet: output.what_you_get,
    howItWorks: output.how_it_works,
    timeline: output.timeline,
    whyTrustUs: output.why_trust_us,
    pricingModel: output.pricing_model,
    callToAction: output.call_to_action,
  };
}

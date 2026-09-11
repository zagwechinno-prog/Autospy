import { callStructured } from "../anthropic";
import type { OfferCritique, OfferDocument } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Offer Critic.
Your job is to attack the offer before the user takes it to market. Do not praise it
automatically.

Evaluate: problem severity, buyer specificity, outcome clarity, offer specificity,
differentiation, credibility, proof, scope, pricing logic, deliverable-to-outcome
relationship, risk, ease of buying, ease of delivering, ability to validate quickly.

Attempt to disprove the offer. Ask: Why would someone NOT buy this? What is too vague? What
sounds like a commodity? What is difficult to believe? What is unnecessary? What is missing?
What would a sophisticated buyer challenge?

Then provide: critical_problems, important_improvements, optional_improvements, what_to_keep.

Then produce a revised offer (the same 13 fields as the original document). Do not silently
change the user's strategic direction — list every change that would materially alter who the
offer targets, what problem it solves, or what outcome it promises in material_changes, so the
user can approve or reject those specifically before adopting the revision. A change to
wording or scope tightening within the same direction is not material; a change of buyer,
problem, or promised outcome is.

Final output: offer_health_score (0-10, your own rubric-based judgment against the dimensions
above — say so plainly, don't dress it up as a measured statistic), ready_for_market_test
(true/false), biggest_remaining_risk, next_best_action.

OUTPUT
Respond only through the provided tool call.`;

const DOCUMENT_SCHEMA = {
  type: "object" as const,
  properties: {
    offer_name: { type: "string" },
    one_line_promise: { type: "string" },
    who_it_is_for: { type: "string" },
    problem: { type: "string" },
    outcome: { type: "string" },
    what_you_do: { type: "string" },
    what_they_receive: { type: "string" },
    timeline: { type: "string" },
    price: { type: "string" },
    why_you: { type: "string" },
    what_makes_this_different: { type: "string" },
    what_is_not_included: { type: "string" },
    call_to_action: { type: "string" },
  },
  required: [
    "offer_name",
    "one_line_promise",
    "who_it_is_for",
    "problem",
    "outcome",
    "what_you_do",
    "what_they_receive",
    "timeline",
    "price",
    "why_you",
    "what_makes_this_different",
    "what_is_not_included",
    "call_to_action",
  ],
};

const SCHEMA = {
  type: "object" as const,
  properties: {
    critical_problems: { type: "array", items: { type: "string" } },
    important_improvements: { type: "array", items: { type: "string" } },
    optional_improvements: { type: "array", items: { type: "string" } },
    what_to_keep: { type: "array", items: { type: "string" } },
    revised_offer: DOCUMENT_SCHEMA,
    material_changes: { type: "array", items: { type: "string" } },
    offer_health_score: { type: "number", minimum: 0, maximum: 10 },
    ready_for_market_test: { type: "boolean" },
    biggest_remaining_risk: { type: "string" },
    next_best_action: { type: "string" },
  },
  required: [
    "critical_problems",
    "important_improvements",
    "optional_improvements",
    "what_to_keep",
    "revised_offer",
    "material_changes",
    "offer_health_score",
    "ready_for_market_test",
    "biggest_remaining_risk",
    "next_best_action",
  ],
};

interface DocumentToolOutput {
  offer_name: string;
  one_line_promise: string;
  who_it_is_for: string;
  problem: string;
  outcome: string;
  what_you_do: string;
  what_they_receive: string;
  timeline: string;
  price: string;
  why_you: string;
  what_makes_this_different: string;
  what_is_not_included: string;
  call_to_action: string;
}

interface CritiqueToolOutput {
  critical_problems: string[];
  important_improvements: string[];
  optional_improvements: string[];
  what_to_keep: string[];
  revised_offer: DocumentToolOutput;
  material_changes: string[];
  offer_health_score: number;
  ready_for_market_test: boolean;
  biggest_remaining_risk: string;
  next_best_action: string;
}

function toDocument(d: DocumentToolOutput): OfferDocument {
  return {
    offerName: d.offer_name,
    oneLinePromise: d.one_line_promise,
    whoItIsFor: d.who_it_is_for,
    problem: d.problem,
    outcome: d.outcome,
    whatYouDo: d.what_you_do,
    whatTheyReceive: d.what_they_receive,
    timeline: d.timeline,
    price: d.price,
    whyYou: d.why_you,
    whatMakesThisDifferent: d.what_makes_this_different,
    whatIsNotIncluded: d.what_is_not_included,
    callToAction: d.call_to_action,
  };
}

export async function critiqueOffer(offer: OfferDocument): Promise<OfferCritique> {
  const output = await callStructured<CritiqueToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: `CURRENT OFFER:\n${JSON.stringify(offer, null, 2)}`,
    toolName: "emit_offer_critique",
    toolDescription: "Emit the offer critique and revised offer.",
    inputSchema: SCHEMA,
    maxTokens: 4096,
  });

  return {
    criticalProblems: output.critical_problems,
    importantImprovements: output.important_improvements,
    optionalImprovements: output.optional_improvements,
    whatToKeep: output.what_to_keep,
    revisedOffer: toDocument(output.revised_offer),
    materialChanges: output.material_changes,
    healthScore: output.offer_health_score,
    readyForMarketTest: output.ready_for_market_test,
    biggestRemainingRisk: output.biggest_remaining_risk,
    nextBestAction: output.next_best_action,
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

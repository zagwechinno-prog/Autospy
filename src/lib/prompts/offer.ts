import { callStructured } from "../anthropic";
import type { ActionPlanArtifact, MarketArtifact, Offer, OfferPrefillKey, Profile, SelectedDirection } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Offer Architect.

INPUT
SELECTED_DIRECTION, the 4-week path, the Professional Profile, and Market Research.

TASK
Design the first credible version of the user's offer. Do not create a generic "consulting
package." Construct the offer from: WHO -> PROBLEM -> OUTCOME -> MECHANISM -> DELIVERABLES ->
PROOF -> SCOPE -> TIMELINE -> PRICE -> RISK REDUCTION.

Generate the first offer automatically. Do not make the user fill eight empty fields.

PRE-FILL each of: target customer, problem, desired outcome, service, deliverables, timeline,
pricing hypothesis, proof, positioning. For every one of these nine fields provide a
recommendation, why, evidence, and confidence.

Then produce the offer document: offer name, one-line promise, who it is for, problem, outcome,
what you do, what they receive, timeline, price, why you, what makes this different, what is
not included, call to action.

IMPORTANT
Never guarantee a financial result unless supported by evidence. Pricing is a hypothesis unless
verified by real market data — say so explicitly in the price field and the pricing_hypothesis
prefill rather than stating a number as if it were confirmed. The user must be able to edit
every recommendation; write plainly enough that editing is easy.

OUTPUT
Respond only through the provided tool call.`;

const PREFILL_FIELD_SCHEMA = {
  type: "object" as const,
  properties: {
    recommendation: { type: "string" },
    why: { type: "string" },
    evidence: { type: "string" },
    confidence: { type: "string" },
  },
  required: ["recommendation", "why", "evidence", "confidence"],
};

const SCHEMA = {
  type: "object" as const,
  properties: {
    prefill: {
      type: "object",
      properties: {
        target_customer: PREFILL_FIELD_SCHEMA,
        problem: PREFILL_FIELD_SCHEMA,
        desired_outcome: PREFILL_FIELD_SCHEMA,
        service: PREFILL_FIELD_SCHEMA,
        deliverables: PREFILL_FIELD_SCHEMA,
        timeline: PREFILL_FIELD_SCHEMA,
        pricing_hypothesis: PREFILL_FIELD_SCHEMA,
        proof: PREFILL_FIELD_SCHEMA,
        positioning: PREFILL_FIELD_SCHEMA,
      },
      required: [
        "target_customer",
        "problem",
        "desired_outcome",
        "service",
        "deliverables",
        "timeline",
        "pricing_hypothesis",
        "proof",
        "positioning",
      ],
    },
    document: {
      type: "object",
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
    },
  },
  required: ["prefill", "document"],
};

interface PrefillFieldOutput {
  recommendation: string;
  why: string;
  evidence: string;
  confidence: string;
}

interface OfferToolOutput {
  prefill: Record<
    | "target_customer"
    | "problem"
    | "desired_outcome"
    | "service"
    | "deliverables"
    | "timeline"
    | "pricing_hypothesis"
    | "proof"
    | "positioning",
    PrefillFieldOutput
  >;
  document: {
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
  };
}

const PREFILL_KEY_MAP: Record<OfferPrefillKey, keyof OfferToolOutput["prefill"]> = {
  targetCustomer: "target_customer",
  problem: "problem",
  desiredOutcome: "desired_outcome",
  service: "service",
  deliverables: "deliverables",
  timeline: "timeline",
  pricingHypothesis: "pricing_hypothesis",
  proof: "proof",
  positioning: "positioning",
};

function buildUserMessage(direction: SelectedDirection, actionPlan: ActionPlanArtifact, profile: Profile, market: MarketArtifact): string {
  return [
    `SELECTED_DIRECTION:\n${JSON.stringify(direction, null, 2)}`,
    `4-WEEK PATH:\n${JSON.stringify(actionPlan.weeks, null, 2)}`,
    `PROFESSIONAL PROFILE — IDENTITY:\n${profile.professionalIdentity}\n${profile.humanSummary}`,
    `MARKET RESEARCH SUMMARY:\n${market.intersectionSummary}`,
  ].join("\n\n");
}

export async function architectOffer(
  direction: SelectedDirection,
  actionPlan: ActionPlanArtifact,
  profile: Profile,
  market: MarketArtifact
): Promise<Offer> {
  const output = await callStructured<OfferToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(direction, actionPlan, profile, market),
    toolName: "emit_offer",
    toolDescription: "Emit the pre-filled offer fields and the offer document.",
    inputSchema: SCHEMA,
    maxTokens: 4096,
  });

  const prefill = (Object.keys(PREFILL_KEY_MAP) as OfferPrefillKey[]).reduce(
    (acc, key) => {
      const raw = output.prefill[PREFILL_KEY_MAP[key]];
      acc[key] = {
        recommendation: raw.recommendation,
        why: raw.why,
        evidence: raw.evidence,
        confidence: raw.confidence,
      };
      return acc;
    },
    {} as Offer["prefill"]
  );

  return {
    prefill,
    document: {
      offerName: output.document.offer_name,
      oneLinePromise: output.document.one_line_promise,
      whoItIsFor: output.document.who_it_is_for,
      problem: output.document.problem,
      outcome: output.document.outcome,
      whatYouDo: output.document.what_you_do,
      whatTheyReceive: output.document.what_they_receive,
      timeline: output.document.timeline,
      price: output.document.price,
      whyYou: output.document.why_you,
      whatMakesThisDifferent: output.document.what_makes_this_different,
      whatIsNotIncluded: output.document.what_is_not_included,
      callToAction: output.document.call_to_action,
    },
    userEdits: {},
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

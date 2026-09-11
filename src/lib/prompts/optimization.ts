import { callStructured } from "../anthropic";
import { OPTIMIZATION_DECISIONS } from "../types";
import type { OfferDocument, OptimizationArtifact, ProspectsArtifact, ResponseAnalysis } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Offer Optimization Engine.

INPUT
Original Offer, Prospect Research, Outreach Data, Responses, Objections, Meetings,
Conversions, User observations.

TASK
Determine whether the offer should be: KEEP, REFINE, REPOSITION, NARROW, EXPAND, REPRICE,
RETARGET, or REJECT.

Do not optimize based on one response. Look for repeated evidence across the logged responses.
If the sample is too small to support a confident change, say so and lean toward KEEP with a
note on what more evidence would be needed.

Evaluate: target customer, problem, promise, outcome, mechanism, scope, proof, price,
positioning, outreach. For each variable you recommend changing, explain: what changes, why,
evidence, expected effect, risk, confidence. Do not change multiple major variables
simultaneously unless the evidence clearly demands it — prefer controlled experimentation over
a full rewrite.

Then produce Version 2 of the offer (the same 13 fields as the original document) — if the
decision is KEEP, Version 2 should be identical to the original except for genuinely minor
wording fixes.

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
    decision: { type: "string", enum: OPTIMIZATION_DECISIONS as unknown as string[] },
    decision_rationale: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          variable: { type: "string" },
          what_changes: { type: "string" },
          why: { type: "string" },
          evidence: { type: "string" },
          expected_effect: { type: "string" },
          risk: { type: "string" },
          confidence: { type: "string" },
        },
        required: ["variable", "what_changes", "why", "evidence", "expected_effect", "risk", "confidence"],
      },
    },
    after_offer: DOCUMENT_SCHEMA,
  },
  required: ["decision", "decision_rationale", "changes", "after_offer"],
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

interface OptimizationToolOutput {
  decision: OptimizationArtifact["decision"];
  decision_rationale: string;
  changes: {
    variable: string;
    what_changes: string;
    why: string;
    evidence: string;
    expected_effect: string;
    risk: string;
    confidence: string;
  }[];
  after_offer: DocumentToolOutput;
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

function buildUserMessage(
  offer: OfferDocument,
  prospects: ProspectsArtifact,
  response: ResponseAnalysis,
  userObservations: string
): string {
  const meetings = response.entries.filter((e) => e.category === "meeting_booked").length;
  const conversions = response.entries.filter((e) => e.category === "converted").length;

  return [
    `ORIGINAL OFFER:\n${JSON.stringify(offer, null, 2)}`,
    `PROSPECT RESEARCH — ICP:\n${JSON.stringify(prospects.icp, null, 2)}`,
    `RESPONSES LOGGED: ${response.entries.length}. MEETINGS BOOKED: ${meetings}. CONVERSIONS: ${conversions}.`,
    `RESPONSE ANALYSIS:\nFeedback summary: ${response.feedbackSummary}\nPatterns: ${response.patterns.join("; ")}\nBuyer language: ${response.buyerLanguage.join("; ")}\nObjections: ${response.objections.join("; ")}\nSignals of demand: ${response.signalsOfDemand.join("; ")}\nSignals of weak demand: ${response.signalsOfWeakDemand.join("; ")}\nRecommended changes: ${response.recommendedChanges.join("; ")}\nConfidence: ${response.confidence}`,
    `USER OBSERVATIONS:\n${userObservations || "(none provided)"}`,
  ].join("\n\n");
}

export async function optimizeOffer(
  offer: OfferDocument,
  prospects: ProspectsArtifact,
  response: ResponseAnalysis,
  userObservations: string
): Promise<OptimizationArtifact> {
  const output = await callStructured<OptimizationToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(offer, prospects, response, userObservations),
    toolName: "emit_optimization",
    toolDescription: "Emit the offer optimization decision, changes, and Version 2 offer.",
    inputSchema: SCHEMA,
    maxTokens: 4096,
  });

  return {
    decision: output.decision,
    decisionRationale: output.decision_rationale,
    changes: output.changes.map((c) => ({
      variable: c.variable,
      whatChanges: c.what_changes,
      why: c.why,
      evidence: c.evidence,
      expectedEffect: c.expected_effect,
      risk: c.risk,
      confidence: c.confidence,
    })),
    beforeOffer: offer,
    afterOffer: toDocument(output.after_offer),
    userObservations,
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

import { callStructured } from "../anthropic";
import type { LoopSnapshot, OpportunitySession } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Opportunity Operating System.
Your job is to maintain the user's evolving opportunity — not to generate more content, but to
increase the probability that the user finds a viable market opportunity and turns it into
sustainable economic activity.

INPUT
Whatever the user has completed so far across: Experience, Capabilities, Market, Opportunity,
Offer, Prospects, Outreach, Responses, Results. Some of these may not exist yet — do not
pretend they do. If a section is missing, say plainly that it hasn't happened yet rather than
inventing content for it.

TASK
Maintain a living Opportunity Profile. Track: what we know, what we inferred, what we tested,
what worked, what failed, what remains uncertain, what changed, what should happen next.

Then answer, for this iteration specifically:
1. What did we learn?
2. What changed?
3. What evidence supports the change?
4. What should remain unchanged?
5. What should we test next?
6. What is the highest-value next action?

Do not endlessly optimize copy. Prioritize changes that improve: problem clarity, buyer fit,
offer value, proof, conversion, delivery feasibility, economics.

OUTPUT
Respond only through the provided tool call.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    what_we_know: { type: "array", items: { type: "string" } },
    what_we_inferred: { type: "array", items: { type: "string" } },
    what_we_tested: { type: "array", items: { type: "string" } },
    what_worked: { type: "array", items: { type: "string" } },
    what_failed: { type: "array", items: { type: "string" } },
    what_remains_uncertain: { type: "array", items: { type: "string" } },
    what_changed: { type: "array", items: { type: "string" } },
    what_should_happen_next: { type: "array", items: { type: "string" } },
    learned_this_iteration: { type: "string" },
    evidence_for_change: { type: "string" },
    what_should_remain_unchanged: { type: "string" },
    what_to_test_next: { type: "string" },
    highest_value_next_action: { type: "string" },
  },
  required: [
    "what_we_know",
    "what_we_inferred",
    "what_we_tested",
    "what_worked",
    "what_failed",
    "what_remains_uncertain",
    "what_changed",
    "what_should_happen_next",
    "learned_this_iteration",
    "evidence_for_change",
    "what_should_remain_unchanged",
    "what_to_test_next",
    "highest_value_next_action",
  ],
};

interface LoopToolOutput {
  what_we_know: string[];
  what_we_inferred: string[];
  what_we_tested: string[];
  what_worked: string[];
  what_failed: string[];
  what_remains_uncertain: string[];
  what_changed: string[];
  what_should_happen_next: string[];
  learned_this_iteration: string;
  evidence_for_change: string;
  what_should_remain_unchanged: string;
  what_to_test_next: string;
  highest_value_next_action: string;
}

function buildSessionSummary(session: OpportunitySession): string {
  const parts: string[] = [];

  if (session.experience) {
    parts.push(`EXPERIENCE: logged.`);
  }
  if (session.profile?.approved) {
    parts.push(`PROFILE: ${session.profile.professionalIdentity}\n${session.profile.humanSummary}`);
  }
  if (session.autopsy?.approved) {
    parts.push(`AUTOPSY: ${session.autopsy.headline} (${session.autopsy.strongestDiscoveries.join("; ")})`);
  }
  if (session.capabilities?.approved) {
    parts.push(
      `CAPABILITIES: ${session.capabilities.capabilities
        .filter((c) => c.reviewStatus !== "rejected")
        .map((c) => c.userEdit ?? c.capability)
        .join("; ")}`
    );
  }
  if (session.market?.approved) {
    parts.push(`MARKET: ${session.market.intersectionSummary}`);
  }
  if (session.opportunities?.approved) {
    const top = session.opportunities.opportunities.find((o) => o.reviewStatus !== "rejected");
    parts.push(`OPPORTUNITIES: top-ranked was "${top?.title}" (score ${top?.compositeScore}/10).`);
  }
  if (session.direction?.selected) {
    parts.push(
      `DIRECTION SELECTED: ${session.direction.selected.opportunity} — ${session.direction.selected.reasonSelected}`
    );
  }
  if (session.actionPlan?.approved) {
    parts.push(`ACTION PLAN: approved, 4 weeks (VALIDATE/PACKAGE/PROVE/SELL).`);
  }
  if (session.offer?.approved) {
    const doc = { ...session.offer.document, ...session.offer.userEdits };
    parts.push(`OFFER: "${doc.offerName}" — ${doc.oneLinePromise}`);
  }
  if (session.review?.approved) {
    parts.push(
      `OFFER REVIEW: health score ${session.review.healthScore}/10, ready for market test: ${session.review.readyForMarketTest}, decision: ${session.review.decision ?? "not yet decided"}.`
    );
  }
  if (session.onePager?.approved) {
    parts.push(`ONE-PAGER: approved.`);
  }
  if (session.prospects?.approved) {
    parts.push(
      `PROSPECTS: ${session.prospects.prospects.filter((p) => p.reviewStatus !== "rejected").length} approved, ICP: ${session.prospects.icp.industry} / ${session.prospects.icp.businessModel}.`
    );
  }
  if (session.outreach?.approved) {
    parts.push(`OUTREACH: drafted for ${session.outreach.prospectOutreach.length} prospects.`);
  }
  if (session.response?.approved) {
    parts.push(
      `RESPONSES: ${session.response.entries.length} logged. Feedback summary: ${session.response.feedbackSummary}\nPatterns: ${session.response.patterns.join("; ")}\nSignals of demand: ${session.response.signalsOfDemand.join("; ")}\nSignals of weak demand: ${session.response.signalsOfWeakDemand.join("; ")}`
    );
  }
  if (session.optimization?.approved) {
    parts.push(
      `OPTIMIZATION: decision ${session.optimization.decision} — ${session.optimization.decisionRationale} (adopted: ${session.optimization.adopted ?? false})`
    );
  }

  if (parts.length === 0) {
    parts.push("Nothing has been completed yet beyond starting the pipeline.");
  }

  return parts.join("\n\n");
}

export async function synthesizeLoop(session: OpportunitySession): Promise<LoopSnapshot> {
  const output = await callStructured<LoopToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildSessionSummary(session),
    toolName: "emit_loop_snapshot",
    toolDescription: "Emit the living Opportunity Profile snapshot.",
    inputSchema: SCHEMA,
    maxTokens: 3072,
  });

  return {
    whatWeKnow: output.what_we_know,
    whatWeInferred: output.what_we_inferred,
    whatWeTested: output.what_we_tested,
    whatWorked: output.what_worked,
    whatFailed: output.what_failed,
    whatRemainsUncertain: output.what_remains_uncertain,
    whatChanged: output.what_changed,
    whatShouldHappenNext: output.what_should_happen_next,
    learnedThisIteration: output.learned_this_iteration,
    evidenceForChange: output.evidence_for_change,
    whatShouldRemainUnchanged: output.what_should_remain_unchanged,
    whatToTestNext: output.what_to_test_next,
    highestValueNextAction: output.highest_value_next_action,
    generatedAt: new Date().toISOString(),
  };
}

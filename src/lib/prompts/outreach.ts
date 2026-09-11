import { callStructured } from "../anthropic";
import type { OfferDocument, OnePagerDocument, OutreachArtifact, Profile, Prospect } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Outreach Strategist.

INPUT
Approved Offer, One-Pager, Prospect List, Professional Evidence.

TASK
Create a prospect-specific outreach system. Do not write generic mass outreach. The message
must be based on: OBSERVATION -> PROBLEM HYPOTHESIS -> RELEVANT INSIGHT -> LOW-FRICTION NEXT
STEP.

For each prospect, first state: the observation (something specific and true about this
prospect from the data given — company, industry, trigger, likely problem), the problem
hypothesis it suggests, and the relevant insight from the user's own evidence that connects to
it. List every assumption you're making clearly in assumptions_labeled — do not invent
problems, recent events, company initiatives, technologies, financial results, or personal
information about the prospect; only use what was provided.

Then generate 5 messages: email, linkedin message, follow_up_1, follow_up_2, and
discovery_call_opener. The first message (email) must NOT aggressively pitch the entire
service — its purpose is to start a relevant conversation and test the problem hypothesis, not
to close. Personalize using only verified information from the prospect data given.

OUTPUT
Respond only through the provided tool call.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    prospect_outreach: {
      type: "array",
      items: {
        type: "object",
        properties: {
          prospect_id: { type: "string" },
          observation: { type: "string" },
          problem_hypothesis: { type: "string" },
          relevant_insight: { type: "string" },
          assumptions_labeled: { type: "array", items: { type: "string" } },
          email: { type: "string" },
          linkedin: { type: "string" },
          follow_up_1: { type: "string" },
          follow_up_2: { type: "string" },
          discovery_call_opener: { type: "string" },
        },
        required: [
          "prospect_id",
          "observation",
          "problem_hypothesis",
          "relevant_insight",
          "assumptions_labeled",
          "email",
          "linkedin",
          "follow_up_1",
          "follow_up_2",
          "discovery_call_opener",
        ],
      },
    },
  },
  required: ["prospect_outreach"],
};

interface ProspectOutreachToolOutput {
  prospect_id: string;
  observation: string;
  problem_hypothesis: string;
  relevant_insight: string;
  assumptions_labeled: string[];
  email: string;
  linkedin: string;
  follow_up_1: string;
  follow_up_2: string;
  discovery_call_opener: string;
}

interface OutreachToolOutput {
  prospect_outreach: ProspectOutreachToolOutput[];
}

function buildUserMessage(offer: OfferDocument, onePager: OnePagerDocument, prospects: Prospect[], profile: Profile): string {
  return [
    `APPROVED OFFER:\n${JSON.stringify(offer, null, 2)}`,
    `ONE-PAGER:\n${JSON.stringify(onePager, null, 2)}`,
    `PROSPECTS (use the exact id field for prospect_id):\n${JSON.stringify(
      prospects.map((p) => ({
        id: p.id,
        company: p.userEdit ?? p.company,
        industry: p.industry,
        likelyBuyer: p.likelyBuyer,
        whyTheyFit: p.whyTheyFit,
        relevantTrigger: p.relevantTrigger,
        likelyProblem: p.likelyProblem,
        personalizationAngle: p.personalizationAngle,
        verification: p.verification,
      })),
      null,
      2
    )}`,
    `PROFESSIONAL EVIDENCE:\n${profile.professionalIdentity}\n${profile.humanSummary}`,
  ].join("\n\n");
}

export async function generateOutreach(
  offer: OfferDocument,
  onePager: OnePagerDocument,
  prospects: Prospect[],
  profile: Profile
): Promise<OutreachArtifact> {
  const output = await callStructured<OutreachToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(offer, onePager, prospects, profile),
    toolName: "emit_outreach",
    toolDescription: "Emit the per-prospect outreach sequences.",
    inputSchema: SCHEMA,
    maxTokens: 8192,
  });

  const prospectById = new Map(prospects.map((p) => [p.id, p]));

  return {
    prospectOutreach: output.prospect_outreach.map((po) => ({
      prospectId: po.prospect_id,
      prospectName: prospectById.get(po.prospect_id)?.company ?? po.prospect_id,
      observation: po.observation,
      problemHypothesis: po.problem_hypothesis,
      relevantInsight: po.relevant_insight,
      assumptionsLabeled: po.assumptions_labeled,
      messages: [
        { type: "email" as const, content: po.email },
        { type: "linkedin" as const, content: po.linkedin },
        { type: "follow_up_1" as const, content: po.follow_up_1 },
        { type: "follow_up_2" as const, content: po.follow_up_2 },
        { type: "discovery_call_opener" as const, content: po.discovery_call_opener },
      ],
    })),
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

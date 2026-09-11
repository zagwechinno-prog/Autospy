import { randomUUID } from "crypto";
import { callStructured } from "../anthropic";
import { CORE_RULES } from "./shared";
import type { Autopsy, ExperienceIntake, Profile } from "../types";
import { EVIDENCE_TAGS } from "../types";

const SYSTEM_PROMPT = `${CORE_RULES}

STAGE: AUTOPSY

Input: the original Experience Intake, plus an already human-approved Opportunity Profile
(capability statements the user has confirmed or edited — treat these as ground truth about
how the user wants to be described).

Task: perform an autopsy on the experience — cut past job titles and activities to what is
actually underneath them. For each of 4-8 of the most significant roles/projects/activities
in the input, produce a finding with:
- stated_role: the job title or activity as the user described it.
- real_capability: what that role actually made the person capable of doing for a buyer,
  independent of the title (CAPABILITY OVER JOB TITLE).
- problem_solved: the concrete problem this capability solves for someone, stated as their
  problem, not the user's task (PROBLEM OVER SKILL).
- outcome_delivered: what changed for the buyer/organization as a result (OUTCOME OVER
  ACTIVITY). If the input does not state a measurable outcome, describe the qualitative
  change and tag accordingly rather than inventing a number.
- evidence_tag and evidence_quote per the rules above.

Also produce:
- pattern_summary: 2-4 sentences naming the recurring pattern underneath these findings — the
  underlying operating instinct connecting them (e.g. repeatedly finding the system inside a
  fragmented process, repeatedly turning informal judgment into explicit structure). Ground
  this in the findings themselves, do not introduce new claims.
- economic_capability_summary: 2-3 sentences stating, in plain commercial language, what this
  person can credibly be paid to do right now — not their job title, their capability.

Do not invent roles, employers, achievements, or metrics beyond what is given.`;

const INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stated_role: { type: "string" },
          real_capability: { type: "string" },
          problem_solved: { type: "string" },
          outcome_delivered: { type: "string" },
          evidence_tag: { type: "string", enum: EVIDENCE_TAGS as unknown as string[] },
          evidence_quote: { type: "string" },
        },
        required: [
          "stated_role",
          "real_capability",
          "problem_solved",
          "outcome_delivered",
          "evidence_tag",
          "evidence_quote",
        ],
      },
    },
    pattern_summary: { type: "string" },
    economic_capability_summary: { type: "string" },
  },
  required: ["findings", "pattern_summary", "economic_capability_summary"],
};

interface AutopsyToolOutput {
  findings: {
    stated_role: string;
    real_capability: string;
    problem_solved: string;
    outcome_delivered: string;
    evidence_tag: Autopsy["findings"][number]["evidenceTag"];
    evidence_quote: string;
  }[];
  pattern_summary: string;
  economic_capability_summary: string;
}

function buildUserMessage(experience: ExperienceIntake, profile: Profile): string {
  const parts: string[] = [];
  if (experience.rawNarrative.trim()) {
    parts.push(`NARRATIVE:\n${experience.rawNarrative.trim()}`);
  }
  if (experience.roles.length > 0) {
    const roles = experience.roles
      .map(
        (r) =>
          `- ${r.title} @ ${r.organization}${r.period ? ` (${r.period})` : ""}${
            r.description ? `: ${r.description}` : ""
          }`
      )
      .join("\n");
    parts.push(`ROLES:\n${roles}`);
  }
  if (experience.achievements.length > 0) {
    parts.push(`ACHIEVEMENTS:\n${experience.achievements.map((a) => `- ${a}`).join("\n")}`);
  }

  const effectiveCapabilities = profile.capabilities
    .filter((c) => c.reviewStatus !== "rejected")
    .map((c) => `- [${c.evidenceTag}] ${c.userEdit ?? c.statement} (evidence: ${c.evidenceQuote})`);

  parts.push(`APPROVED PROFILE — IDENTITY SUMMARY:\n${profile.identitySummary}`);
  parts.push(`APPROVED PROFILE — CAPABILITIES:\n${effectiveCapabilities.join("\n")}`);

  return parts.join("\n\n");
}

export async function synthesizeAutopsy(
  experience: ExperienceIntake,
  profile: Profile
): Promise<Autopsy> {
  const output = await callStructured<AutopsyToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(experience, profile),
    toolName: "emit_autopsy",
    toolDescription: "Emit the structured Autopsy findings synthesized from the experience and approved profile.",
    inputSchema: INPUT_SCHEMA,
    maxTokens: 4096,
  });

  return {
    patternSummary: output.pattern_summary,
    economicCapabilitySummary: output.economic_capability_summary,
    findings: output.findings.map((f) => ({
      id: randomUUID(),
      statedRole: f.stated_role,
      realCapability: f.real_capability,
      problemSolved: f.problem_solved,
      outcomeDelivered: f.outcome_delivered,
      evidenceTag: f.evidence_tag,
      evidenceQuote: f.evidence_quote,
      reviewStatus: "pending" as const,
    })),
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

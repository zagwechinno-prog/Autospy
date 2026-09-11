import { randomUUID } from "crypto";
import { callStructured } from "../anthropic";
import { CORE_RULES } from "./shared";
import type { ExperienceIntake, Profile } from "../types";
import { EVIDENCE_TAGS } from "../types";

const SYSTEM_PROMPT = `${CORE_RULES}

STAGE: PROFILE

Input: a raw Experience Intake (free-text narrative, plus optionally structured roles and
achievements) describing what the user has actually done.

Task: synthesize this into a structured Opportunity Profile:
- identity_summary: 2-4 sentences describing the person by the PATTERN of work underneath
  their roles, not by their job titles or industries. Ground it in what they actually did.
- domains: 3-6 short labels for the territories their work has crossed (e.g. "financial
  operations", "ecommerce & brand", "AI/ML infrastructure") — only domains with real
  evidence in the input.
- capabilities: 5-10 capability statements. Each one should read as something a buyer would
  pay for, phrased as "can do X for Y kind of problem/buyer" rather than "knows X" or "was a
  X." Tag each with evidence_tag and evidence_quote per the rules above.
- open_questions: up to 5 short questions about missing information that would materially
  change the profile if answered (only ask what actually matters — do not ask generic
  questions the input already answers).

Do not invent roles, employers, achievements, or metrics beyond what is given.`;

const INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    identity_summary: { type: "string" },
    domains: { type: "array", items: { type: "string" } },
    capabilities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          statement: { type: "string" },
          domain: { type: "string" },
          evidence_tag: { type: "string", enum: EVIDENCE_TAGS as unknown as string[] },
          evidence_quote: { type: "string" },
        },
        required: ["statement", "domain", "evidence_tag", "evidence_quote"],
      },
    },
    open_questions: { type: "array", items: { type: "string" } },
  },
  required: ["identity_summary", "domains", "capabilities", "open_questions"],
};

interface ProfileToolOutput {
  identity_summary: string;
  domains: string[];
  capabilities: {
    statement: string;
    domain: string;
    evidence_tag: Profile["capabilities"][number]["evidenceTag"];
    evidence_quote: string;
  }[];
  open_questions: string[];
}

function buildUserMessage(experience: ExperienceIntake): string {
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
  if (experience.notes?.trim()) {
    parts.push(`ADDITIONAL NOTES:\n${experience.notes.trim()}`);
  }
  return parts.join("\n\n");
}

export async function synthesizeProfile(experience: ExperienceIntake): Promise<Profile> {
  const output = await callStructured<ProfileToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(experience),
    toolName: "emit_profile",
    toolDescription: "Emit the structured Opportunity Profile synthesized from the experience intake.",
    inputSchema: INPUT_SCHEMA,
    maxTokens: 4096,
  });

  return {
    identitySummary: output.identity_summary,
    domains: output.domains,
    capabilities: output.capabilities.map((c) => ({
      id: randomUUID(),
      statement: c.statement,
      domain: c.domain,
      evidenceTag: c.evidence_tag,
      evidenceQuote: c.evidence_quote,
      reviewStatus: "pending" as const,
    })),
    openQuestions: output.open_questions,
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

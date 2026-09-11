import { randomUUID } from "crypto";
import { callStructured } from "../anthropic";
import type { Autopsy, AutopsyCategory, ExperienceIntake } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Resume Autopsy Engine.
Your purpose is to identify what the resume reveals, hides, weakens, or fails to communicate.
Do not behave like an ATS checker. Analyze the resume as evidence of economic capability.

Evaluate:
1. Evidence density
2. Specificity
3. Measurable outcomes
4. Problem-solving evidence
5. Commercial value
6. Operational value
7. Transferability
8. Differentiation
9. Credibility
10. Missing evidence
11. Generic language
12. Underused experience
13. Hidden capabilities
14. Possible positioning weaknesses

Identify: strongest evidence, weakest evidence, hidden value, repeated patterns, unexplained
gaps, generic descriptions, capabilities the user may be under-positioning.

Do not rewrite the resume unless specifically requested. The goal is discovery, not document
editing. Every finding must be a specific, evidence-grounded statement about THIS resume — not
generic resume-writing advice.

OUTPUT
Populate strengths, weaknesses, hidden_value, under_positioned_capabilities, generic_claims,
missing_evidence, high_value_evidence, patterns, risks, and opportunity_clues. Then identify
the 3 strongest discoveries — the most valuable, most evidence-grounded findings across all
categories, written so a person could immediately see why each one matters. Respond only
through the provided tool call. Use an empty array for any category with nothing to report —
never invent a finding to avoid an empty array.`;

const AUTOPSY_SCHEMA = {
  type: "object" as const,
  properties: {
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    hidden_value: { type: "array", items: { type: "string" } },
    under_positioned_capabilities: { type: "array", items: { type: "string" } },
    generic_claims: { type: "array", items: { type: "string" } },
    missing_evidence: { type: "array", items: { type: "string" } },
    high_value_evidence: { type: "array", items: { type: "string" } },
    patterns: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    opportunity_clues: { type: "array", items: { type: "string" } },
    strongest_discoveries: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
      description: "Exactly 3 of the strongest discoveries above, drawn verbatim or near-verbatim from the categorized findings.",
    },
  },
  required: [
    "strengths",
    "weaknesses",
    "hidden_value",
    "under_positioned_capabilities",
    "generic_claims",
    "missing_evidence",
    "high_value_evidence",
    "patterns",
    "risks",
    "opportunity_clues",
    "strongest_discoveries",
  ],
};

interface AutopsyToolOutput {
  strengths: string[];
  weaknesses: string[];
  hidden_value: string[];
  under_positioned_capabilities: string[];
  generic_claims: string[];
  missing_evidence: string[];
  high_value_evidence: string[];
  patterns: string[];
  risks: string[];
  opportunity_clues: string[];
  strongest_discoveries: string[];
}

const CATEGORY_ORDER: { key: keyof Omit<AutopsyToolOutput, "strongest_discoveries">; category: AutopsyCategory }[] = [
  { key: "strengths", category: "strength" },
  { key: "weaknesses", category: "weakness" },
  { key: "hidden_value", category: "hidden_value" },
  { key: "under_positioned_capabilities", category: "under_positioned" },
  { key: "generic_claims", category: "generic_claim" },
  { key: "missing_evidence", category: "missing_evidence" },
  { key: "high_value_evidence", category: "high_value_evidence" },
  { key: "patterns", category: "pattern" },
  { key: "risks", category: "risk" },
  { key: "opportunity_clues", category: "opportunity_clue" },
];

/** Categories that indicate untapped upside rather than just description. */
const HIGH_POTENTIAL_KEYS: (keyof AutopsyToolOutput)[] = [
  "hidden_value",
  "under_positioned_capabilities",
  "opportunity_clues",
  "high_value_evidence",
];

function buildSourceMaterialMessage(experience: ExperienceIntake): string {
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
    parts.push(`ADDITIONAL CONTEXT:\n${experience.notes.trim()}`);
  }
  return parts.join("\n\n");
}

export async function synthesizeAutopsy(experience: ExperienceIntake): Promise<Autopsy> {
  const output = await callStructured<AutopsyToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildSourceMaterialMessage(experience),
    toolName: "emit_autopsy",
    toolDescription: "Emit the structured resume autopsy findings.",
    inputSchema: AUTOPSY_SCHEMA,
    maxTokens: 4096,
  });

  const findings = CATEGORY_ORDER.flatMap(({ key, category }) =>
    output[key].map((text) => ({
      id: randomUUID(),
      category,
      text,
      reviewStatus: "pending" as const,
    }))
  );

  const capabilitiesIdentifiedCount = findings.length;
  const highPotentialCount = HIGH_POTENTIAL_KEYS.reduce((sum, key) => sum + output[key].length, 0);

  return {
    headline: "We found more in your experience than your resume shows.",
    capabilitiesIdentifiedCount,
    highPotentialCount,
    strongestDiscoveries: output.strongest_discoveries,
    findings,
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

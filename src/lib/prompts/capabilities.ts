import { randomUUID } from "crypto";
import { callStructured } from "../anthropic";
import type { Autopsy, ExperienceIntake, MarketableCapability, Profile } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Capability Translation Engine.
Your job is to convert experience into capabilities that could have economic value in a
market.

IMPORTANT
Do not confuse SKILL with CAPABILITY with SERVICE with OFFER.
Example:
Excel = skill
Operational reporting = capability
Reporting system implementation = service
"Replace your weekly manual reporting process with an automated management reporting system" = offer

Every capability you emit must sit at the CAPABILITY level of that ladder — not a bare skill
name, and not yet a packaged service or priced offer (those come in later stages).

TASK
For every meaningful capability:
1. Name the capability clearly.
2. Explain what it enables the user to do.
3. Identify the buyer problem it could solve.
4. Identify likely buyer types.
5. Identify evidence supporting the capability.
6. Estimate evidence strength.
7. Identify transferability.
8. Identify potential economic value.
9. Identify obvious market alternatives.
10. Identify what additional proof would strengthen it.

Generate 5-10 candidate marketable capabilities. Do not rank them solely by popularity — rank
by how well-evidenced and economically meaningful they are. Economic value must be described
qualitatively (e.g. "buyers in this category typically pay for ongoing help, not one-off
advice") — never invent a specific dollar figure, rate, or percentage that isn't given to you.

OUTPUT
Respond only through the provided tool call.`;

const CAPABILITIES_SCHEMA = {
  type: "object" as const,
  properties: {
    capabilities: {
      type: "array",
      minItems: 5,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          capability: { type: "string" },
          description: { type: "string" },
          evidence: { type: "array", items: { type: "string" } },
          evidence_strength: { type: "string", enum: ["strong", "moderate", "weak"] },
          buyer_problems: { type: "array", items: { type: "string" } },
          potential_buyers: { type: "array", items: { type: "string" } },
          transferability: { type: "string" },
          economic_value: { type: "string" },
          competitive_context: { type: "string" },
          proof_gap: { type: "string" },
          confidence: { type: "string" },
        },
        required: [
          "capability",
          "description",
          "evidence",
          "evidence_strength",
          "buyer_problems",
          "potential_buyers",
          "transferability",
          "economic_value",
          "competitive_context",
          "proof_gap",
          "confidence",
        ],
      },
    },
  },
  required: ["capabilities"],
};

interface CapabilitiesToolOutput {
  capabilities: {
    capability: string;
    description: string;
    evidence: string[];
    evidence_strength: MarketableCapability["evidenceStrength"];
    buyer_problems: string[];
    potential_buyers: string[];
    transferability: string;
    economic_value: string;
    competitive_context: string;
    proof_gap: string;
    confidence: string;
  }[];
}

function buildUserMessage(experience: ExperienceIntake, profile: Profile, autopsy: Autopsy): string {
  const parts: string[] = [];

  parts.push(`PROFESSIONAL IDENTITY:\n${profile.professionalIdentity}`);

  const activeCapabilities = profile.capabilities.filter((c) => c.reviewStatus !== "rejected");
  parts.push(
    `PROFILE CAPABILITIES (human-approved):\n${activeCapabilities
      .map((c) => `- [${c.tier}] ${c.userEdit ?? c.name}: ${c.whatUserDoes} (evidence: ${c.evidence})`)
      .join("\n")}`
  );

  if (profile.experiencePatterns.length > 0) {
    parts.push(`RECURRING PATTERNS:\n${profile.experiencePatterns.map((p) => `- ${p}`).join("\n")}`);
  }

  const activeFindings = autopsy.findings.filter((f) => f.reviewStatus !== "rejected");
  if (activeFindings.length > 0) {
    parts.push(
      `AUTOPSY FINDINGS (human-approved):\n${activeFindings
        .map((f) => `- [${f.category}] ${f.userEdit ?? f.text}`)
        .join("\n")}`
    );
  }

  if (experience.rawNarrative.trim()) {
    parts.push(`ORIGINAL NARRATIVE (for grounding):\n${experience.rawNarrative.trim()}`);
  }

  return parts.join("\n\n");
}

export async function synthesizeCapabilities(
  experience: ExperienceIntake,
  profile: Profile,
  autopsy: Autopsy
): Promise<{ capabilities: MarketableCapability[]; generatedAt: string; approved: boolean }> {
  const output = await callStructured<CapabilitiesToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(experience, profile, autopsy),
    toolName: "emit_capabilities",
    toolDescription: "Emit the 5-10 candidate marketable capabilities.",
    inputSchema: CAPABILITIES_SCHEMA,
    maxTokens: 4096,
  });

  return {
    capabilities: output.capabilities.map((c) => ({
      id: randomUUID(),
      capability: c.capability,
      description: c.description,
      evidence: c.evidence,
      evidenceStrength: c.evidence_strength,
      buyerProblems: c.buyer_problems,
      potentialBuyers: c.potential_buyers,
      transferability: c.transferability,
      economicValue: c.economic_value,
      competitiveContext: c.competitive_context,
      proofGap: c.proof_gap,
      confidence: c.confidence,
      reviewStatus: "pending" as const,
    })),
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

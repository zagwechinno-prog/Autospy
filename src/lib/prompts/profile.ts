import { randomUUID } from "crypto";
import { callStructured } from "../anthropic";
import type { CapabilityEntry, ExperienceIntake, Profile, ProfileRaw } from "../types";

const TOOL_OUTPUT_NOTE =
  "Respond only through the provided tool call. Every array should be empty (not omitted) if there is nothing to report in that category — never fabricate an entry to avoid an empty array.";

// ---------------------------------------------------------------------------
// PROMPT 01 — Experience Intake Engine
// ---------------------------------------------------------------------------

const INTAKE_SYSTEM_PROMPT = `SYSTEM ROLE
You are the Experience Intake Engine.
Your job is to transform the user's professional source material into structured evidence.

INPUTS
You may receive: resume, CV, LinkedIn profile, portfolio, work history, certifications,
project descriptions, optional user-provided context.

TASK
Extract the user's professional experience without embellishing it.
Identify:
1. Roles
2. Industries
3. Responsibilities
4. Projects
5. Achievements
6. Tools
7. Technical skills
8. Operational skills
9. Domain knowledge
10. Leadership experience
11. Commercial experience
12. Process improvement experience
13. Quantifiable outcomes
14. Repeated patterns
15. Evidence of solving problems
16. Evidence of creating measurable value

IMPORTANT
Do not merely copy keywords. Interpret the underlying work. For example: "Managed weekly
reporting for five departments" may indicate: reporting, coordination, operational management,
data synthesis, process management, stakeholder communication. But only classify these as
inferred capabilities if the evidence supports them. Do not invent proficiency levels.

OUTPUT
Every extracted claim must be traceable to source material. ${TOOL_OUTPUT_NOTE}`;

const PROFILE_RAW_SCHEMA = {
  type: "object" as const,
  properties: {
    roles: { type: "array", items: { type: "string" } },
    industries: { type: "array", items: { type: "string" } },
    responsibilities: { type: "array", items: { type: "string" } },
    projects: { type: "array", items: { type: "string" } },
    achievements: { type: "array", items: { type: "string" } },
    tools: { type: "array", items: { type: "string" } },
    skills: { type: "array", items: { type: "string" } },
    domain_knowledge: { type: "array", items: { type: "string" } },
    leadership_evidence: { type: "array", items: { type: "string" } },
    commercial_evidence: { type: "array", items: { type: "string" } },
    process_improvement_evidence: { type: "array", items: { type: "string" } },
    quantified_outcomes: { type: "array", items: { type: "string" } },
    evidence_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          source_quote: { type: "string" },
        },
        required: ["claim", "source_quote"],
      },
    },
    uncertainties: { type: "array", items: { type: "string" } },
  },
  required: [
    "roles",
    "industries",
    "responsibilities",
    "projects",
    "achievements",
    "tools",
    "skills",
    "domain_knowledge",
    "leadership_evidence",
    "commercial_evidence",
    "process_improvement_evidence",
    "quantified_outcomes",
    "evidence_items",
    "uncertainties",
  ],
};

interface ProfileRawToolOutput {
  roles: string[];
  industries: string[];
  responsibilities: string[];
  projects: string[];
  achievements: string[];
  tools: string[];
  skills: string[];
  domain_knowledge: string[];
  leadership_evidence: string[];
  commercial_evidence: string[];
  process_improvement_evidence: string[];
  quantified_outcomes: string[];
  evidence_items: { claim: string; source_quote: string }[];
  uncertainties: string[];
}

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

export async function extractProfileRaw(experience: ExperienceIntake): Promise<ProfileRaw> {
  const output = await callStructured<ProfileRawToolOutput>({
    system: INTAKE_SYSTEM_PROMPT,
    userMessage: buildSourceMaterialMessage(experience),
    toolName: "emit_profile_raw",
    toolDescription: "Emit the structured PROFILE_RAW extraction from the source material.",
    inputSchema: PROFILE_RAW_SCHEMA,
    maxTokens: 4096,
  });

  return {
    roles: output.roles,
    industries: output.industries,
    responsibilities: output.responsibilities,
    projects: output.projects,
    achievements: output.achievements,
    tools: output.tools,
    skills: output.skills,
    domainKnowledge: output.domain_knowledge,
    leadershipEvidence: output.leadership_evidence,
    commercialEvidence: output.commercial_evidence,
    processImprovementEvidence: output.process_improvement_evidence,
    quantifiedOutcomes: output.quantified_outcomes,
    evidenceItems: output.evidence_items.map((e) => ({ claim: e.claim, sourceQuote: e.source_quote })),
    uncertainties: output.uncertainties,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// PROMPT 02 — Professional Profile Architect
// ---------------------------------------------------------------------------

const PROFILE_SYSTEM_PROMPT = `SYSTEM ROLE
You are the Professional Profile Architect.

INPUT
PROFILE_RAW — a structured extraction of the user's experience.

TASK
Transform raw experience into a coherent professional capability profile. Do not write a
resume. Do not optimize the resume. Build a model of what the person can actually do.

Identify capabilities across these categories:
A. Core capabilities
B. Supporting capabilities
C. Domain expertise
D. Transferable capabilities
E. Commercial capabilities
F. Operational capabilities
G. Technical capabilities

For each capability determine: capability name, what the user actually does, evidence, likely
proficiency, confidence, industries where it may transfer, problems this capability could
potentially solve. Classify each capability into exactly one of the seven categories above
using the tier field (core | supporting | domain_expertise | transferable | commercial |
operational | technical).

Separate explicit evidence from inference: tag every capability's evidence_tag as CONFIRMED
(directly stated or unambiguous) or INFERRED (a reasonable reading, not stated outright). Do
not invent proficiency levels — likely_proficiency should be a qualitative description (e.g.
"early-stage", "demonstrated over multiple roles", "single instance"), never a fabricated
score or number.

Then generate a concise human-readable summary: "Based on your experience, you appear
strongest in..." Do not flatter the user.

OUTPUT
${TOOL_OUTPUT_NOTE}`;

const PROFILE_SCHEMA = {
  type: "object" as const,
  properties: {
    professional_identity: { type: "string" },
    human_summary: {
      type: "string",
      description: 'Starts with or clearly conveys: "Based on your experience, you appear strongest in..." Not flattering — direct and evidence-based.',
    },
    capabilities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tier: {
            type: "string",
            enum: [
              "core",
              "supporting",
              "domain_expertise",
              "transferable",
              "commercial",
              "operational",
              "technical",
            ],
          },
          name: { type: "string" },
          what_user_does: { type: "string" },
          evidence: { type: "string" },
          likely_proficiency: { type: "string" },
          evidence_tag: { type: "string", enum: ["CONFIRMED", "INFERRED"] },
          transferable_industries: { type: "array", items: { type: "string" } },
          potential_problems: { type: "array", items: { type: "string" } },
        },
        required: [
          "tier",
          "name",
          "what_user_does",
          "evidence",
          "likely_proficiency",
          "evidence_tag",
          "transferable_industries",
          "potential_problems",
        ],
      },
    },
    experience_patterns: { type: "array", items: { type: "string" } },
    potential_problem_areas: { type: "array", items: { type: "string" } },
    confidence_notes: { type: "array", items: { type: "string" } },
  },
  required: [
    "professional_identity",
    "human_summary",
    "capabilities",
    "experience_patterns",
    "potential_problem_areas",
    "confidence_notes",
  ],
};

interface ProfileToolOutput {
  professional_identity: string;
  human_summary: string;
  capabilities: {
    tier: CapabilityEntry["tier"];
    name: string;
    what_user_does: string;
    evidence: string;
    likely_proficiency: string;
    evidence_tag: CapabilityEntry["evidenceTag"];
    transferable_industries: string[];
    potential_problems: string[];
  }[];
  experience_patterns: string[];
  potential_problem_areas: string[];
  confidence_notes: string[];
}

export async function buildProfile(profileRaw: ProfileRaw): Promise<Profile> {
  const output = await callStructured<ProfileToolOutput>({
    system: PROFILE_SYSTEM_PROMPT,
    userMessage: `PROFILE_RAW:\n${JSON.stringify(profileRaw, null, 2)}`,
    toolName: "emit_profile",
    toolDescription: "Emit the structured professional capability profile built from PROFILE_RAW.",
    inputSchema: PROFILE_SCHEMA,
    maxTokens: 4096,
  });

  return {
    professionalIdentity: output.professional_identity,
    humanSummary: output.human_summary,
    capabilities: output.capabilities.map((c) => ({
      id: randomUUID(),
      tier: c.tier,
      name: c.name,
      whatUserDoes: c.what_user_does,
      evidence: c.evidence,
      likelyProficiency: c.likely_proficiency,
      evidenceTag: c.evidence_tag,
      transferableIndustries: c.transferable_industries,
      potentialProblems: c.potential_problems,
      reviewStatus: "pending" as const,
    })),
    experiencePatterns: output.experience_patterns,
    potentialProblemAreas: output.potential_problem_areas,
    confidenceNotes: output.confidence_notes,
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

export async function synthesizeProfile(
  experience: ExperienceIntake
): Promise<{ profileRaw: ProfileRaw; profile: Profile }> {
  const profileRaw = await extractProfileRaw(experience);
  const profile = await buildProfile(profileRaw);
  return { profileRaw, profile };
}

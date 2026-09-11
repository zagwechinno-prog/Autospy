import { callStructured } from "../anthropic";
import type { PriorityStatement, RankedOpportunity, SelectedDirection } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Decision Guide.
The system has already ranked opportunities. Your job is NOT to make the final decision.

TASK
Given the strongest 3-5 ranked opportunities below, write guidance of the form:
"If your priority is X, choose A." for 3 different priorities a person in this position might
actually have (for example: fastest path to first dollar, strongest long-term differentiation,
lowest risk, best fit with current evidence — pick whichever 3 priorities are genuinely most
relevant to THESE specific opportunities, not a generic template). Each statement must name one
of the candidate opportunities by its exact id and explain briefly why that priority points to
that opportunity.

Do not recommend a single overall winner beyond what the ranking already implies. Do not tell
the user which one to pick — give them the tool to decide for themselves.

OUTPUT
Respond only through the provided tool call.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    priority_statements: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          priority: { type: "string" },
          recommended_opportunity_id: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["priority", "recommended_opportunity_id", "rationale"],
      },
    },
  },
  required: ["priority_statements"],
};

interface DirectionToolOutput {
  priority_statements: { priority: string; recommended_opportunity_id: string; rationale: string }[];
}

function buildUserMessage(candidates: RankedOpportunity[]): string {
  return candidates
    .map(
      (o) =>
        `ID: ${o.id}\nTitle: ${o.userEdit ?? o.title}\nBuyer: ${o.buyer}\nProblem: ${o.problem}\nOutcome: ${o.possibleOutcome}\nOpportunity score: ${o.compositeScore}/10\nMajor risk: ${o.majorRisk}\nConfidence: ${o.confidence}`
    )
    .join("\n\n");
}

export async function generateDirectionGuidance(
  candidates: RankedOpportunity[]
): Promise<{ candidateIds: string[]; priorityStatements: PriorityStatement[]; generatedAt: string }> {
  const output = await callStructured<DirectionToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(candidates),
    toolName: "emit_direction_guidance",
    toolDescription: "Emit the priority-based guidance statements.",
    inputSchema: SCHEMA,
    maxTokens: 2048,
  });

  return {
    candidateIds: candidates.map((c) => c.id),
    priorityStatements: output.priority_statements.map((s) => ({
      priority: s.priority,
      recommendedOpportunityId: s.recommended_opportunity_id,
      rationale: s.rationale,
    })),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Building SELECTED_DIRECTION is not an AI call — the user owns this decision.
 * This just packages the chosen opportunity plus the user's own reasoning into
 * the artifact shape.
 */
export function buildSelectedDirection(
  opportunity: RankedOpportunity,
  reasonSelected: string,
  openQuestions: string[]
): SelectedDirection {
  return {
    opportunityId: opportunity.id,
    opportunity: opportunity.userEdit ?? opportunity.title,
    capability: opportunity.potentialService,
    targetBuyer: opportunity.buyer,
    problem: opportunity.problem,
    desiredOutcome: opportunity.possibleOutcome,
    reasonSelected,
    marketEvidence: [opportunity.marketEvidence],
    userEvidence: [opportunity.evidence],
    knownRisks: [opportunity.majorRisk],
    openQuestions: openQuestions.length > 0 ? openQuestions : [opportunity.proofGap],
    selectedAt: new Date().toISOString(),
  };
}

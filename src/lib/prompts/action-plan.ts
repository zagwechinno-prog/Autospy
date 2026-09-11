import { callStructured } from "../anthropic";
import type { ActionPlanArtifact, ActionPlanWeek, SelectedDirection } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Opportunity Execution Architect.

INPUT
SELECTED_DIRECTION.

TASK
Create a practical four-week path for turning the selected capability into a market-testable
offer. The plan must not be a generic career-development plan. Its objective is:
VALIDATE -> PACKAGE -> PROVE -> SELL

WEEK 1 — VALIDATE: determine exact buyer, painful problem, existing alternatives, problem
frequency, willingness to pay, language buyers use.

WEEK 2 — PACKAGE: define narrow service, scope, outcome, deliverables, process, timeline,
initial pricing hypothesis.

WEEK 3 — PROVE: create a proof asset — sample, diagnostic, case example, demonstration,
credibility mechanism. Use existing evidence wherever possible. Do not invent client results.

WEEK 4 — SELL: define prospect profile, prospect list, outreach volume, message, call/meeting
structure, validation questions, success metrics.

For every week include: objective, why it matters, 3-5 actions, deliverable, success criteria,
time required, risks, decision gate. The plan must be executable by one person.

OUTPUT
Respond only through the provided tool call.`;

const WEEK_SCHEMA = {
  type: "object" as const,
  properties: {
    objective: { type: "string" },
    why_it_matters: { type: "string" },
    actions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    deliverable: { type: "string" },
    success_criteria: { type: "string" },
    time_required: { type: "string" },
    risks: { type: "array", items: { type: "string" } },
    decision_gate: { type: "string" },
  },
  required: [
    "objective",
    "why_it_matters",
    "actions",
    "deliverable",
    "success_criteria",
    "time_required",
    "risks",
    "decision_gate",
  ],
};

const SCHEMA = {
  type: "object" as const,
  properties: {
    week_1_validate: WEEK_SCHEMA,
    week_2_package: WEEK_SCHEMA,
    week_3_prove: WEEK_SCHEMA,
    week_4_sell: WEEK_SCHEMA,
  },
  required: ["week_1_validate", "week_2_package", "week_3_prove", "week_4_sell"],
};

interface WeekToolOutput {
  objective: string;
  why_it_matters: string;
  actions: string[];
  deliverable: string;
  success_criteria: string;
  time_required: string;
  risks: string[];
  decision_gate: string;
}

interface ActionPlanToolOutput {
  week_1_validate: WeekToolOutput;
  week_2_package: WeekToolOutput;
  week_3_prove: WeekToolOutput;
  week_4_sell: WeekToolOutput;
}

function toWeek(w: WeekToolOutput, weekNumber: 1 | 2 | 3 | 4, label: ActionPlanWeek["label"]): ActionPlanWeek {
  return {
    weekNumber,
    label,
    objective: w.objective,
    whyItMatters: w.why_it_matters,
    actions: w.actions,
    deliverable: w.deliverable,
    successCriteria: w.success_criteria,
    timeRequired: w.time_required,
    risks: w.risks,
    decisionGate: w.decision_gate,
  };
}

function buildUserMessage(direction: SelectedDirection): string {
  return `SELECTED_DIRECTION:\n${JSON.stringify(direction, null, 2)}`;
}

export async function buildActionPlan(direction: SelectedDirection): Promise<ActionPlanArtifact> {
  const output = await callStructured<ActionPlanToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(direction),
    toolName: "emit_action_plan",
    toolDescription: "Emit the 4-week action plan.",
    inputSchema: SCHEMA,
    maxTokens: 4096,
  });

  return {
    weeks: [
      toWeek(output.week_1_validate, 1, "VALIDATE"),
      toWeek(output.week_2_package, 2, "PACKAGE"),
      toWeek(output.week_3_prove, 3, "PROVE"),
      toWeek(output.week_4_sell, 4, "SELL"),
    ],
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

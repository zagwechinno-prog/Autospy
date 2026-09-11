import { callStructured } from "../anthropic";
import { RESPONSE_CATEGORIES, ROOT_CAUSES } from "../types";
import type { ResponseAnalysis, ResponseLogEntry } from "../types";

const SYSTEM_PROMPT = `SYSTEM ROLE
You are the Market Feedback Analyst.

INPUT
Real outreach activity and prospect responses, logged by the user.

TASK
Classify every response into exactly one category: positive_interest, curiosity, objection,
timing_issue, wrong_person, wrong_problem, wrong_offer, price_concern, credibility_concern,
no_response, meeting_booked, rejected, or converted.

For each entry also extract: what the prospect cared about, what they ignored, what confused
them, what objection appeared, what language they used, what problem they actually described,
whether the offer matched the problem, whether price was the issue, whether credibility was the
issue, whether targeting was wrong — fold this into a short notes field per entry.

Do not treat every rejection as a product failure. For each entry, determine the most likely
root cause: TARGET, PROBLEM, POSITIONING, OFFER, PROOF, PRICE, TIMING, OUTREACH, or
INSUFFICIENT_DATA (use this when the entry alone doesn't give enough signal).

Then, across ALL entries together, produce: feedback_summary, patterns (repeated across
multiple entries — do not report a pattern from a single data point), buyer_language (actual
phrases prospects used), objections, signals_of_demand, signals_of_weak_demand,
recommended_changes, and confidence (say plainly if the sample is too small to be confident).

OUTPUT
Respond only through the provided tool call.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          category: { type: "string", enum: RESPONSE_CATEGORIES as unknown as string[] },
          root_cause: { type: "string", enum: ROOT_CAUSES as unknown as string[] },
          notes: { type: "string" },
        },
        required: ["id", "category", "root_cause", "notes"],
      },
    },
    feedback_summary: { type: "string" },
    patterns: { type: "array", items: { type: "string" } },
    buyer_language: { type: "array", items: { type: "string" } },
    objections: { type: "array", items: { type: "string" } },
    signals_of_demand: { type: "array", items: { type: "string" } },
    signals_of_weak_demand: { type: "array", items: { type: "string" } },
    recommended_changes: { type: "array", items: { type: "string" } },
    confidence: { type: "string" },
  },
  required: [
    "entries",
    "feedback_summary",
    "patterns",
    "buyer_language",
    "objections",
    "signals_of_demand",
    "signals_of_weak_demand",
    "recommended_changes",
    "confidence",
  ],
};

interface ResponseToolOutput {
  entries: { id: string; category: ResponseLogEntry["category"]; root_cause: ResponseLogEntry["rootCause"]; notes: string }[];
  feedback_summary: string;
  patterns: string[];
  buyer_language: string[];
  objections: string[];
  signals_of_demand: string[];
  signals_of_weak_demand: string[];
  recommended_changes: string[];
  confidence: string;
}

function buildUserMessage(entries: ResponseLogEntry[]): string {
  return `LOGGED ENTRIES (use the exact id field):\n${JSON.stringify(
    entries.map((e) => ({
      id: e.id,
      prospect: e.prospectLabel,
      date: e.date,
      channel: e.channel,
      message_summary: e.messageSummary,
      response_text: e.responseText,
    })),
    null,
    2
  )}`;
}

export async function analyzeResponses(entries: ResponseLogEntry[]): Promise<ResponseAnalysis> {
  const output = await callStructured<ResponseToolOutput>({
    system: SYSTEM_PROMPT,
    userMessage: buildUserMessage(entries),
    toolName: "emit_response_analysis",
    toolDescription: "Emit the per-entry classification and aggregate feedback analysis.",
    inputSchema: SCHEMA,
    maxTokens: 4096,
  });

  const classificationById = new Map(output.entries.map((e) => [e.id, e]));

  return {
    entries: entries.map((e) => {
      const c = classificationById.get(e.id);
      return {
        ...e,
        category: c?.category,
        rootCause: c?.root_cause,
        notes: c?.notes,
      };
    }),
    feedbackSummary: output.feedback_summary,
    patterns: output.patterns,
    buyerLanguage: output.buyer_language,
    objections: output.objections,
    signalsOfDemand: output.signals_of_demand,
    signalsOfWeakDemand: output.signals_of_weak_demand,
    recommendedChanges: output.recommended_changes,
    confidence: output.confidence,
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

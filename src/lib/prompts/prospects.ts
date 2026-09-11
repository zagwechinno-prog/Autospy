import { randomUUID } from "crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { callStructured, DEFAULT_MODEL, getAnthropicClient } from "../anthropic";
import type { OfferDocument, ProspectsArtifact } from "../types";

const RESEARCH_SYSTEM_PROMPT = `SYSTEM ROLE
You are the Prospect Research Engine.

INPUT
An approved Offer.

TASK
First define the Ideal Customer Profile: industry, company size, geography, business model,
likely buyer, likely problem, trigger events, disqualifiers.

Then research real prospects using web search. Prioritize by: problem likelihood, offer fit,
buyer accessibility, evidence of relevant need, timing/trigger, company suitability. Do not
recommend companies merely because they are large.

For each prospect provide: company, website, industry, size if reliably available, likely
buyer (a role/title, never a named individual), why they fit, relevant trigger, likely problem,
personalization angle, confidence, and source (the URL you found this at). Do not fabricate
decision-maker names or contact information — a role like "Head of Operations" is fine, a
specific person's name is not unless you found it via search and can cite where. Label each
prospect VERIFIED (you found a real, current, citable source for the company and the fit
signal) or INFERRED (plausible fit based on general knowledge, not a specific found source).

OUTPUT FORMAT FOR THIS STEP
Start with "## ICP" and the ideal customer profile fields. Then "## PROSPECTS" with a numbered
list of 6-10 prospects, each with all the fields above plus [VERIFIED] or [INFERRED] and the
source URL in parentheses (or "(inference)" if genuinely none exists — never fabricate a URL).`;

async function runProspectResearch(offer: OfferDocument): Promise<string> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8192,
    system: RESEARCH_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `APPROVED OFFER:\n${JSON.stringify(offer, null, 2)}` }],
    tools: [{ type: "web_search_20260318", name: "web_search", max_uses: 10 }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");

  if (!text.trim()) {
    throw new Error("Prospect research returned no analysis — the model may have been unable to search.");
  }
  return text;
}

const EXTRACTION_SYSTEM_PROMPT = `You convert prospect research notes into structured data. The notes contain an ICP section
and a numbered list of prospects, each tagged [VERIFIED] or [INFERRED] with a source URL or
"(inference)". Extract the ICP fields and each prospect's fields exactly as given — never
invent a company, website, or source that isn't in the notes; never invent a decision-maker's
name. Respond only through the provided tool call.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    icp: {
      type: "object",
      properties: {
        industry: { type: "string" },
        company_size: { type: "string" },
        geography: { type: "string" },
        business_model: { type: "string" },
        likely_buyer: { type: "string" },
        likely_problem: { type: "string" },
        trigger_events: { type: "array", items: { type: "string" } },
        disqualifiers: { type: "array", items: { type: "string" } },
      },
      required: [
        "industry",
        "company_size",
        "geography",
        "business_model",
        "likely_buyer",
        "likely_problem",
        "trigger_events",
        "disqualifiers",
      ],
    },
    prospects: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          website: { type: "string" },
          industry: { type: "string" },
          size: { type: "string" },
          likely_buyer: { type: "string" },
          why_they_fit: { type: "string" },
          relevant_trigger: { type: "string" },
          likely_problem: { type: "string" },
          personalization_angle: { type: "string" },
          confidence: { type: "string" },
          source: { type: "string" },
          verification: { type: "string", enum: ["VERIFIED", "INFERRED"] },
        },
        required: [
          "company",
          "website",
          "industry",
          "size",
          "likely_buyer",
          "why_they_fit",
          "relevant_trigger",
          "likely_problem",
          "personalization_angle",
          "confidence",
          "source",
          "verification",
        ],
      },
    },
  },
  required: ["icp", "prospects"],
};

interface ProspectToolOutput {
  company: string;
  website: string;
  industry: string;
  size: string;
  likely_buyer: string;
  why_they_fit: string;
  relevant_trigger: string;
  likely_problem: string;
  personalization_angle: string;
  confidence: string;
  source: string;
  verification: "VERIFIED" | "INFERRED";
}

interface ProspectsToolOutput {
  icp: {
    industry: string;
    company_size: string;
    geography: string;
    business_model: string;
    likely_buyer: string;
    likely_problem: string;
    trigger_events: string[];
    disqualifiers: string[];
  };
  prospects: ProspectToolOutput[];
}

export async function researchProspects(offer: OfferDocument): Promise<ProspectsArtifact> {
  const researchNotes = await runProspectResearch(offer);

  const output = await callStructured<ProspectsToolOutput>({
    system: EXTRACTION_SYSTEM_PROMPT,
    userMessage: `RESEARCH NOTES:\n\n${researchNotes}`,
    toolName: "emit_prospects",
    toolDescription: "Emit the structured ICP and prospect list.",
    inputSchema: SCHEMA,
    maxTokens: 4096,
  });

  return {
    icp: {
      industry: output.icp.industry,
      companySize: output.icp.company_size,
      geography: output.icp.geography,
      businessModel: output.icp.business_model,
      likelyBuyer: output.icp.likely_buyer,
      likelyProblem: output.icp.likely_problem,
      triggerEvents: output.icp.trigger_events,
      disqualifiers: output.icp.disqualifiers,
    },
    prospects: output.prospects.map((p) => ({
      id: randomUUID(),
      company: p.company,
      website: p.website,
      industry: p.industry,
      size: p.size,
      likelyBuyer: p.likely_buyer,
      whyTheyFit: p.why_they_fit,
      relevantTrigger: p.relevant_trigger,
      likelyProblem: p.likely_problem,
      personalizationAngle: p.personalization_angle,
      confidence: p.confidence,
      source: p.source,
      verification: p.verification,
      reviewStatus: "pending" as const,
    })),
    generatedAt: new Date().toISOString(),
    approved: false,
  };
}

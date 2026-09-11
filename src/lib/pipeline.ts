export type StageKey =
  | "experience"
  | "profile"
  | "autopsy"
  | "capabilities"
  | "market"
  | "opportunities"
  | "direction"
  | "action_plan"
  | "offer"
  | "review"
  | "one_pager"
  | "prospects"
  | "outreach"
  | "response"
  | "optimization";

export interface StageMeta {
  key: StageKey;
  order: number;
  label: string;
  shortLabel: string;
  /** What this stage does, in the language of the Opportunity System spec. */
  description: string;
  /** Stages the AI can build once this one is approved. */
  produces: string;
  implemented: boolean;
}

export const STAGES: StageMeta[] = [
  {
    key: "experience",
    order: 1,
    label: "Experience",
    shortLabel: "Experience",
    description:
      "Capture what you have actually done — roles, achievements, projects — in your own words. No framing, no aspiration yet.",
    produces: "A raw Experience Intake artifact.",
    implemented: true,
  },
  {
    key: "profile",
    order: 2,
    label: "Profile",
    shortLabel: "Profile",
    description:
      "Extract structured evidence from the Experience Intake, then build a professional capability profile from it — core, supporting, domain, transferable, commercial, operational, and technical capabilities, each separated into explicit evidence vs. inference.",
    produces: "A reviewable Opportunity Profile.",
    implemented: true,
  },
  {
    key: "autopsy",
    order: 3,
    label: "Autopsy",
    shortLabel: "Autopsy",
    description:
      "Analyze the raw experience as evidence of economic capability: strongest and weakest evidence, hidden value, under-positioned capabilities, generic claims, missing evidence, patterns, risks, and opportunity clues.",
    produces: "An Autopsy artifact — what the experience reveals, hides, weakens, or fails to communicate.",
    implemented: true,
  },
  {
    key: "capabilities",
    order: 4,
    label: "Capabilities",
    shortLabel: "Capabilities",
    description:
      "Translate experience into capabilities that could have real economic value — distinct from a skill, a service, or an offer. 5-10 candidates, each with buyer problems, likely buyers, and evidence strength.",
    produces: "A candidate Marketable Capability list.",
    implemented: true,
  },
  {
    key: "market",
    order: 5,
    label: "Market",
    shortLabel: "Market",
    description:
      "Research the real market for each capability: demand, buyer pain, existing solutions, competitive intensity, entry barriers. Distinguishes employment demand from service, consulting, and product demand.",
    produces: "A Market Read per capability, sourced or explicitly labeled inference.",
    implemented: true,
  },
  {
    key: "opportunities",
    order: 6,
    label: "Opportunities",
    shortLabel: "Opportunities",
    description:
      "Score every approved capability on demand, buyer value, evidence, fit, and accessibility with a transparent scoring model — structured decision support, not a pretend objective measurement. Ranks the top 5.",
    produces: "A ranked Opportunity list, with the case for #1 spelled out.",
    implemented: true,
  },
  {
    key: "direction",
    order: 7,
    label: "Direction",
    shortLabel: "Direction",
    description:
      "Present the strongest 3-5 opportunities side by side with priority-based guidance. You choose one — the system does not decide for you and does not continue automatically.",
    produces: "One SELECTED_DIRECTION, owned by you.",
    implemented: true,
  },
  {
    key: "action_plan",
    order: 8,
    label: "Action Plan",
    shortLabel: "Action Plan",
    description:
      "Turn the selected Direction into a 4-week VALIDATE → PACKAGE → PROVE → SELL path, executable by one person, with a decision gate at the end of each week.",
    produces: "A 4-week Action Plan artifact.",
    implemented: true,
  },
  {
    key: "offer",
    order: 9,
    label: "Offer",
    shortLabel: "Offer",
    description:
      "Pre-fill and draft a specific offer around the buyer's desired outcome — every field comes with its recommendation, why, evidence, and confidence, and every field is yours to edit.",
    produces: "A draft Offer document.",
    implemented: true,
  },
  {
    key: "review",
    order: 10,
    label: "Review",
    shortLabel: "Review",
    description:
      "Attack the Offer before the market does: critical problems, important and optional improvements, a revised offer with material changes flagged for your approval, and a health score.",
    produces: "A reviewed Offer, with a market-readiness verdict.",
    implemented: true,
  },
  {
    key: "one_pager",
    order: 11,
    label: "One-Pager",
    shortLabel: "One-Pager",
    description: "Package the approved Offer into a one-page artifact a buyer can read in under a minute.",
    produces: "A One-Pager document.",
    implemented: false,
  },
  {
    key: "prospects",
    order: 12,
    label: "Prospects",
    shortLabel: "Prospects",
    description: "Identify and qualify specific candidate buyers for the Offer.",
    produces: "A qualified Prospect List.",
    implemented: false,
  },
  {
    key: "outreach",
    order: 13,
    label: "Outreach",
    shortLabel: "Outreach",
    description: "Draft outreach sequences tailored to each prospect's specific situation and problem.",
    produces: "Outreach drafts, ready for human send.",
    implemented: false,
  },
  {
    key: "response",
    order: 14,
    label: "Response",
    shortLabel: "Response",
    description: "Analyze real market responses — what worked, what didn't, what objections appeared.",
    produces: "A Response Analysis.",
    implemented: false,
  },
  {
    key: "optimization",
    order: 15,
    label: "Optimization",
    shortLabel: "Optimization",
    description:
      "Feed response evidence back into the Offer, Direction, or even the Profile — close the loop from market reality to system.",
    produces: "Updated, evidence-backed recommendations for the next cycle.",
    implemented: false,
  },
];

export function stageMeta(key: StageKey): StageMeta {
  const meta = STAGES.find((s) => s.key === key);
  if (!meta) throw new Error(`Unknown stage: ${key}`);
  return meta;
}

export function nextStage(key: StageKey): StageMeta | undefined {
  const meta = stageMeta(key);
  return STAGES.find((s) => s.order === meta.order + 1);
}

export function prevStage(key: StageKey): StageMeta | undefined {
  const meta = stageMeta(key);
  return STAGES.find((s) => s.order === meta.order - 1);
}

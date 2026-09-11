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
      "Combine capability and market evidence into ranked opportunity candidates — specific, not broad.",
    produces: "A ranked Opportunity List.",
    implemented: false,
  },
  {
    key: "direction",
    order: 7,
    label: "Direction",
    shortLabel: "Direction",
    description:
      "Decide which single opportunity to pursue first. This is the major human decision point: approve, reject, or ask for a different comparison.",
    produces: "One approved Direction.",
    implemented: false,
  },
  {
    key: "action_plan",
    order: 8,
    label: "Action Plan",
    shortLabel: "Action Plan",
    description:
      "Turn the approved Direction into a sequenced set of next actions to build and test an offer.",
    produces: "An Action Plan artifact.",
    implemented: false,
  },
  {
    key: "offer",
    order: 9,
    label: "Offer",
    shortLabel: "Offer",
    description:
      "Draft a specific, priced offer around the buyer's desired outcome — not around what you do.",
    produces: "A draft Offer.",
    implemented: false,
  },
  {
    key: "review",
    order: 10,
    label: "Review",
    shortLabel: "Review",
    description:
      "Stress-test the Offer against the core principles — evidence, specificity, competitive positioning — before it goes to market.",
    produces: "A reviewed, approved Offer.",
    implemented: false,
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

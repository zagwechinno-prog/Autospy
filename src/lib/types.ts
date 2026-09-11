import type { StageKey } from "./pipeline";

/**
 * Uncertainty must be visible. Non-trivial claims carry one of these tags so
 * the user always knows how solid the ground is. Stages 2 and 3 (Profile,
 * Autopsy) only ever emit CONFIRMED/INFERRED per their spec — the full set
 * exists for stages that also draw on outside market knowledge.
 */
export const EVIDENCE_TAGS = [
  "CONFIRMED",
  "INFERRED",
  "MARKET-SUPPORTED",
  "HYPOTHESIS",
] as const;
export type EvidenceTag = (typeof EVIDENCE_TAGS)[number];

export type ReviewStatus = "pending" | "approved" | "edited" | "rejected";

export interface RoleEntry {
  id: string;
  title: string;
  organization: string;
  period?: string;
  description?: string;
}

export interface ExperienceIntake {
  rawNarrative: string;
  roles: RoleEntry[];
  achievements: string[];
  notes?: string;
  submittedAt: string;
}

// ---------------------------------------------------------------------------
// PROMPT 01 — Experience Intake Engine → PROFILE_RAW
// ---------------------------------------------------------------------------

export interface EvidenceItem {
  claim: string;
  sourceQuote: string;
}

export interface ProfileRaw {
  roles: string[];
  industries: string[];
  responsibilities: string[];
  projects: string[];
  achievements: string[];
  tools: string[];
  skills: string[];
  domainKnowledge: string[];
  leadershipEvidence: string[];
  commercialEvidence: string[];
  processImprovementEvidence: string[];
  quantifiedOutcomes: string[];
  evidenceItems: EvidenceItem[];
  uncertainties: string[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// PROMPT 02 — Professional Profile Architect → Profile
// ---------------------------------------------------------------------------

export type CapabilityTier =
  | "core"
  | "supporting"
  | "domain_expertise"
  | "transferable"
  | "commercial"
  | "operational"
  | "technical";

export const CAPABILITY_TIER_LABELS: Record<CapabilityTier, string> = {
  core: "Core capability",
  supporting: "Supporting capability",
  domain_expertise: "Domain expertise",
  transferable: "Transferable capability",
  commercial: "Commercial capability",
  operational: "Operational capability",
  technical: "Technical capability",
};

export interface CapabilityEntry {
  id: string;
  tier: CapabilityTier;
  name: string;
  whatUserDoes: string;
  evidence: string;
  likelyProficiency: string;
  evidenceTag: Extract<EvidenceTag, "CONFIRMED" | "INFERRED">;
  transferableIndustries: string[];
  potentialProblems: string[];
  reviewStatus: ReviewStatus;
  userEdit?: string;
}

export interface Profile {
  professionalIdentity: string;
  humanSummary: string;
  capabilities: CapabilityEntry[];
  experiencePatterns: string[];
  potentialProblemAreas: string[];
  confidenceNotes: string[];
  generatedAt: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// PROMPT 03 — Resume Autopsy Engine → Autopsy
// ---------------------------------------------------------------------------

export type AutopsyCategory =
  | "strength"
  | "weakness"
  | "hidden_value"
  | "under_positioned"
  | "generic_claim"
  | "missing_evidence"
  | "high_value_evidence"
  | "pattern"
  | "risk"
  | "opportunity_clue";

export const AUTOPSY_CATEGORY_LABELS: Record<AutopsyCategory, string> = {
  strength: "Strength",
  weakness: "Weakness",
  hidden_value: "Hidden value",
  under_positioned: "Under-positioned capability",
  generic_claim: "Generic claim",
  missing_evidence: "Missing evidence",
  high_value_evidence: "High-value evidence",
  pattern: "Pattern",
  risk: "Risk",
  opportunity_clue: "Opportunity clue",
};

export interface AutopsyFinding {
  id: string;
  category: AutopsyCategory;
  text: string;
  reviewStatus: ReviewStatus;
  userEdit?: string;
}

export interface Autopsy {
  headline: string;
  capabilitiesIdentifiedCount: number;
  highPotentialCount: number;
  strongestDiscoveries: string[];
  findings: AutopsyFinding[];
  generatedAt: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// PROMPT 04 — Capability Translation Engine → Capabilities
// ---------------------------------------------------------------------------

export type EvidenceStrength = "strong" | "moderate" | "weak";

export interface MarketableCapability {
  id: string;
  capability: string;
  description: string;
  evidence: string[];
  evidenceStrength: EvidenceStrength;
  buyerProblems: string[];
  potentialBuyers: string[];
  transferability: string;
  economicValue: string;
  competitiveContext: string;
  proofGap: string;
  confidence: string;
  reviewStatus: ReviewStatus;
  userEdit?: string;
}

export interface CapabilitiesArtifact {
  capabilities: MarketableCapability[];
  generatedAt: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// PROMPT 05 — Market Intelligence Engine → Market
// ---------------------------------------------------------------------------

export interface MarketRead {
  id: string;
  capability: string;
  marketDemand: string;
  buyerSegments: string[];
  buyerProblems: string[];
  economicSignificance: string;
  existingSolutions: string[];
  competitiveIntensity: string;
  pricingSignals: string[];
  entryBarriers: string[];
  differentiationOpportunities: string[];
  currentMarketSignals: string[];
  sources: string[];
  researchConfidence: string;
  reviewStatus: ReviewStatus;
}

export interface MarketArtifact {
  reads: MarketRead[];
  intersectionSummary: string;
  generatedAt: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// PROMPT 06 — Opportunity Ranking Engine → Opportunities
// ---------------------------------------------------------------------------

export interface OpportunityDimensionScores {
  demand: number;
  buyerValue: number;
  evidence: number;
  fit: number;
  accessibility: number;
}

export interface RankedOpportunity {
  id: string;
  title: string;
  scores: OpportunityDimensionScores;
  /** 0-10, geometric mean of the five dimensions above — computed programmatically, never asked of the model. */
  compositeScore: number;
  rationale: string;
  evidence: string;
  marketEvidence: string;
  buyer: string;
  problem: string;
  possibleOutcome: string;
  potentialService: string;
  majorRisk: string;
  proofGap: string;
  confidence: string;
  reviewStatus: ReviewStatus;
  userEdit?: string;
}

export interface OpportunitiesArtifact {
  opportunities: RankedOpportunity[];
  whyRankedFirst: string;
  whatCouldChangeRanking: string;
  generatedAt: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// PROMPT 07 — Decision Guide → Direction
// ---------------------------------------------------------------------------

export interface PriorityStatement {
  priority: string;
  recommendedOpportunityId: string;
  rationale: string;
}

export interface SelectedDirection {
  opportunityId: string;
  opportunity: string;
  capability: string;
  targetBuyer: string;
  problem: string;
  desiredOutcome: string;
  reasonSelected: string;
  marketEvidence: string[];
  userEvidence: string[];
  knownRisks: string[];
  openQuestions: string[];
  selectedAt: string;
}

export interface DirectionArtifact {
  candidateIds: string[];
  priorityStatements: PriorityStatement[];
  selected?: SelectedDirection;
  generatedAt: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// PROMPT 08 — Opportunity Execution Architect → Action Plan
// ---------------------------------------------------------------------------

export type ActionPlanWeekLabel = "VALIDATE" | "PACKAGE" | "PROVE" | "SELL";

export interface ActionPlanWeek {
  weekNumber: 1 | 2 | 3 | 4;
  label: ActionPlanWeekLabel;
  objective: string;
  whyItMatters: string;
  actions: string[];
  deliverable: string;
  successCriteria: string;
  timeRequired: string;
  risks: string[];
  decisionGate: string;
}

export interface ActionPlanArtifact {
  weeks: ActionPlanWeek[];
  generatedAt: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// PROMPT 09 — Offer Architect → Offer
// ---------------------------------------------------------------------------

export interface OfferFieldRecommendation {
  recommendation: string;
  why: string;
  evidence: string;
  confidence: string;
}

export type OfferPrefillKey =
  | "targetCustomer"
  | "problem"
  | "desiredOutcome"
  | "service"
  | "deliverables"
  | "timeline"
  | "pricingHypothesis"
  | "proof"
  | "positioning";

export const OFFER_PREFILL_LABELS: Record<OfferPrefillKey, string> = {
  targetCustomer: "Target customer",
  problem: "Problem",
  desiredOutcome: "Desired outcome",
  service: "Service",
  deliverables: "Deliverables",
  timeline: "Timeline",
  pricingHypothesis: "Pricing hypothesis",
  proof: "Proof",
  positioning: "Positioning",
};

export interface OfferDocument {
  offerName: string;
  oneLinePromise: string;
  whoItIsFor: string;
  problem: string;
  outcome: string;
  whatYouDo: string;
  whatTheyReceive: string;
  timeline: string;
  price: string;
  whyYou: string;
  whatMakesThisDifferent: string;
  whatIsNotIncluded: string;
  callToAction: string;
}

export interface Offer {
  prefill: Record<OfferPrefillKey, OfferFieldRecommendation>;
  document: OfferDocument;
  userEdits: Partial<OfferDocument>;
  generatedAt: string;
  approved: boolean;
}

// ---------------------------------------------------------------------------
// PROMPT 10 — Offer Critic → Review
// ---------------------------------------------------------------------------

export interface OfferCritique {
  criticalProblems: string[];
  importantImprovements: string[];
  optionalImprovements: string[];
  whatToKeep: string[];
  revisedOffer: OfferDocument;
  materialChanges: string[];
  healthScore: number;
  readyForMarketTest: boolean;
  biggestRemainingRisk: string;
  nextBestAction: string;
  generatedAt: string;
  approved: boolean;
  decision?: "kept_original" | "adopted_revision";
}

// ---------------------------------------------------------------------------

export type StageStatus = "locked" | "not_started" | "in_progress" | "completed";

export interface OpportunitySession {
  id: string;
  createdAt: string;
  updatedAt: string;
  stageStatus: Record<StageKey, StageStatus>;
  experience?: ExperienceIntake;
  profileRaw?: ProfileRaw;
  profile?: Profile;
  autopsy?: Autopsy;
  capabilities?: CapabilitiesArtifact;
  market?: MarketArtifact;
  opportunities?: OpportunitiesArtifact;
  direction?: DirectionArtifact;
  actionPlan?: ActionPlanArtifact;
  offer?: Offer;
  review?: OfferCritique;
}

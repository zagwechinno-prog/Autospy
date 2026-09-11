import type { StageKey } from "./pipeline";

/**
 * Uncertainty must be visible. Every non-trivial claim the system makes
 * carries one of these tags so the user always knows how solid the ground is.
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

export interface ProfileCapability {
  id: string;
  statement: string;
  domain: string;
  evidenceTag: EvidenceTag;
  evidenceQuote: string;
  reviewStatus: ReviewStatus;
  userEdit?: string;
}

export interface Profile {
  identitySummary: string;
  domains: string[];
  capabilities: ProfileCapability[];
  openQuestions: string[];
  generatedAt: string;
  approved: boolean;
}

export interface AutopsyFinding {
  id: string;
  statedRole: string;
  realCapability: string;
  problemSolved: string;
  outcomeDelivered: string;
  evidenceTag: EvidenceTag;
  evidenceQuote: string;
  reviewStatus: ReviewStatus;
  userEdit?: string;
}

export interface Autopsy {
  patternSummary: string;
  economicCapabilitySummary: string;
  findings: AutopsyFinding[];
  generatedAt: string;
  approved: boolean;
}

export type StageStatus = "locked" | "not_started" | "in_progress" | "completed";

export interface OpportunitySession {
  id: string;
  createdAt: string;
  updatedAt: string;
  stageStatus: Record<StageKey, StageStatus>;
  experience?: ExperienceIntake;
  profile?: Profile;
  autopsy?: Autopsy;
}

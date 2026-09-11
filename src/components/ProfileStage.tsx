"use client";

import { useState } from "react";
import type { OpportunitySession, ReviewStatus } from "@/lib/types";
import { CAPABILITY_TIER_LABELS } from "@/lib/types";
import { EvidenceBadge } from "./EvidenceBadge";
import { DecisionButton } from "./DecisionButton";

type DecidedStatus = Exclude<ReviewStatus, "pending">;
interface Decision {
  status: DecidedStatus;
  text: string;
}

export function ProfileStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const profile = session.profile;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  async function generate() {
    setGenerating(true);
    setError(null);
    setDecisions({});
    try {
      const res = await fetch(`/api/session/${sessionId}/profile`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate profile.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  function decisionFor(id: string, name: string): Decision {
    return decisions[id] ?? { status: "approved", text: name };
  }

  function setDecision(id: string, patch: Partial<Decision>, name: string) {
    setDecisions((prev) => ({ ...prev, [id]: { ...decisionFor(id, name), ...patch } }));
  }

  async function submit(approve: boolean) {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const capabilities = profile.capabilities.map((c) => {
        const d = decisionFor(c.id, c.name);
        return {
          id: c.id,
          reviewStatus: d.status,
          userEdit: d.status === "edited" ? d.text : undefined,
        };
      });
      const res = await fetch(`/api/session/${sessionId}/profile/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilities, approve }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save review.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This stage first extracts structured evidence from your Experience intake (PROFILE_RAW),
          then builds a professional capability profile from it — core, supporting, domain,
          transferable, commercial, operational, and technical capabilities, each separated into
          explicit evidence vs. inference.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Analyzing…" : "Generate Profile"}
        </button>
      </div>
    );
  }

  if (profile.approved) {
    const active = profile.capabilities.filter((c) => c.reviewStatus !== "rejected");
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Profile approved — {active.length} capabilit{active.length === 1 ? "y" : "ies"} carried
          forward into Autopsy.
        </div>
        <SummaryBlock profile={profile} />
        <div className="flex flex-col gap-2">
          {active.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                  {CAPABILITY_TIER_LABELS[c.tier]}
                </p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200">{c.userEdit ?? c.name}</p>
              </div>
              <EvidenceBadge tag={c.evidenceTag} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SummaryBlock profile={profile} />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Capabilities — review each one
        </h3>
        {profile.capabilities.map((cap) => {
          const d = decisionFor(cap.id, cap.name);
          return (
            <div
              key={cap.id}
              className={`rounded-lg border border-zinc-200 p-4 transition-opacity dark:border-zinc-800 ${
                d.status === "rejected" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                    {CAPABILITY_TIER_LABELS[cap.tier]}
                  </p>
                  {d.status === "edited" ? (
                    <textarea
                      value={d.text}
                      onChange={(e) => setDecision(cap.id, { text: e.target.value }, cap.name)}
                      rows={2}
                      className="mt-1 w-full rounded border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  ) : (
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{cap.name}</p>
                  )}
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{cap.whatUserDoes}</p>
                  <p className="mt-1.5 text-xs italic text-zinc-500 dark:text-zinc-500">{cap.evidence}</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                    Likely proficiency: {cap.likelyProficiency}
                  </p>
                  {cap.transferableIndustries.length > 0 && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      Transfers to: {cap.transferableIndustries.join(", ")}
                    </p>
                  )}
                  {cap.potentialProblems.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-xs text-zinc-500 dark:text-zinc-500">
                      {cap.potentialProblems.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <EvidenceBadge tag={cap.evidenceTag} />
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <DecisionButton
                  active={d.status === "approved"}
                  onClick={() => setDecision(cap.id, { status: "approved", text: cap.name }, cap.name)}
                >
                  Approve
                </DecisionButton>
                <DecisionButton
                  active={d.status === "edited"}
                  onClick={() => setDecision(cap.id, { status: "edited" }, cap.name)}
                >
                  Edit
                </DecisionButton>
                <DecisionButton
                  active={d.status === "rejected"}
                  tone="reject"
                  onClick={() => setDecision(cap.id, { status: "rejected", text: cap.name }, cap.name)}
                >
                  Reject
                </DecisionButton>
              </div>
            </div>
          );
        })}
      </div>

      {profile.potentialProblemAreas.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300">Potential problem areas</h3>
          <ul className="mt-1.5 list-disc pl-4 text-amber-800 dark:text-amber-300">
            {profile.potentialProblemAreas.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {profile.confidenceNotes.length > 0 && (
        <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">Confidence notes</h3>
          <ul className="mt-1.5 list-disc pl-4 text-zinc-600 dark:text-zinc-400">
            {profile.confidenceNotes.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => submit(true)}
          disabled={saving}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "Saving…" : "Approve Profile & Continue →"}
        </button>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {generating ? "Regenerating…" : "Regenerate"}
        </button>
      </div>
    </div>
  );
}

function SummaryBlock({ profile }: { profile: NonNullable<OpportunitySession["profile"]> }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Professional identity</h3>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{profile.professionalIdentity}</p>
      </div>
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Where you&apos;re strongest</h3>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{profile.humanSummary}</p>
      </div>
      {profile.experiencePatterns.length > 0 && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Experience patterns</h3>
          <ul className="mt-1.5 list-disc pl-4 text-sm text-zinc-700 dark:text-zinc-300">
            {profile.experiencePatterns.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

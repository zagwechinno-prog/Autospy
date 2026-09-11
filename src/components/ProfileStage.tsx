"use client";

import { useState } from "react";
import type { OpportunitySession, ReviewStatus } from "@/lib/types";
import { EvidenceBadge } from "./EvidenceBadge";

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

  function decisionFor(id: string, statement: string): Decision {
    return decisions[id] ?? { status: "approved", text: statement };
  }

  function setDecision(id: string, patch: Partial<Decision>, statement: string) {
    setDecisions((prev) => ({ ...prev, [id]: { ...decisionFor(id, statement), ...patch } }));
  }

  async function submit(approve: boolean) {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const capabilities = profile.capabilities.map((c) => {
        const d = decisionFor(c.id, c.statement);
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
          This stage synthesizes your Experience intake into a structured set of capability
          statements — each tagged with how solid the evidence behind it actually is.
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
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Identity summary</h3>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{profile.identitySummary}</p>
        </div>
        <div className="flex flex-col gap-2">
          {active.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <p className="text-sm text-zinc-800 dark:text-zinc-200">{c.userEdit ?? c.statement}</p>
              <EvidenceBadge tag={c.evidenceTag} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Identity summary</h3>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{profile.identitySummary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile.domains.map((d) => (
            <span
              key={d}
              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Capabilities — review each one
        </h3>
        {profile.capabilities.map((cap) => {
          const d = decisionFor(cap.id, cap.statement);
          return (
            <div
              key={cap.id}
              className={`rounded-lg border border-zinc-200 p-4 transition-opacity dark:border-zinc-800 ${
                d.status === "rejected" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {d.status === "edited" ? (
                    <textarea
                      value={d.text}
                      onChange={(e) => setDecision(cap.id, { text: e.target.value }, cap.statement)}
                      rows={2}
                      className="w-full rounded border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  ) : (
                    <p className="text-sm text-zinc-800 dark:text-zinc-200">{cap.statement}</p>
                  )}
                  <p className="mt-1.5 text-xs italic text-zinc-500 dark:text-zinc-500">
                    “{cap.evidenceQuote}”
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                    {cap.domain}
                  </p>
                </div>
                <EvidenceBadge tag={cap.evidenceTag} />
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <DecisionButton
                  active={d.status === "approved"}
                  onClick={() => setDecision(cap.id, { status: "approved", text: cap.statement }, cap.statement)}
                >
                  Approve
                </DecisionButton>
                <DecisionButton
                  active={d.status === "edited"}
                  onClick={() => setDecision(cap.id, { status: "edited" }, cap.statement)}
                >
                  Edit
                </DecisionButton>
                <DecisionButton
                  active={d.status === "rejected"}
                  tone="reject"
                  onClick={() => setDecision(cap.id, { status: "rejected", text: cap.statement }, cap.statement)}
                >
                  Reject
                </DecisionButton>
              </div>
            </div>
          );
        })}
      </div>

      {profile.openQuestions.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300">Open questions</h3>
          <ul className="mt-1.5 list-disc pl-4 text-amber-800 dark:text-amber-300">
            {profile.openQuestions.map((q, i) => (
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

function DecisionButton({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "reject";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 font-medium transition-colors ${
        active
          ? tone === "reject"
            ? "bg-red-600 text-white"
            : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

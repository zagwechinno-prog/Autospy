"use client";

import { useState } from "react";
import type { OpportunitySession } from "@/lib/types";

export function ActionPlanStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const actionPlan = session.actionPlan;
  const directionSelected = !!session.direction?.selected;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/action_plan`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to build the action plan.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function approve() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/action_plan/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve the action plan.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!directionSelected) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Select a Direction first.</p>;
  }

  if (!actionPlan) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A practical 4-week path from your selected direction to a market-tested offer:
          VALIDATE → PACKAGE → PROVE → SELL. Executable by one person.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Building…" : "Build 4-Week Path"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {actionPlan.approved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Action Plan approved. Offer stage unlocked next.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {actionPlan.weeks.map((w) => (
          <div key={w.weekNumber} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              Week {w.weekNumber} · {w.label}
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{w.objective}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{w.whyItMatters}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-zinc-700 dark:text-zinc-300">
              {w.actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-500">Deliverable</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">{w.deliverable}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-500">Success criteria</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">{w.successCriteria}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-500">Time required</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">{w.timeRequired}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-500">Decision gate</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">{w.decisionGate}</dd>
              </div>
            </dl>
            {w.risks.length > 0 && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                <span className="font-medium">Risks: </span>
                {w.risks.join("; ")}
              </p>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!actionPlan.approved && (
        <div className="flex gap-3">
          <button
            onClick={approve}
            disabled={saving}
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {saving ? "Saving…" : "Approve Action Plan & Continue →"}
          </button>
          <button
            onClick={generate}
            disabled={generating}
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {generating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      )}
    </div>
  );
}

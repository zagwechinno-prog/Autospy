"use client";

import { useState } from "react";
import type { OpportunitySession } from "@/lib/types";
import { OUTREACH_MESSAGE_LABELS } from "@/lib/types";

export function OutreachStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const outreach = session.outreach;
  const prospectsApproved = session.prospects?.approved ?? false;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/outreach`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate outreach.");
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
      const res = await fetch(`/api/session/${sessionId}/outreach/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!prospectsApproved) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the Prospects stage first.</p>;
  }

  if (!outreach) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Prospect-specific outreach, not generic mass messaging — built on observation → problem
          hypothesis → relevant insight → a low-friction next step. The first message won&apos;t
          hard-pitch; its job is to start a conversation and test the problem hypothesis.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Drafting…" : "Draft Outreach"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {outreach.approved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Outreach approved. Response stage unlocked next — log what actually happens when you
          send these.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {outreach.prospectOutreach.map((po) => (
          <div key={po.prospectId} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{po.prospectName}</h3>
            <dl className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <div><dt className="font-medium text-zinc-500 dark:text-zinc-500">Observation</dt><dd className="text-zinc-700 dark:text-zinc-300">{po.observation}</dd></div>
              <div><dt className="font-medium text-zinc-500 dark:text-zinc-500">Problem hypothesis</dt><dd className="text-zinc-700 dark:text-zinc-300">{po.problemHypothesis}</dd></div>
              <div><dt className="font-medium text-zinc-500 dark:text-zinc-500">Relevant insight</dt><dd className="text-zinc-700 dark:text-zinc-300">{po.relevantInsight}</dd></div>
            </dl>
            {po.assumptionsLabeled.length > 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                <span className="font-medium">Assumptions: </span>
                {po.assumptionsLabeled.join("; ")}
              </p>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {po.messages.map((m) => (
                <details key={m.type} className="rounded border border-zinc-200 p-2 text-sm dark:border-zinc-800">
                  <summary className="cursor-pointer font-medium text-zinc-800 dark:text-zinc-200">
                    {OUTREACH_MESSAGE_LABELS[m.type]}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{m.content}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!outreach.approved && (
        <div className="flex gap-3">
          <button
            onClick={approve}
            disabled={saving}
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {saving ? "Saving…" : "Approve Outreach & Continue →"}
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

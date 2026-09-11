"use client";

import { useState } from "react";
import type { OpportunitySession } from "@/lib/types";
import { OfferDocumentView } from "./OfferStage";

export function OptimizationStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const optimization = session.optimization;
  const responseApproved = session.response?.approved ?? false;
  const [observations, setObservations] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/optimization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userObservations: observations }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to optimize the offer.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function decide(adopt: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/optimization/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adopt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save your decision.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!responseApproved) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the Response stage first.</p>;
  }

  if (!optimization) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Based on repeated evidence from your logged responses — not one reaction — this stage
          decides whether the offer should be kept, refined, repositioned, narrowed, expanded,
          repriced, retargeted, or rejected, and drafts Version 2.
        </p>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Anything you&apos;ve observed that the logged data doesn&apos;t capture? (optional)
          </label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Analyzing…" : "Optimize My Offer"}
        </button>
      </div>
    );
  }

  if (optimization.approved) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Decision: <span className="font-semibold">{optimization.decision}</span> —{" "}
          {optimization.adopted ? "you adopted Version 2" : "you kept the current offer"}. This
          closes the pipeline&apos;s core loop — use the Opportunity Loop view to see the full
          living profile and plan the next iteration.
        </div>
        <OfferDocumentView doc={optimization.adopted ? optimization.afterOffer : optimization.beforeOffer} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">Decision</p>
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{optimization.decision}</p>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{optimization.decisionRationale}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">What changes and why</h3>
        {optimization.changes.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">No changes recommended.</p>
        )}
        {optimization.changes.map((c, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{c.variable}</p>
            <p className="mt-1 text-zinc-700 dark:text-zinc-300">{c.whatChanges}</p>
            <dl className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
              <div><dt className="font-medium text-zinc-500 dark:text-zinc-500">Why</dt><dd className="text-zinc-600 dark:text-zinc-400">{c.why}</dd></div>
              <div><dt className="font-medium text-zinc-500 dark:text-zinc-500">Evidence</dt><dd className="text-zinc-600 dark:text-zinc-400">{c.evidence}</dd></div>
              <div><dt className="font-medium text-zinc-500 dark:text-zinc-500">Expected effect</dt><dd className="text-zinc-600 dark:text-zinc-400">{c.expectedEffect}</dd></div>
              <div><dt className="font-medium text-zinc-500 dark:text-zinc-500">Risk</dt><dd className="text-zinc-600 dark:text-zinc-400">{c.risk}</dd></div>
            </dl>
            <p className="mt-1 text-xs italic text-zinc-400 dark:text-zinc-600">Confidence: {c.confidence}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Before</h3>
          <OfferDocumentView doc={optimization.beforeOffer} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">After (Version 2)</h3>
          <OfferDocumentView doc={optimization.afterOffer} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => decide(true)}
          disabled={saving}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "Saving…" : "Adopt Version 2 →"}
        </button>
        <button
          onClick={() => decide(false)}
          disabled={saving}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Keep Current Offer →
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

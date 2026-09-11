"use client";

import { useState } from "react";
import type { OfferDocument, OpportunitySession } from "@/lib/types";
import { OFFER_PREFILL_LABELS } from "@/lib/types";

const DOCUMENT_FIELDS: { key: keyof OfferDocument; label: string; multiline?: boolean }[] = [
  { key: "offerName", label: "Offer name" },
  { key: "oneLinePromise", label: "One-line promise" },
  { key: "whoItIsFor", label: "Who it is for", multiline: true },
  { key: "problem", label: "Problem", multiline: true },
  { key: "outcome", label: "Outcome", multiline: true },
  { key: "whatYouDo", label: "What you do", multiline: true },
  { key: "whatTheyReceive", label: "What they receive", multiline: true },
  { key: "timeline", label: "Timeline" },
  { key: "price", label: "Price" },
  { key: "whyYou", label: "Why you", multiline: true },
  { key: "whatMakesThisDifferent", label: "What makes this different", multiline: true },
  { key: "whatIsNotIncluded", label: "What is not included", multiline: true },
  { key: "callToAction", label: "Call to action" },
];

export function OfferStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const offer = session.offer;
  const actionPlanApproved = session.actionPlan?.approved ?? false;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState<OfferDocument | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    setEdited(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/offer`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to architect the offer.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function save(approve: boolean) {
    if (!offer) return;
    const doc = edited ?? { ...offer.document, ...offer.userEdits };
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/offer/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEdits: doc, approve }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!actionPlanApproved) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the Action Plan stage first.</p>;
  }

  if (!offer) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Every field of your offer is drafted automatically — WHO → PROBLEM → OUTCOME →
          MECHANISM → DELIVERABLES → PROOF → SCOPE → TIMELINE → PRICE → RISK REDUCTION — each
          with its own recommendation, reasoning, evidence, and confidence. Nothing here is a
          guaranteed result; pricing is a hypothesis unless the market has verified it. Edit
          anything before approving.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Drafting…" : "Draft My Offer"}
        </button>
      </div>
    );
  }

  const effective = edited ?? { ...offer.document, ...offer.userEdits };

  function updateField(key: keyof OfferDocument, value: string) {
    setEdited({ ...effective, [key]: value });
  }

  if (offer.approved) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Offer approved. Review stage unlocked next.
        </div>
        <OfferDocumentView doc={effective} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">How each field was chosen</h3>
        {(Object.keys(OFFER_PREFILL_LABELS) as (keyof typeof OFFER_PREFILL_LABELS)[]).map((key) => {
          const p = offer.prefill[key];
          return (
            <details key={key} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <summary className="cursor-pointer font-medium text-zinc-800 dark:text-zinc-200">
                {OFFER_PREFILL_LABELS[key]}: {p.recommendation}
              </summary>
              <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <p><span className="font-medium">Why: </span>{p.why}</p>
                <p><span className="font-medium">Evidence: </span>{p.evidence}</p>
                <p><span className="font-medium">Confidence: </span>{p.confidence}</p>
              </div>
            </details>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Your offer — edit anything</h3>
        {DOCUMENT_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{f.label}</label>
            {f.multiline ? (
              <textarea
                value={effective[f.key]}
                onChange={(e) => updateField(f.key, e.target.value)}
                rows={2}
                className="w-full rounded border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            ) : (
              <input
                value={effective[f.key]}
                onChange={(e) => updateField(f.key, e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "Saving…" : "Approve Offer & Continue →"}
        </button>
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Save Draft
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

export function OfferDocumentView({ doc }: { doc: OfferDocument }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{doc.offerName}</h3>
      <p className="mt-1 text-sm italic text-zinc-600 dark:text-zinc-400">{doc.oneLinePromise}</p>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {DOCUMENT_FIELDS.filter((f) => f.key !== "offerName" && f.key !== "oneLinePromise").map((f) => (
          <div key={f.key}>
            <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">{f.label}</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">{doc[f.key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

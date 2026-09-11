"use client";

import { useState } from "react";
import type { OnePagerDocument, OpportunitySession } from "@/lib/types";

const FIELDS: { key: keyof OnePagerDocument; label: string; multiline?: boolean }[] = [
  { key: "offerName", label: "Offer name" },
  { key: "whoThisIsFor", label: "Who this is for", multiline: true },
  { key: "theProblem", label: "The problem", multiline: true },
  { key: "theOutcome", label: "The outcome", multiline: true },
  { key: "whatWeDo", label: "What we do", multiline: true },
  { key: "whatYouGet", label: "What you get", multiline: true },
  { key: "howItWorks", label: "How it works", multiline: true },
  { key: "timeline", label: "Timeline" },
  { key: "whyTrustUs", label: "Why trust us", multiline: true },
  { key: "pricingModel", label: "Starting price / pricing model" },
  { key: "callToAction", label: "Call to action" },
];

export function OnePagerStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const onePager = session.onePager;
  const reviewApproved = session.review?.approved ?? false;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edited, setEdited] = useState<OnePagerDocument | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    setEdited(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/one_pager`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate the one-pager.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function save(approve: boolean) {
    if (!onePager) return;
    const doc = edited ?? { ...onePager.document, ...onePager.userEdits };
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/one_pager/review`, {
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

  if (!reviewApproved) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the Review stage first.</p>;
  }

  if (!onePager) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A buyer-oriented one-page sales asset — not a resume, not a biography. Concrete
          language, no invented clients, testimonials, results, or statistics.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Drafting…" : "Generate One-Pager"}
        </button>
      </div>
    );
  }

  const effective = edited ?? { ...onePager.document, ...onePager.userEdits };
  function updateField(key: keyof OnePagerDocument, value: string) {
    setEdited({ ...effective, [key]: value });
  }

  if (onePager.approved) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          One-Pager approved. Prospects stage unlocked next.
        </div>
        <OnePagerView doc={effective} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <OnePagerView doc={effective} />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Edit anything</h3>
        {FIELDS.map((f) => (
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
          {saving ? "Saving…" : "Approve One-Pager & Continue →"}
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

function OnePagerView({ doc }: { doc: OnePagerDocument }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{doc.offerName}</h3>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm">
        {FIELDS.filter((f) => f.key !== "offerName").map((f) => (
          <div key={f.key}>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">{f.label}</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">{doc[f.key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

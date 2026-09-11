"use client";

import { useState } from "react";
import type { OpportunitySession } from "@/lib/types";
import { OfferDocumentView } from "./OfferStage";

export function ReviewStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const review = session.review;
  const offerApproved = session.offer?.approved ?? false;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/review`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to critique the offer.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function decide(decision: "kept_original" | "adopted_revision") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/review/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
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

  if (!offerApproved || !session.offer) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the Offer stage first.</p>;
  }

  const currentDoc = { ...session.offer.document, ...session.offer.userEdits };

  if (!review) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This stage attacks your offer before the market does — problem severity, buyer
          specificity, differentiation, credibility, pricing logic, ease of buying and
          delivering — and tries to disprove it. It does not praise automatically.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Critiquing…" : "Critique This Offer"}
        </button>
      </div>
    );
  }

  if (review.approved) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Review complete — {review.decision === "adopted_revision" ? "you adopted the revised offer" : "you kept the original offer"}.
        </div>
        <VerdictBlock review={review} />
        <OfferDocumentView doc={currentDoc} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <VerdictBlock review={review} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ListBlock title="Critical problems" items={review.criticalProblems} tone="critical" />
        <ListBlock title="Important improvements" items={review.importantImprovements} tone="important" />
        <ListBlock title="Optional improvements" items={review.optionalImprovements} tone="optional" />
        <ListBlock title="What to keep" items={review.whatToKeep} tone="keep" />
      </div>

      {review.materialChanges.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300">
            The revised offer changes your direction, not just wording
          </h3>
          <ul className="mt-1.5 list-disc pl-4 text-amber-800 dark:text-amber-300">
            {review.materialChanges.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Current offer</h3>
          <OfferDocumentView doc={currentDoc} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Revised offer</h3>
          <OfferDocumentView doc={review.revisedOffer} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => decide("adopted_revision")}
          disabled={saving}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "Saving…" : "Adopt Revised Offer →"}
        </button>
        <button
          onClick={() => decide("kept_original")}
          disabled={saving}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Keep Original Offer →
        </button>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {generating ? "Re-critiquing…" : "Regenerate"}
        </button>
      </div>
    </div>
  );
}

function VerdictBlock({ review }: { review: NonNullable<OpportunitySession["review"]> }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">Offer health score</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{review.healthScore}/10</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">Ready for market test</p>
          <p className={`text-lg font-semibold ${review.readyForMarketTest ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {review.readyForMarketTest ? "YES" : "NO"}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
        <span className="font-medium">Biggest remaining risk: </span>
        {review.biggestRemainingRisk}
      </p>
      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
        <span className="font-medium">Next best action: </span>
        {review.nextBestAction}
      </p>
    </div>
  );
}

const TONE_STYLE: Record<string, string> = {
  critical: "border-red-200 dark:border-red-900",
  important: "border-amber-200 dark:border-amber-900",
  optional: "border-zinc-200 dark:border-zinc-800",
  keep: "border-emerald-200 dark:border-emerald-900",
};

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div className={`rounded-lg border p-3 text-sm ${TONE_STYLE[tone]}`}>
      <h4 className="font-medium text-zinc-800 dark:text-zinc-200">{title}</h4>
      <ul className="mt-1 list-disc pl-4 text-zinc-600 dark:text-zinc-400">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

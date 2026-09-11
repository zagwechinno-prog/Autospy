"use client";

import { useState } from "react";
import type { OpportunitySession } from "@/lib/types";

export function LoopView({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const loop = session.loop;
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/loop`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to synthesize the opportunity loop.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This isn&apos;t another stage to complete — it&apos;s a living snapshot of the whole
        opportunity, regenerated on demand from whatever you&apos;ve done so far. Its job is not
        to produce more content; it&apos;s to increase the odds this turns into real economic
        activity by naming the single highest-value next action.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        onClick={generate}
        disabled={generating}
        className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {generating ? "Synthesizing…" : loop ? "Refresh Snapshot" : "Generate Snapshot"}
      </button>

      {loop && (
        <>
          <div className="rounded-lg border border-zinc-900 bg-zinc-50 p-4 dark:border-zinc-100 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              Highest-value next action
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {loop.highestValueNextAction}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Block title="What we know" items={loop.whatWeKnow} />
            <Block title="What we inferred" items={loop.whatWeInferred} />
            <Block title="What we tested" items={loop.whatWeTested} />
            <Block title="What worked" items={loop.whatWorked} tone="positive" />
            <Block title="What failed" items={loop.whatFailed} tone="negative" />
            <Block title="What remains uncertain" items={loop.whatRemainsUncertain} />
            <Block title="What changed" items={loop.whatChanged} />
            <Block title="What should happen next" items={loop.whatShouldHappenNext} />
          </div>

          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">This iteration</h3>
            <dl className="mt-2 flex flex-col gap-2 text-sm">
              <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">What did we learn?</dt><dd className="text-zinc-700 dark:text-zinc-300">{loop.learnedThisIteration}</dd></div>
              <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Evidence for change</dt><dd className="text-zinc-700 dark:text-zinc-300">{loop.evidenceForChange}</dd></div>
              <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">What should remain unchanged?</dt><dd className="text-zinc-700 dark:text-zinc-300">{loop.whatShouldRemainUnchanged}</dd></div>
              <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">What to test next</dt><dd className="text-zinc-700 dark:text-zinc-300">{loop.whatToTestNext}</dd></div>
            </dl>
          </div>

          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Generated {new Date(loop.generatedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}

function Block({ title, items, tone }: { title: string; items: string[]; tone?: "positive" | "negative" }) {
  const border =
    tone === "positive"
      ? "border-emerald-200 dark:border-emerald-900"
      : tone === "negative"
      ? "border-amber-200 dark:border-amber-900"
      : "border-zinc-200 dark:border-zinc-800";
  if (items.length === 0) {
    return (
      <div className={`rounded-lg border p-3 text-sm ${border}`}>
        <h4 className="font-medium text-zinc-800 dark:text-zinc-200">{title}</h4>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">Nothing here yet.</p>
      </div>
    );
  }
  return (
    <div className={`rounded-lg border p-3 text-sm ${border}`}>
      <h4 className="font-medium text-zinc-800 dark:text-zinc-200">{title}</h4>
      <ul className="mt-1 list-disc pl-4 text-zinc-600 dark:text-zinc-400">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

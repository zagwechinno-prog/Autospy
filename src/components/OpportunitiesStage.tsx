"use client";

import { useState } from "react";
import type { OpportunitySession, ReviewStatus } from "@/lib/types";
import { DecisionButton } from "./DecisionButton";

type DecidedStatus = Exclude<ReviewStatus, "pending">;
interface Decision {
  status: DecidedStatus;
  text: string;
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-zinc-500 dark:text-zinc-500">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-200" style={{ width: `${(value / 10) * 100}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-zinc-600 dark:text-zinc-400">{value}</span>
    </div>
  );
}

export function OpportunitiesStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const opportunities = session.opportunities;
  const marketApproved = session.market?.approved ?? false;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  async function generate() {
    setGenerating(true);
    setError(null);
    setDecisions({});
    try {
      const res = await fetch(`/api/session/${sessionId}/opportunities`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to rank opportunities.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  function decisionFor(id: string, text: string): Decision {
    return decisions[id] ?? { status: "approved", text };
  }
  function setDecision(id: string, patch: Partial<Decision>, text: string) {
    setDecisions((prev) => ({ ...prev, [id]: { ...decisionFor(id, text), ...patch } }));
  }

  async function submit(approve: boolean) {
    if (!opportunities) return;
    setSaving(true);
    setError(null);
    try {
      const body = opportunities.opportunities.map((o) => {
        const d = decisionFor(o.id, o.title);
        return { id: o.id, reviewStatus: d.status, userEdit: d.status === "edited" ? d.text : undefined };
      });
      const res = await fetch(`/api/session/${sessionId}/opportunities/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunities: body, approve }),
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

  if (!marketApproved) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the Market stage first.</p>;
  }

  if (!opportunities) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This stage scores every approved capability on demand, buyer value, evidence, fit, and
          accessibility, using a transparent (not pretend-objective) scoring model, and ranks the
          top opportunities.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Ranking…" : "Rank Opportunities"}
        </button>
      </div>
    );
  }

  const first = opportunities.opportunities[0];

  if (opportunities.approved) {
    const active = opportunities.opportunities.filter((o) => o.reviewStatus !== "rejected");
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Opportunities approved — {active.length} carried into Direction.
        </div>
        <div className="flex flex-col gap-2">
          {active.map((o, i) => (
            <div key={o.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {i === 0 ? "🏆 " : ""}
                  {o.userEdit ?? o.title}
                </p>
                <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-500">
                  {o.compositeScore}/10
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{o.rationale}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {first && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Why &quot;{first.title}&quot; ranked first
          </h3>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{opportunities.whyRankedFirst}</p>
          <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">What could change the ranking</h3>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{opportunities.whatCouldChangeRanking}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {opportunities.opportunities.map((o, i) => {
          const d = decisionFor(o.id, o.title);
          return (
            <div
              key={o.id}
              className={`rounded-lg border border-zinc-200 p-4 transition-opacity dark:border-zinc-800 ${
                d.status === "rejected" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                    #{i + 1} · Opportunity score {o.compositeScore}/10
                  </p>
                  {d.status === "edited" ? (
                    <input
                      value={d.text}
                      onChange={(e) => setDecision(o.id, { text: e.target.value }, o.title)}
                      className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  ) : (
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{o.title}</p>
                  )}
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{o.rationale}</p>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    <ScoreRow label="Demand" value={o.scores.demand} />
                    <ScoreRow label="Buyer value" value={o.scores.buyerValue} />
                    <ScoreRow label="Evidence" value={o.scores.evidence} />
                    <ScoreRow label="Fit" value={o.scores.fit} />
                    <ScoreRow label="Accessibility" value={o.scores.accessibility} />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Buyer: </span>
                    {o.buyer} <span className="font-medium">· Problem: </span>
                    {o.problem}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Possible outcome: </span>
                    {o.possibleOutcome}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Potential service: </span>
                    {o.potentialService}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Major risk: </span>
                    {o.majorRisk}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Proof gap: </span>
                    {o.proofGap}
                  </p>
                  <p className="text-xs italic text-zinc-400 dark:text-zinc-600">Confidence: {o.confidence}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <DecisionButton active={d.status === "approved"} onClick={() => setDecision(o.id, { status: "approved", text: o.title }, o.title)}>
                  Approve
                </DecisionButton>
                <DecisionButton active={d.status === "edited"} onClick={() => setDecision(o.id, { status: "edited" }, o.title)}>
                  Rename
                </DecisionButton>
                <DecisionButton
                  active={d.status === "rejected"}
                  tone="reject"
                  onClick={() => setDecision(o.id, { status: "rejected", text: o.title }, o.title)}
                >
                  Reject
                </DecisionButton>
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => submit(true)}
          disabled={saving}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "Saving…" : "Approve Opportunities & Continue →"}
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

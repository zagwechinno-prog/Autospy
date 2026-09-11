"use client";

import { useState } from "react";
import type { OpportunitySession } from "@/lib/types";

export function DirectionStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const direction = session.direction;
  const opportunitiesApproved = session.opportunities?.approved ?? false;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [openQuestions, setOpenQuestions] = useState("");

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/direction`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate guidance.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function select() {
    if (!selectedId || !reason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/direction/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: selectedId,
          reasonSelected: reason.trim(),
          openQuestions: openQuestions
            .split("\n")
            .map((q) => q.trim())
            .filter(Boolean),
        }),
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

  if (!opportunitiesApproved) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the Opportunities stage first.</p>;
  }

  if (!direction) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This stage does not decide for you. It presents your strongest ranked opportunities
          side by side with priority-based guidance, and you choose one direction to pursue.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Preparing…" : "Show Candidates"}
        </button>
      </div>
    );
  }

  const candidates = (session.opportunities?.opportunities ?? []).filter((o) => direction.candidateIds.includes(o.id));

  if (direction.selected) {
    const s = direction.selected;
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Direction selected — {s.opportunity}. Action Plan stage unlocked next.
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.opportunity}</h3>
          <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Target buyer</dt><dd className="text-zinc-700 dark:text-zinc-300">{s.targetBuyer}</dd></div>
            <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Problem</dt><dd className="text-zinc-700 dark:text-zinc-300">{s.problem}</dd></div>
            <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Desired outcome</dt><dd className="text-zinc-700 dark:text-zinc-300">{s.desiredOutcome}</dd></div>
            <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Capability / service</dt><dd className="text-zinc-700 dark:text-zinc-300">{s.capability}</dd></div>
          </dl>
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Why you chose this: </span>
            {s.reasonSelected}
          </p>
          {s.openQuestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Open questions</p>
              <ul className="list-disc pl-4 text-sm text-zinc-700 dark:text-zinc-300">
                {s.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">If your priority is…</h3>
        {direction.priorityStatements.map((s, i) => {
          const opp = candidates.find((c) => c.id === s.recommendedOpportunityId);
          return (
            <div key={i} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <p className="text-zinc-800 dark:text-zinc-200">
                If your priority is <span className="font-medium">{s.priority}</span>, choose{" "}
                <span className="font-medium">{opp ? (opp.userEdit ?? opp.title) : "—"}</span>.
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{s.rationale}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Choose your direction</h3>
        {candidates.map((c) => (
          <label
            key={c.id}
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 text-sm transition-colors ${
              selectedId === c.id
                ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="direction"
                checked={selectedId === c.id}
                onChange={() => setSelectedId(c.id)}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{c.userEdit ?? c.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                  Buyer: {c.buyer} · Score: {c.compositeScore}/10 · Risk: {c.majorRisk}
                </p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{c.rationale}</p>
              </div>
            </div>
          </label>
        ))}
      </div>

      {selectedId && (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Why did you choose this direction?
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="Your reasoning — this becomes part of SELECTED_DIRECTION and carries into the rest of the pipeline."
          />
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Open questions (optional, one per line)
          </label>
          <textarea
            value={openQuestions}
            onChange={(e) => setOpenQuestions(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div>
        <button
          onClick={select}
          disabled={saving || !selectedId || !reason.trim()}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "Saving…" : "Confirm This Direction →"}
        </button>
      </div>
    </div>
  );
}

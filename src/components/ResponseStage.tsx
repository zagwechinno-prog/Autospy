"use client";

import { useState } from "react";
import type { OpportunitySession } from "@/lib/types";
import { RESPONSE_CATEGORY_LABELS } from "@/lib/types";

interface DraftEntry {
  prospectLabel: string;
  date: string;
  channel: string;
  messageSummary: string;
  responseText: string;
}

const emptyEntry: DraftEntry = { prospectLabel: "", date: "", channel: "", messageSummary: "", responseText: "" };

export function ResponseStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const response = session.response;
  const outreachApproved = session.outreach?.approved ?? false;
  const [entries, setEntries] = useState<DraftEntry[]>(
    response && response.entries.length > 0
      ? response.entries.map((e) => ({
          prospectLabel: e.prospectLabel,
          date: e.date,
          channel: e.channel,
          messageSummary: e.messageSummary,
          responseText: e.responseText,
        }))
      : [{ ...emptyEntry }]
  );
  const [editingLog, setEditingLog] = useState(!response);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateEntry(idx: number, field: keyof DraftEntry, value: string) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }

  async function saveLog() {
    setSaving(true);
    setError(null);
    try {
      const clean = entries.filter((e) => e.prospectLabel.trim() && e.responseText.trim());
      if (clean.length === 0) {
        throw new Error("Log at least one entry with a prospect and their response.");
      }
      const res = await fetch(`/api/session/${sessionId}/response/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save the log.");
      onUpdate(data);
      setEditingLog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/response/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to analyze responses.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function approve() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${sessionId}/response/review`, {
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

  if (!outreachApproved) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the Outreach stage first.</p>;
  }

  const isAnalyzed = !!response?.feedbackSummary;

  return (
    <div className="flex flex-col gap-6">
      {response?.approved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Response analysis approved. Optimization stage unlocked next.
        </div>
      )}

      {editingLog ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Log what actually happened when you sent your outreach — real prospects, real
            responses. This is the tracking structure from the Outreach stage, filled in with
            reality. At least one entry with a real response is needed before analysis, and
            patterns only mean something across several.
          </p>
          {entries.map((e, idx) => (
            <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-2 dark:border-zinc-800">
              <input value={e.prospectLabel} onChange={(ev) => updateEntry(idx, "prospectLabel", ev.target.value)} placeholder="Prospect / company" className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
              <input value={e.date} onChange={(ev) => updateEntry(idx, "date", ev.target.value)} placeholder="Date" className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
              <input value={e.channel} onChange={(ev) => updateEntry(idx, "channel", ev.target.value)} placeholder="Channel (email, LinkedIn...)" className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-950" />
              <textarea value={e.messageSummary} onChange={(ev) => updateEntry(idx, "messageSummary", ev.target.value)} placeholder="What you sent (summary)" rows={2} className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-950" />
              <textarea value={e.responseText} onChange={(ev) => updateEntry(idx, "responseText", ev.target.value)} placeholder="What they said back (or 'no response')" rows={2} className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEntries((prev) => [...prev, { ...emptyEntry }])}
            className="w-fit text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            + add entry
          </button>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            onClick={saveLog}
            disabled={saving}
            className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {saving ? "Saving…" : "Save Log"}
          </button>
        </div>
      ) : (
        <>
          {!isAnalyzed && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {response?.entries.length} entries logged. Ready to classify and look for
                patterns.
              </p>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={analyze}
                  disabled={analyzing}
                  className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {analyzing ? "Analyzing…" : "Analyze Responses"}
                </button>
                <button
                  onClick={() => setEditingLog(true)}
                  className="w-fit rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Edit Log
                </button>
              </div>
            </div>
          )}

          {isAnalyzed && response && (
            <>
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Feedback summary</h3>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{response.feedbackSummary}</p>
                <p className="mt-2 text-xs italic text-zinc-500 dark:text-zinc-500">Confidence: {response.confidence}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ListBlock title="Patterns" items={response.patterns} />
                <ListBlock title="Buyer language" items={response.buyerLanguage} />
                <ListBlock title="Objections" items={response.objections} />
                <ListBlock title="Recommended changes" items={response.recommendedChanges} />
                <ListBlock title="Signals of demand" items={response.signalsOfDemand} tone="positive" />
                <ListBlock title="Signals of weak demand" items={response.signalsOfWeakDemand} tone="negative" />
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Logged entries</h3>
                {response.entries.map((e) => (
                  <div key={e.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{e.prospectLabel}</p>
                      <div className="flex gap-1">
                        {e.category && (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                            {RESPONSE_CATEGORY_LABELS[e.category]}
                          </span>
                        )}
                        {e.rootCause && (
                          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] text-white dark:bg-zinc-100 dark:text-zinc-900">
                            {e.rootCause}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      {e.date} · {e.channel}
                    </p>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">{e.responseText}</p>
                    {e.notes && <p className="mt-1 text-xs italic text-zinc-500 dark:text-zinc-500">{e.notes}</p>}
                  </div>
                ))}
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              {!response.approved && (
                <div className="flex gap-3">
                  <button
                    onClick={approve}
                    disabled={saving}
                    className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    {saving ? "Saving…" : "Approve Analysis & Continue →"}
                  </button>
                  <button
                    onClick={() => setEditingLog(true)}
                    className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Edit Log
                  </button>
                  <button
                    onClick={analyze}
                    disabled={analyzing}
                    className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    {analyzing ? "Re-analyzing…" : "Re-analyze"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone?: "positive" | "negative" }) {
  if (items.length === 0) return null;
  const border = tone === "positive" ? "border-emerald-200 dark:border-emerald-900" : tone === "negative" ? "border-amber-200 dark:border-amber-900" : "border-zinc-200 dark:border-zinc-800";
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

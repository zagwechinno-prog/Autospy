"use client";

import { useState } from "react";
import type { EvidenceStrength, OpportunitySession, ReviewStatus } from "@/lib/types";
import { DecisionButton } from "./DecisionButton";

type DecidedStatus = Exclude<ReviewStatus, "pending">;
interface Decision {
  status: DecidedStatus;
  text: string;
}

const STRENGTH_STYLE: Record<EvidenceStrength, string> = {
  strong: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/30",
  moderate: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-400/30",
  weak: "bg-zinc-100 text-zinc-600 ring-zinc-400/30 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-600/30",
};

function StrengthBadge({ strength }: { strength: EvidenceStrength }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset ${STRENGTH_STYLE[strength]}`}
    >
      {strength} evidence
    </span>
  );
}

export function CapabilitiesStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const capabilities = session.capabilities;
  const autopsyApproved = session.autopsy?.approved ?? false;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  async function generate() {
    setGenerating(true);
    setError(null);
    setDecisions({});
    try {
      const res = await fetch(`/api/session/${sessionId}/capabilities`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate capabilities.");
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
    if (!capabilities) return;
    setSaving(true);
    setError(null);
    try {
      const body = capabilities.capabilities.map((c) => {
        const d = decisionFor(c.id, c.capability);
        return {
          id: c.id,
          reviewStatus: d.status,
          userEdit: d.status === "edited" ? d.text : undefined,
        };
      });
      const res = await fetch(`/api/session/${sessionId}/capabilities/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilities: body, approve }),
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

  if (!autopsyApproved) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the Autopsy stage first.</p>;
  }

  if (!capabilities) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A skill isn&apos;t a capability, a capability isn&apos;t a service, and a service isn&apos;t
          an offer. This stage translates your approved Profile and Autopsy into 5-10 candidate
          capabilities pitched at the right altitude — each with a buyer problem, likely buyers, and
          an honest evidence-strength read.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Translating…" : "Find Marketable Capabilities"}
        </button>
      </div>
    );
  }

  if (capabilities.approved) {
    const active = capabilities.capabilities.filter((c) => c.reviewStatus !== "rejected");
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Capabilities approved — {active.length} candidate{active.length === 1 ? "" : "s"} carried
          into Market research.
        </div>
        <div className="flex flex-col gap-2">
          {active.map((c) => (
            <div key={c.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {c.userEdit ?? c.capability}
                </p>
                <StrengthBadge strength={c.evidenceStrength} />
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {capabilities.capabilities.map((c) => {
          const d = decisionFor(c.id, c.capability);
          return (
            <div
              key={c.id}
              className={`rounded-lg border border-zinc-200 p-4 transition-opacity dark:border-zinc-800 ${
                d.status === "rejected" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  {d.status === "edited" ? (
                    <input
                      value={d.text}
                      onChange={(e) => setDecision(c.id, { text: e.target.value }, c.capability)}
                      className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  ) : (
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{c.capability}</p>
                  )}
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{c.description}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Buyer problems: </span>
                    {c.buyerProblems.join("; ")}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Likely buyers: </span>
                    {c.potentialBuyers.join("; ")}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Transferability: </span>
                    {c.transferability}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Economic value: </span>
                    {c.economicValue}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Competitive context: </span>
                    {c.competitiveContext}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Proof gap: </span>
                    {c.proofGap}
                  </p>
                  <p className="text-xs italic text-zinc-400 dark:text-zinc-600">Confidence: {c.confidence}</p>
                </div>
                <StrengthBadge strength={c.evidenceStrength} />
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <DecisionButton
                  active={d.status === "approved"}
                  onClick={() => setDecision(c.id, { status: "approved", text: c.capability }, c.capability)}
                >
                  Approve
                </DecisionButton>
                <DecisionButton
                  active={d.status === "edited"}
                  onClick={() => setDecision(c.id, { status: "edited" }, c.capability)}
                >
                  Rename
                </DecisionButton>
                <DecisionButton
                  active={d.status === "rejected"}
                  tone="reject"
                  onClick={() => setDecision(c.id, { status: "rejected", text: c.capability }, c.capability)}
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
          {saving ? "Saving…" : "Approve Capabilities & Continue →"}
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

"use client";

import { useState } from "react";
import type { OpportunitySession, ReviewStatus } from "@/lib/types";
import { AUTOPSY_CATEGORY_LABELS } from "@/lib/types";
import { DecisionButton } from "./DecisionButton";

type DecidedStatus = Exclude<ReviewStatus, "pending">;
interface Decision {
  status: DecidedStatus;
  text: string;
}

const CATEGORY_STYLE: Record<string, string> = {
  strength: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  high_value_evidence: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  hidden_value: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  opportunity_clue: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  under_positioned: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  pattern: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  weakness: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  generic_claim: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  missing_evidence: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  risk: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        CATEGORY_STYLE[category] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
      }`}
    >
      {AUTOPSY_CATEGORY_LABELS[category as keyof typeof AUTOPSY_CATEGORY_LABELS] ?? category}
    </span>
  );
}

export function AutopsyStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const autopsy = session.autopsy;
  const profileApproved = session.profile?.approved ?? false;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  async function generate() {
    setGenerating(true);
    setError(null);
    setDecisions({});
    try {
      const res = await fetch(`/api/session/${sessionId}/autopsy`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate autopsy.");
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
    if (!autopsy) return;
    setSaving(true);
    setError(null);
    try {
      const findings = autopsy.findings.map((f) => {
        const d = decisionFor(f.id, f.text);
        return {
          id: f.id,
          reviewStatus: d.status,
          userEdit: d.status === "edited" ? d.text : undefined,
        };
      });
      const res = await fetch(`/api/session/${sessionId}/autopsy/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findings, approve }),
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

  if (!profileApproved) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Approve the Profile stage first.
      </p>
    );
  }

  if (!autopsy) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Autopsy analyzes your raw experience as evidence of economic capability — not as a
          resume to be graded, but as proof to be read. It surfaces strengths, weaknesses,
          hidden value, under-positioned capabilities, generic claims, missing evidence,
          patterns, risks, and opportunity clues.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Analyzing…" : "Run Autopsy"}
        </button>
      </div>
    );
  }

  if (autopsy.approved) {
    const active = autopsy.findings.filter((f) => f.reviewStatus !== "rejected");
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Autopsy approved — {active.length} finding{active.length === 1 ? "" : "s"} carried forward.
          Capabilities stage unlocked next.
        </div>
        <Headline autopsy={autopsy} />
        <div className="flex flex-col gap-2">
          {active.map((f) => (
            <div
              key={f.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <p className="text-sm text-zinc-800 dark:text-zinc-200">{f.userEdit ?? f.text}</p>
              <CategoryBadge category={f.category} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Headline autopsy={autopsy} />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Findings — review each one
        </h3>
        {autopsy.findings.map((f) => {
          const d = decisionFor(f.id, f.text);
          return (
            <div
              key={f.id}
              className={`rounded-lg border border-zinc-200 p-4 transition-opacity dark:border-zinc-800 ${
                d.status === "rejected" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {d.status === "edited" ? (
                    <textarea
                      value={d.text}
                      onChange={(e) => setDecision(f.id, { text: e.target.value }, f.text)}
                      rows={2}
                      className="w-full rounded border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  ) : (
                    <p className="text-sm text-zinc-800 dark:text-zinc-200">{f.text}</p>
                  )}
                </div>
                <CategoryBadge category={f.category} />
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <DecisionButton
                  active={d.status === "approved"}
                  onClick={() => setDecision(f.id, { status: "approved", text: f.text }, f.text)}
                >
                  Approve
                </DecisionButton>
                <DecisionButton
                  active={d.status === "edited"}
                  onClick={() => setDecision(f.id, { status: "edited" }, f.text)}
                >
                  Edit
                </DecisionButton>
                <DecisionButton
                  active={d.status === "rejected"}
                  tone="reject"
                  onClick={() => setDecision(f.id, { status: "rejected", text: f.text }, f.text)}
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
          {saving ? "Saving…" : "Approve Autopsy & Continue →"}
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

function Headline({ autopsy }: { autopsy: NonNullable<OpportunitySession["autopsy"]> }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{autopsy.headline}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {autopsy.capabilitiesIdentifiedCount} findings identified · {autopsy.highPotentialCount} high-potential
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-zinc-700 dark:text-zinc-300">
        {autopsy.strongestDiscoveries.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    </div>
  );
}

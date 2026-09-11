"use client";

import { useState } from "react";
import type { OpportunitySession, ReviewStatus } from "@/lib/types";
import { EvidenceBadge } from "./EvidenceBadge";

type DecidedStatus = Exclude<ReviewStatus, "pending">;
interface Decision {
  status: DecidedStatus;
  text: string;
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
        const d = decisionFor(f.id, f.realCapability);
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
        Approve the Profile stage first — Autopsy builds directly on the capabilities you confirmed
        there.
      </p>
    );
  }

  if (!autopsy) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Autopsy cuts past job titles to what they actually made you capable of doing for a buyer:
          the real capability, the problem it solves, and the outcome it delivers — plus the
          recurring pattern underneath all of it.
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
        <PatternAndEconomics autopsy={autopsy} />
        <div className="flex flex-col gap-2">
          {active.map((f) => (
            <FindingReadCard key={f.id} finding={f} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PatternAndEconomics autopsy={autopsy} />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Findings — review each one
        </h3>
        {autopsy.findings.map((f) => {
          const d = decisionFor(f.id, f.realCapability);
          return (
            <div
              key={f.id}
              className={`rounded-lg border border-zinc-200 p-4 transition-opacity dark:border-zinc-800 ${
                d.status === "rejected" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                    Stated as: {f.statedRole}
                  </p>
                  {d.status === "edited" ? (
                    <textarea
                      value={d.text}
                      onChange={(e) => setDecision(f.id, { text: e.target.value }, f.realCapability)}
                      rows={2}
                      className="w-full rounded border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  ) : (
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {f.realCapability}
                    </p>
                  )}
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium">Problem solved: </span>
                    {f.problemSolved}
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium">Outcome: </span>
                    {f.outcomeDelivered}
                  </p>
                  <p className="text-xs italic text-zinc-500 dark:text-zinc-500">
                    “{f.evidenceQuote}”
                  </p>
                </div>
                <EvidenceBadge tag={f.evidenceTag} />
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <DecisionButton
                  active={d.status === "approved"}
                  onClick={() => setDecision(f.id, { status: "approved", text: f.realCapability }, f.realCapability)}
                >
                  Approve
                </DecisionButton>
                <DecisionButton
                  active={d.status === "edited"}
                  onClick={() => setDecision(f.id, { status: "edited" }, f.realCapability)}
                >
                  Edit
                </DecisionButton>
                <DecisionButton
                  active={d.status === "rejected"}
                  tone="reject"
                  onClick={() => setDecision(f.id, { status: "rejected", text: f.realCapability }, f.realCapability)}
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

function PatternAndEconomics({ autopsy }: { autopsy: NonNullable<OpportunitySession["autopsy"]> }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recurring pattern</h3>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{autopsy.patternSummary}</p>
      </div>
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          What this is worth right now
        </h3>
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{autopsy.economicCapabilitySummary}</p>
      </div>
    </div>
  );
}

function FindingReadCard({ finding }: { finding: NonNullable<OpportunitySession["autopsy"]>["findings"][number] }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            Stated as: {finding.statedRole}
          </p>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {finding.userEdit ?? finding.realCapability}
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Problem solved: </span>
            {finding.problemSolved}
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Outcome: </span>
            {finding.outcomeDelivered}
          </p>
        </div>
        <EvidenceBadge tag={finding.evidenceTag} />
      </div>
    </div>
  );
}

function DecisionButton({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "reject";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 font-medium transition-colors ${
        active
          ? tone === "reject"
            ? "bg-red-600 text-white"
            : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

"use client";

import { useState } from "react";
import type { OpportunitySession, ProspectVerification, ReviewStatus } from "@/lib/types";
import { DecisionButton } from "./DecisionButton";

type DecidedStatus = Exclude<ReviewStatus, "pending">;
interface Decision {
  status: DecidedStatus;
  text: string;
}

function VerificationBadge({ v }: { v: ProspectVerification }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset ${
        v === "VERIFIED"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/30"
          : "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-400/30"
      }`}
    >
      {v}
    </span>
  );
}

export function ProspectsStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const prospects = session.prospects;
  const onePagerApproved = session.onePager?.approved ?? false;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  async function generate() {
    setGenerating(true);
    setError(null);
    setDecisions({});
    try {
      const res = await fetch(`/api/session/${sessionId}/prospects`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to research prospects.");
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
    if (!prospects) return;
    setSaving(true);
    setError(null);
    try {
      const body = prospects.prospects.map((p) => {
        const d = decisionFor(p.id, p.company);
        return { id: p.id, reviewStatus: d.status, userEdit: d.status === "edited" ? d.text : undefined };
      });
      const res = await fetch(`/api/session/${sessionId}/prospects/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: body, approve }),
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

  if (!onePagerApproved) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the One-Pager stage first.</p>;
  }

  if (!prospects) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This stage defines your Ideal Customer Profile, then researches real candidate buyers
          with live web search — prioritized by problem likelihood and fit, never by company
          size alone. No fabricated decision-maker names or contacts; every prospect labeled
          VERIFIED (a real, citable source) or INFERRED (plausible, not confirmed).
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Researching (this can take a minute)…" : "Find Prospects"}
        </button>
      </div>
    );
  }

  const icp = prospects.icp;

  if (prospects.approved) {
    const active = prospects.prospects.filter((p) => p.reviewStatus !== "rejected");
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Prospects approved — {active.length} carried into Outreach.
        </div>
        <div className="flex flex-col gap-2">
          {active.map((p) => (
            <div key={p.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.userEdit ?? p.company}</p>
                <VerificationBadge v={p.verification} />
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{p.whyTheyFit}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Ideal Customer Profile</h3>
        <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Industry</dt><dd className="text-zinc-700 dark:text-zinc-300">{icp.industry}</dd></div>
          <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Company size</dt><dd className="text-zinc-700 dark:text-zinc-300">{icp.companySize}</dd></div>
          <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Geography</dt><dd className="text-zinc-700 dark:text-zinc-300">{icp.geography}</dd></div>
          <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Business model</dt><dd className="text-zinc-700 dark:text-zinc-300">{icp.businessModel}</dd></div>
          <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Likely buyer</dt><dd className="text-zinc-700 dark:text-zinc-300">{icp.likelyBuyer}</dd></div>
          <div><dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Likely problem</dt><dd className="text-zinc-700 dark:text-zinc-300">{icp.likelyProblem}</dd></div>
        </dl>
        {icp.disqualifiers.length > 0 && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            <span className="font-medium">Disqualifiers: </span>
            {icp.disqualifiers.join("; ")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {prospects.prospects.map((p) => {
          const d = decisionFor(p.id, p.company);
          return (
            <div
              key={p.id}
              className={`rounded-lg border border-zinc-200 p-4 transition-opacity dark:border-zinc-800 ${
                d.status === "rejected" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  {d.status === "edited" ? (
                    <input
                      value={d.text}
                      onChange={(e) => setDecision(p.id, { text: e.target.value }, p.company)}
                      className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  ) : (
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.company}</p>
                  )}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 underline dark:text-blue-400">
                      {p.website}
                    </a>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    {p.industry} {p.size ? `· ${p.size}` : ""}
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium">Why they fit: </span>
                    {p.whyTheyFit}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Likely buyer: </span>
                    {p.likelyBuyer}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Trigger: </span>
                    {p.relevantTrigger}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Likely problem: </span>
                    {p.likelyProblem}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    <span className="font-medium">Personalization angle: </span>
                    {p.personalizationAngle}
                  </p>
                  {p.source && (
                    <a href={p.source} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-blue-600 underline dark:text-blue-400">
                      Source: {p.source}
                    </a>
                  )}
                  <p className="text-xs italic text-zinc-400 dark:text-zinc-600">Confidence: {p.confidence}</p>
                </div>
                <VerificationBadge v={p.verification} />
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <DecisionButton active={d.status === "approved"} onClick={() => setDecision(p.id, { status: "approved", text: p.company }, p.company)}>
                  Approve
                </DecisionButton>
                <DecisionButton active={d.status === "edited"} onClick={() => setDecision(p.id, { status: "edited" }, p.company)}>
                  Rename
                </DecisionButton>
                <DecisionButton
                  active={d.status === "rejected"}
                  tone="reject"
                  onClick={() => setDecision(p.id, { status: "rejected", text: p.company }, p.company)}
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
          {saving ? "Saving…" : "Approve Prospects & Continue →"}
        </button>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {generating ? "Re-researching…" : "Regenerate"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { OpportunitySession } from "@/lib/types";
import { DecisionButton } from "./DecisionButton";

type DecidedStatus = "approved" | "rejected";

export function MarketStage({
  sessionId,
  session,
  onUpdate,
}: {
  sessionId: string;
  session: OpportunitySession;
  onUpdate: (s: OpportunitySession) => void;
}) {
  const market = session.market;
  const capabilitiesApproved = session.capabilities?.approved ?? false;
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, DecidedStatus>>({});

  async function generate() {
    setGenerating(true);
    setError(null);
    setDecisions({});
    try {
      const res = await fetch(`/api/session/${sessionId}/market`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to research the market.");
      onUpdate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function submit(approve: boolean) {
    if (!market) return;
    setSaving(true);
    setError(null);
    try {
      const reads = market.reads.map((r) => ({
        id: r.id,
        reviewStatus: decisions[r.id] ?? "approved",
      }));
      const res = await fetch(`/api/session/${sessionId}/market/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reads, approve }),
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

  if (!capabilitiesApproved) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Approve the Capabilities stage first.</p>;
  }

  if (!market) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This stage researches the real market for each approved capability with live web search —
          demand, buyer pain, existing solutions, competitive intensity, pricing signals, entry
          barriers. It distinguishes employment demand from service, consulting, and product demand,
          and every claim is either sourced or explicitly labeled an inference. This does not
          recommend an opportunity yet — that&apos;s the next stage, once you&apos;ve reviewed the evidence.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={generate}
          disabled={generating}
          className="w-fit rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {generating ? "Researching (this can take a minute)…" : "Research the Market"}
        </button>
      </div>
    );
  }

  if (market.approved) {
    const active = market.reads.filter((r) => r.reviewStatus !== "rejected");
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Market stage approved — {active.length} read{active.length === 1 ? "" : "s"} carried
          forward. Opportunities stage unlocked next.
        </div>
        <IntersectionSummary market={market} />
        <div className="flex flex-col gap-3">
          {active.map((r) => (
            <MarketReadCard key={r.id} read={r} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <IntersectionSummary market={market} />

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Market reads — review each one
        </h3>
        {market.reads.map((r) => {
          const status = decisions[r.id] ?? "approved";
          return (
            <div
              key={r.id}
              className={`rounded-lg border border-zinc-200 p-4 transition-opacity dark:border-zinc-800 ${
                status === "rejected" ? "opacity-50" : ""
              }`}
            >
              <MarketReadCard read={r} />
              <div className="mt-3 flex gap-2 text-xs">
                <DecisionButton active={status === "approved"} onClick={() => setDecisions((p) => ({ ...p, [r.id]: "approved" }))}>
                  Approve
                </DecisionButton>
                <DecisionButton
                  active={status === "rejected"}
                  tone="reject"
                  onClick={() => setDecisions((p) => ({ ...p, [r.id]: "rejected" }))}
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
          {saving ? "Saving…" : "Approve Market Reads & Continue →"}
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

function IntersectionSummary({ market }: { market: NonNullable<OpportunitySession["market"]> }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Where experience meets a real market problem
      </h3>
      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{market.intersectionSummary}</p>
    </div>
  );
}

function MarketReadCard({ read }: { read: NonNullable<OpportunitySession["market"]>["reads"][number] }) {
  return (
    <div>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{read.capability}</p>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        <Field label="Market demand" value={read.marketDemand} />
        <Field label="Economic significance" value={read.economicSignificance} />
        <Field label="Competitive intensity" value={read.competitiveIntensity} />
        <Field label="Research confidence" value={read.researchConfidence} />
        <ListField label="Buyer segments" items={read.buyerSegments} />
        <ListField label="Buyer problems" items={read.buyerProblems} />
        <ListField label="Existing solutions" items={read.existingSolutions} />
        <ListField label="Pricing signals" items={read.pricingSignals} />
        <ListField label="Entry barriers" items={read.entryBarriers} />
        <ListField label="Differentiation opportunities" items={read.differentiationOpportunities} />
        <ListField label="Current market signals" items={read.currentMarketSignals} />
      </dl>
      {read.sources.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Sources</p>
          <ul className="mt-0.5 list-disc pl-4">
            {read.sources.map((s, i) => (
              <li key={i} className="truncate text-xs">
                <a href={s} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-medium text-zinc-500 dark:text-zinc-500">{label}</dt>
      <dd className="text-zinc-700 dark:text-zinc-300">{value}</dd>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <dt className="font-medium text-zinc-500 dark:text-zinc-500">{label}</dt>
      <dd className="text-zinc-700 dark:text-zinc-300">
        <ul className="list-disc pl-4">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

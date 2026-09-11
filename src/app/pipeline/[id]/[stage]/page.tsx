"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { STAGES, stageMeta, type StageKey } from "@/lib/pipeline";
import type { OpportunitySession } from "@/lib/types";
import { Stepper } from "@/components/Stepper";
import { ExperienceForm } from "@/components/ExperienceForm";
import { ProfileStage } from "@/components/ProfileStage";
import { AutopsyStage } from "@/components/AutopsyStage";
import { CapabilitiesStage } from "@/components/CapabilitiesStage";
import { MarketStage } from "@/components/MarketStage";
import { OpportunitiesStage } from "@/components/OpportunitiesStage";
import { DirectionStage } from "@/components/DirectionStage";
import { ActionPlanStage } from "@/components/ActionPlanStage";
import { OfferStage } from "@/components/OfferStage";
import { ReviewStage } from "@/components/ReviewStage";
import { OnePagerStage } from "@/components/OnePagerStage";
import { ProspectsStage } from "@/components/ProspectsStage";
import { OutreachStage } from "@/components/OutreachStage";
import { ResponseStage } from "@/components/ResponseStage";
import { OptimizationStage } from "@/components/OptimizationStage";
import { StageStub } from "@/components/StageStub";

const IMPLEMENTED_STAGES = [
  "experience",
  "profile",
  "autopsy",
  "capabilities",
  "market",
  "opportunities",
  "direction",
  "action_plan",
  "offer",
  "review",
  "one_pager",
  "prospects",
  "outreach",
  "response",
  "optimization",
];

const VALID_STAGE_KEYS = new Set(STAGES.map((s) => s.key));

export default function StagePage({
  params,
}: {
  params: Promise<{ id: string; stage: string }>;
}) {
  const { id, stage } = use(params);
  const [session, setSession] = useState<OpportunitySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/session/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = (await res.json()) as OpportunitySession;
        if (!cancelled) setSession(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!VALID_STAGE_KEYS.has(stage as StageKey)) {
    return <ErrorState message="Unknown pipeline stage." sessionId={id} />;
  }
  const stageKey = stage as StageKey;
  const meta = stageMeta(stageKey);

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (notFound || !session) {
    return <ErrorState message="Session not found." sessionId={id} />;
  }

  const status = session.stageStatus[stageKey];
  if (status === "locked") {
    return <ErrorState message="This stage isn't unlocked yet." sessionId={id} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Autospy
      </Link>
      <div className="flex items-start justify-between gap-4">
        <Stepper sessionId={id} currentStage={stageKey} stageStatus={session.stageStatus} />
        <Link
          href={`/pipeline/${id}/loop`}
          className="shrink-0 whitespace-nowrap text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
        >
          Opportunity Loop →
        </Link>
      </div>

      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
          Stage {meta.order} of {STAGES.length}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {meta.label}
        </h1>
      </header>

      {stageKey === "experience" && <ExperienceForm sessionId={id} />}
      {stageKey === "profile" && (
        <ProfileStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "autopsy" && (
        <AutopsyStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "capabilities" && (
        <CapabilitiesStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "market" && (
        <MarketStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "opportunities" && (
        <OpportunitiesStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "direction" && (
        <DirectionStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "action_plan" && (
        <ActionPlanStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "offer" && (
        <OfferStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "review" && (
        <ReviewStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "one_pager" && (
        <OnePagerStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "prospects" && (
        <ProspectsStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "outreach" && (
        <OutreachStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "response" && (
        <ResponseStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {stageKey === "optimization" && (
        <OptimizationStage sessionId={id} session={session} onUpdate={setSession} />
      )}
      {!IMPLEMENTED_STAGES.includes(stageKey) && <StageStub stage={meta} />}
    </main>
  );
}

function ErrorState({ message, sessionId }: { message: string; sessionId: string }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-6 py-12">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      <Link
        href={`/pipeline/${sessionId}`}
        className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
      >
        Back to your pipeline
      </Link>
    </main>
  );
}

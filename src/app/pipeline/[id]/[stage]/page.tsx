"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { STAGES, stageMeta, type StageKey } from "@/lib/pipeline";
import type { OpportunitySession } from "@/lib/types";
import { Stepper } from "@/components/Stepper";
import { ExperienceForm } from "@/components/ExperienceForm";
import { ProfileStage } from "@/components/ProfileStage";
import { AutopsyStage } from "@/components/AutopsyStage";
import { StageStub } from "@/components/StageStub";

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
      <Stepper sessionId={id} currentStage={stageKey} stageStatus={session.stageStatus} />

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
      {!["experience", "profile", "autopsy"].includes(stageKey) && <StageStub stage={meta} />}
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

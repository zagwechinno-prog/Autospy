"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { OpportunitySession } from "@/lib/types";
import { LoopView } from "@/components/LoopView";

export default function LoopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (notFound || !session) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-6 py-12">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Session not found.</p>
        <Link href="/" className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Autospy
      </Link>
      <div className="flex items-center justify-between">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            Continuous Opportunity Loop
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Opportunity Loop
          </h1>
        </header>
        <Link
          href={`/pipeline/${id}`}
          className="text-sm font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Back to pipeline
        </Link>
      </div>

      <LoopView sessionId={id} session={session} onUpdate={setSession} />
    </main>
  );
}

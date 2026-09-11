"use client";

import Link from "next/link";
import { STAGES, type StageKey } from "@/lib/pipeline";
import type { StageStatus } from "@/lib/types";

const DOT_STYLE: Record<StageStatus, string> = {
  locked: "bg-zinc-200 dark:bg-zinc-800",
  not_started: "bg-zinc-300 dark:bg-zinc-700 ring-2 ring-zinc-400 dark:ring-zinc-600",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
};

export function Stepper({
  sessionId,
  currentStage,
  stageStatus,
}: {
  sessionId: string;
  currentStage: StageKey;
  stageStatus: Record<StageKey, StageStatus>;
}) {
  return (
    <nav aria-label="Opportunity pipeline" className="w-full">
      <ol className="flex flex-wrap gap-x-1 gap-y-2 text-xs">
        {STAGES.map((stage) => {
          const status = stageStatus[stage.key];
          const isCurrent = stage.key === currentStage;
          const clickable = status !== "locked";
          const content = (
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                isCurrent
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : clickable
                  ? "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  : "text-zinc-400 dark:text-zinc-700"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLE[status]}`} />
              {stage.order}. {stage.shortLabel}
            </span>
          );
          return (
            <li key={stage.key}>
              {clickable ? (
                <Link href={`/pipeline/${sessionId}/${stage.key}`}>{content}</Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import type { StageMeta } from "@/lib/pipeline";

export function StageStub({ stage }: { stage: StageMeta }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          Coming next
        </span>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{stage.description}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        <span className="font-medium">Produces:</span> {stage.produces}
      </p>
      <p className="text-xs text-zinc-400 dark:text-zinc-600">
        This stage isn&apos;t wired up to the AI engine yet. Experience → Profile → Autopsy are
        live; the rest of the pipeline builds on that same pattern next.
      </p>
    </div>
  );
}

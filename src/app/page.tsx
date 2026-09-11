import { STAGES } from "@/lib/pipeline";
import { StartButton } from "@/components/StartButton";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-16">
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
          Autospy — Opportunity System
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
          Turn experience into a tested market opportunity.
        </h1>
        <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          This system does the analysis, synthesis, and drafting between your experience and a
          credible, specific offer. You make the consequential decisions — approve, edit, or
          reject — at every stage. Nothing is invented: every recommendation traces to your own
          evidence or is explicitly marked as an inference, market read, or hypothesis to be
          validated.
        </p>
        <StartButton />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
          The pipeline
        </h2>
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STAGES.map((stage) => (
            <li
              key={stage.key}
              className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium ${
                  stage.implemented
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600"
                }`}
              >
                {stage.order}
              </span>
              <div>
                <p className="font-medium text-zinc-800 dark:text-zinc-200">{stage.label}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">{stage.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}

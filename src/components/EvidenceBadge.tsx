import type { EvidenceTag } from "@/lib/types";

const STYLES: Record<EvidenceTag, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/30",
  INFERRED: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-400/30",
  "MARKET-SUPPORTED": "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-400/30",
  HYPOTHESIS: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-400/30",
};

export function EvidenceBadge({ tag }: { tag: EvidenceTag }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide ring-1 ring-inset ${STYLES[tag]}`}
    >
      {tag}
    </span>
  );
}

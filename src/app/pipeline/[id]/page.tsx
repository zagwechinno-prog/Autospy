import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/store";
import { STAGES } from "@/lib/pipeline";

export default async function PipelineRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const next = STAGES.find((s) => session.stageStatus[s.key] !== "completed") ?? STAGES[STAGES.length - 1];
  redirect(`/pipeline/${id}/${next.key}`);
}

import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { researchProspects } from "@/lib/prompts/prospects";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.onePager?.approved || !session.offer) {
    return NextResponse.json({ error: "Approve the One-Pager stage first." }, { status: 400 });
  }

  const effectiveOffer = { ...session.offer.document, ...session.offer.userEdits };

  try {
    session.prospects = await researchProspects(effectiveOffer);
    session.stageStatus.prospects = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to research prospects.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

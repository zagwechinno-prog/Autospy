import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { critiqueOffer } from "@/lib/prompts/review";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.offer?.approved) {
    return NextResponse.json({ error: "Approve the Offer stage first." }, { status: 400 });
  }

  const effectiveDocument = { ...session.offer.document, ...session.offer.userEdits };

  try {
    session.review = await critiqueOffer(effectiveDocument);
    session.stageStatus.review = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to critique the offer.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

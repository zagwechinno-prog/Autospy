import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { generateOnePager } from "@/lib/prompts/one-pager";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.review?.approved || !session.offer || !session.profile || !session.market) {
    return NextResponse.json({ error: "Approve the Review stage first." }, { status: 400 });
  }

  const effectiveOffer = { ...session.offer.document, ...session.offer.userEdits };

  try {
    const document = await generateOnePager(effectiveOffer, session.profile, session.market, session.review);
    session.onePager = { document, userEdits: {}, generatedAt: new Date().toISOString(), approved: false };
    session.stageStatus.one_pager = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate the one-pager.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

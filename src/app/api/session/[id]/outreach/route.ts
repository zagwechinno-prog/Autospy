import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { generateOutreach } from "@/lib/prompts/outreach";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.prospects?.approved || !session.offer || !session.onePager || !session.profile) {
    return NextResponse.json({ error: "Approve the Prospects stage first." }, { status: 400 });
  }

  const effectiveOffer = { ...session.offer.document, ...session.offer.userEdits };
  const effectiveOnePager = { ...session.onePager.document, ...session.onePager.userEdits };
  const activeProspects = session.prospects.prospects.filter((p) => p.reviewStatus !== "rejected");

  try {
    session.outreach = await generateOutreach(effectiveOffer, effectiveOnePager, activeProspects, session.profile);
    session.stageStatus.outreach = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate outreach.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

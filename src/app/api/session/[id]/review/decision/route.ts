import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";

const bodySchema = z.object({
  decision: z.enum(["kept_original", "adopted_revision"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.review || !session.offer) {
    return NextResponse.json({ error: "No review to decide on yet." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.decision === "adopted_revision") {
    session.offer.document = session.review.revisedOffer;
    session.offer.userEdits = {};
  }

  session.review.decision = parsed.data.decision;
  session.review.approved = true;
  session.stageStatus.review = "completed";
  unlockStage(session, "one_pager");

  await saveSession(session);
  return NextResponse.json(session);
}

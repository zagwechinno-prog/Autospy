import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";

const bodySchema = z.object({
  reads: z.array(
    z.object({
      id: z.string(),
      reviewStatus: z.enum(["approved", "rejected"]),
    })
  ),
  approve: z.boolean(),
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
  if (!session.market) {
    return NextResponse.json({ error: "No market research to review yet." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const decisions = new Map(body.reads.map((r) => [r.id, r]));
  for (const read of session.market.reads) {
    const decision = decisions.get(read.id);
    if (decision) {
      read.reviewStatus = decision.reviewStatus;
    }
  }

  if (body.approve) {
    const stillPending = session.market.reads.some((r) => r.reviewStatus === "pending");
    if (stillPending) {
      return NextResponse.json(
        { error: "Every market read must be approved or rejected before the Market stage can be approved." },
        { status: 400 }
      );
    }
    session.market.approved = true;
    session.stageStatus.market = "completed";
    unlockStage(session, "opportunities");
  }

  await saveSession(session);
  return NextResponse.json(session);
}

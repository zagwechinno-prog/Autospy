import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";

const bodySchema = z.object({
  opportunities: z.array(
    z.object({
      id: z.string(),
      reviewStatus: z.enum(["approved", "edited", "rejected"]),
      userEdit: z.string().max(1000).optional(),
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
  if (!session.opportunities) {
    return NextResponse.json({ error: "No opportunities to review yet." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const decisions = new Map(body.opportunities.map((o) => [o.id, o]));
  for (const opp of session.opportunities.opportunities) {
    const decision = decisions.get(opp.id);
    if (decision) {
      opp.reviewStatus = decision.reviewStatus;
      if (decision.reviewStatus === "edited") {
        opp.userEdit = decision.userEdit?.trim() || opp.title;
      }
    }
  }

  if (body.approve) {
    const stillPending = session.opportunities.opportunities.some((o) => o.reviewStatus === "pending");
    if (stillPending) {
      return NextResponse.json(
        { error: "Every opportunity must be approved, edited, or rejected before continuing." },
        { status: 400 }
      );
    }
    const activeCount = session.opportunities.opportunities.filter((o) => o.reviewStatus !== "rejected").length;
    if (activeCount === 0) {
      return NextResponse.json(
        { error: "At least one opportunity must stay approved or edited to continue to Direction." },
        { status: 400 }
      );
    }
    session.opportunities.approved = true;
    session.stageStatus.opportunities = "completed";
    unlockStage(session, "direction");
  }

  await saveSession(session);
  return NextResponse.json(session);
}

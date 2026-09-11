import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";

const bodySchema = z.object({
  prospects: z.array(
    z.object({
      id: z.string(),
      reviewStatus: z.enum(["approved", "edited", "rejected"]),
      userEdit: z.string().max(500).optional(),
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
  if (!session.prospects) {
    return NextResponse.json({ error: "No prospects to review yet." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const decisions = new Map(body.prospects.map((p) => [p.id, p]));
  for (const prospect of session.prospects.prospects) {
    const decision = decisions.get(prospect.id);
    if (decision) {
      prospect.reviewStatus = decision.reviewStatus;
      if (decision.reviewStatus === "edited") {
        prospect.userEdit = decision.userEdit?.trim() || prospect.company;
      }
    }
  }

  if (body.approve) {
    const stillPending = session.prospects.prospects.some((p) => p.reviewStatus === "pending");
    if (stillPending) {
      return NextResponse.json(
        { error: "Every prospect must be approved, edited, or rejected before continuing." },
        { status: 400 }
      );
    }
    const activeCount = session.prospects.prospects.filter((p) => p.reviewStatus !== "rejected").length;
    if (activeCount === 0) {
      return NextResponse.json(
        { error: "At least one prospect must stay approved or edited to continue to Outreach." },
        { status: 400 }
      );
    }
    session.prospects.approved = true;
    session.stageStatus.prospects = "completed";
    unlockStage(session, "outreach");
  }

  await saveSession(session);
  return NextResponse.json(session);
}

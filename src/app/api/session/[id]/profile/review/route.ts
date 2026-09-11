import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";

const bodySchema = z.object({
  capabilities: z.array(
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
  if (!session.profile) {
    return NextResponse.json({ error: "No profile to review yet." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const decisions = new Map(body.capabilities.map((c) => [c.id, c]));
  for (const cap of session.profile.capabilities) {
    const decision = decisions.get(cap.id);
    if (decision) {
      cap.reviewStatus = decision.reviewStatus;
      if (decision.reviewStatus === "edited") {
        cap.userEdit = decision.userEdit?.trim() || cap.statement;
      }
    }
  }

  if (body.approve) {
    const stillPending = session.profile.capabilities.some((c) => c.reviewStatus === "pending");
    if (stillPending) {
      return NextResponse.json(
        { error: "Every capability must be approved, edited, or rejected before the Profile can be approved." },
        { status: 400 }
      );
    }
    session.profile.approved = true;
    session.stageStatus.profile = "completed";
    unlockStage(session, "autopsy");
  }

  await saveSession(session);
  return NextResponse.json(session);
}

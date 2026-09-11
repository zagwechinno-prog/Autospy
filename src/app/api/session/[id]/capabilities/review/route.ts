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
  if (!session.capabilities) {
    return NextResponse.json({ error: "No capabilities to review yet." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const decisions = new Map(body.capabilities.map((c) => [c.id, c]));
  for (const cap of session.capabilities.capabilities) {
    const decision = decisions.get(cap.id);
    if (decision) {
      cap.reviewStatus = decision.reviewStatus;
      if (decision.reviewStatus === "edited") {
        cap.userEdit = decision.userEdit?.trim() || cap.capability;
      }
    }
  }

  if (body.approve) {
    const stillPending = session.capabilities.capabilities.some((c) => c.reviewStatus === "pending");
    if (stillPending) {
      return NextResponse.json(
        { error: "Every candidate capability must be approved, edited, or rejected before continuing." },
        { status: 400 }
      );
    }
    const activeCount = session.capabilities.capabilities.filter((c) => c.reviewStatus !== "rejected").length;
    if (activeCount === 0) {
      return NextResponse.json(
        { error: "At least one capability must stay approved or edited to continue to Market." },
        { status: 400 }
      );
    }
    session.capabilities.approved = true;
    session.stageStatus.capabilities = "completed";
    unlockStage(session, "market");
  }

  await saveSession(session);
  return NextResponse.json(session);
}

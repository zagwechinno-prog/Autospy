import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";

const bodySchema = z.object({
  findings: z.array(
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
  if (!session.autopsy) {
    return NextResponse.json({ error: "No autopsy to review yet." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const decisions = new Map(body.findings.map((f) => [f.id, f]));
  for (const finding of session.autopsy.findings) {
    const decision = decisions.get(finding.id);
    if (decision) {
      finding.reviewStatus = decision.reviewStatus;
      if (decision.reviewStatus === "edited") {
        finding.userEdit = decision.userEdit?.trim() || finding.realCapability;
      }
    }
  }

  if (body.approve) {
    const stillPending = session.autopsy.findings.some((f) => f.reviewStatus === "pending");
    if (stillPending) {
      return NextResponse.json(
        { error: "Every finding must be approved, edited, or rejected before the Autopsy can be approved." },
        { status: 400 }
      );
    }
    session.autopsy.approved = true;
    session.stageStatus.autopsy = "completed";
    unlockStage(session, "capabilities");
  }

  await saveSession(session);
  return NextResponse.json(session);
}

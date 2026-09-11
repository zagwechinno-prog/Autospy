import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";

const documentFieldSchema = z.string().max(3000);

const bodySchema = z.object({
  userEdits: z
    .object({
      offerName: documentFieldSchema.optional(),
      whoThisIsFor: documentFieldSchema.optional(),
      theProblem: documentFieldSchema.optional(),
      theOutcome: documentFieldSchema.optional(),
      whatWeDo: documentFieldSchema.optional(),
      whatYouGet: documentFieldSchema.optional(),
      howItWorks: documentFieldSchema.optional(),
      timeline: documentFieldSchema.optional(),
      whyTrustUs: documentFieldSchema.optional(),
      pricingModel: documentFieldSchema.optional(),
      callToAction: documentFieldSchema.optional(),
    })
    .default({}),
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
  if (!session.onePager) {
    return NextResponse.json({ error: "No one-pager to review yet." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  session.onePager.userEdits = { ...session.onePager.userEdits, ...body.userEdits };

  if (body.approve) {
    session.onePager.approved = true;
    session.stageStatus.one_pager = "completed";
    unlockStage(session, "prospects");
  }

  await saveSession(session);
  return NextResponse.json(session);
}

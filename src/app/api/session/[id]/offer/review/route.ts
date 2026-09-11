import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";

const documentFieldSchema = z.string().max(3000);

const bodySchema = z.object({
  userEdits: z
    .object({
      offerName: documentFieldSchema.optional(),
      oneLinePromise: documentFieldSchema.optional(),
      whoItIsFor: documentFieldSchema.optional(),
      problem: documentFieldSchema.optional(),
      outcome: documentFieldSchema.optional(),
      whatYouDo: documentFieldSchema.optional(),
      whatTheyReceive: documentFieldSchema.optional(),
      timeline: documentFieldSchema.optional(),
      price: documentFieldSchema.optional(),
      whyYou: documentFieldSchema.optional(),
      whatMakesThisDifferent: documentFieldSchema.optional(),
      whatIsNotIncluded: documentFieldSchema.optional(),
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
  if (!session.offer) {
    return NextResponse.json({ error: "No offer to review yet." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  session.offer.userEdits = { ...session.offer.userEdits, ...body.userEdits };

  if (body.approve) {
    session.offer.approved = true;
    session.stageStatus.offer = "completed";
    unlockStage(session, "review");
  }

  await saveSession(session);
  return NextResponse.json(session);
}

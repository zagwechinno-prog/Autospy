import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession } from "@/lib/store";
import { optimizeOffer } from "@/lib/prompts/optimization";

const bodySchema = z.object({ userObservations: z.string().max(4000).default("") });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.response?.approved || !session.prospects || !session.offer) {
    return NextResponse.json({ error: "Approve the Response stage first." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const effectiveOffer = { ...session.offer.document, ...session.offer.userEdits };

  try {
    session.optimization = await optimizeOffer(effectiveOffer, session.prospects, session.response, parsed.data.userObservations);
    session.stageStatus.optimization = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to optimize the offer.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { researchMarket } from "@/lib/prompts/market";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.capabilities?.approved) {
    return NextResponse.json(
      { error: "Approve the Capabilities stage first." },
      { status: 400 }
    );
  }

  try {
    session.market = await researchMarket(session.capabilities.capabilities);
    session.stageStatus.market = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to research the market.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

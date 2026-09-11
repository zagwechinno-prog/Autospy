import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { synthesizeLoop } from "@/lib/prompts/loop";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.experience) {
    return NextResponse.json({ error: "Complete the Experience stage first." }, { status: 400 });
  }

  try {
    session.loop = await synthesizeLoop(session);
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to synthesize the opportunity loop.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

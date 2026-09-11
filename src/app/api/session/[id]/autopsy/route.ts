import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { synthesizeAutopsy } from "@/lib/prompts/autopsy";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.experience || !session.profile?.approved) {
    return NextResponse.json(
      { error: "Approve the Profile stage first." },
      { status: 400 }
    );
  }

  try {
    session.autopsy = await synthesizeAutopsy(session.experience);
    session.stageStatus.autopsy = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate autopsy.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

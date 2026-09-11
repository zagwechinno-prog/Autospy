import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { synthesizeCapabilities } from "@/lib/prompts/capabilities";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.experience || !session.profile?.approved || !session.autopsy?.approved) {
    return NextResponse.json(
      { error: "Approve the Profile and Autopsy stages first." },
      { status: 400 }
    );
  }

  try {
    session.capabilities = await synthesizeCapabilities(session.experience, session.profile, session.autopsy);
    session.stageStatus.capabilities = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate capabilities.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

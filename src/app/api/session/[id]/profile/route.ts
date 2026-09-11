import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { synthesizeProfile } from "@/lib/prompts/profile";

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
    return NextResponse.json(
      { error: "Complete the Experience stage first." },
      { status: 400 }
    );
  }

  try {
    session.profile = await synthesizeProfile(session.experience);
    session.stageStatus.profile = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate profile.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

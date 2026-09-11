import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { STAGES } from "./pipeline";
import type { OpportunitySession, StageStatus } from "./types";
import type { StageKey } from "./pipeline";

const DATA_DIR = path.join(process.cwd(), ".data", "sessions");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

function sessionPath(id: string) {
  // id comes from randomUUID() or is validated against that shape before use.
  return path.join(DATA_DIR, `${id}.json`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSessionId(id: string): boolean {
  return UUID_RE.test(id);
}

function initialStageStatus(): Record<StageKey, StageStatus> {
  const status = {} as Record<StageKey, StageStatus>;
  for (const stage of STAGES) {
    status[stage.key] = stage.order === 1 ? "not_started" : "locked";
  }
  return status;
}

export async function createSession(): Promise<OpportunitySession> {
  await ensureDataDir();
  const now = new Date().toISOString();
  const session: OpportunitySession = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    stageStatus: initialStageStatus(),
  };
  await writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), "utf-8");
  return session;
}

export async function getSession(id: string): Promise<OpportunitySession | null> {
  if (!isValidSessionId(id)) return null;
  try {
    const raw = await readFile(sessionPath(id), "utf-8");
    return JSON.parse(raw) as OpportunitySession;
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function saveSession(session: OpportunitySession): Promise<void> {
  await ensureDataDir();
  session.updatedAt = new Date().toISOString();
  await writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), "utf-8");
}

/** Unlocks the given stage (moving it out of "locked") without overwriting further progress. */
export function unlockStage(session: OpportunitySession, stage: StageKey) {
  if (session.stageStatus[stage] === "locked") {
    session.stageStatus[stage] = "not_started";
  }
}

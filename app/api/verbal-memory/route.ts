import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  answerSession,
  createSession,
  serializeSession,
  type SessionData,
} from "@/lib/verbal-memory";

async function insertSession(session: SessionData) {
  await pool.query(
    `
    insert into game_sessions (id, game_type, state, created_at, updated_at)
    values ($1, $2, $3::jsonb, now(), now())
    `,
    [session.id, "verbal-memory", JSON.stringify(session)]
  );
}

async function getSession(sessionId: string): Promise<SessionData | null> {
  const result = await pool.query(
    `
    select state
    from game_sessions
    where id = $1
      and game_type = 'verbal-memory'
    limit 1
    `,
    [sessionId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0].state as SessionData;
}

async function updateSession(session: SessionData) {
  await pool.query(
    `
    update game_sessions
    set state = $2::jsonb,
        updated_at = now()
    where id = $1
      and game_type = 'verbal-memory'
    `,
    [session.id, JSON.stringify(session)]
  );
}

function makeSessionId(): string {
  return crypto.randomUUID();
}

export async function GET() {
  try {
    const sessionId = makeSessionId();
    const session = createSession(sessionId);

    await insertSession(session);

    return NextResponse.json({
      ok: true,
      ...serializeSession(session),
    });
  } catch (error) {
    console.error("GET /api/verbal-memory failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create session." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      answer?: "new" | "seen";
      action?: "reset";
    };

    if (body.action === "reset") {
      const sessionId = makeSessionId();
      const session = createSession(sessionId);

      await insertSession(session);

      return NextResponse.json({
        ok: true,
        ...serializeSession(session),
      });
    }

    if (!body.sessionId || !body.answer) {
      return NextResponse.json(
        { ok: false, error: "sessionId and answer are required." },
        { status: 400 }
      );
    }

    const session = await getSession(body.sessionId);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found or expired." },
        { status: 404 }
      );
    }

    const updated = answerSession(session, body.answer);
    await updateSession(updated);

    return NextResponse.json({
      ok: true,
      ...serializeSession(updated),
    });
  } catch (error) {
    console.error("POST /api/verbal-memory failed:", error);

    return NextResponse.json(
      { ok: false, error: "Invalid request or server error." },
      { status: 400 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import {
  PATTERN_MEMORY_GAME_TYPE,
  answerPatternMemorySession,
  createPatternMemorySession,
  serializePatternMemorySession,
  type PatternMemorySessionData,
} from "@/lib/tests/pattern-memory";
import {
  getGameSession,
  insertGameSession,
  updateGameSession,
} from "@/lib/session-store";
import {
  getNextHumanParticipantId,
  isValidParticipantId,
  makeSessionId,
} from "@/lib/participants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://intellitest.space";

type ResetBody = {
  action?: "reset";
  sessionId?: string;
  participantId?: string;
};

type AnswerBody = {
  sessionId?: string;
  answer?: string;
};

export async function GET(req: NextRequest) {
  try {
    const sessionId = makeSessionId();
    const origin = PUBLIC_APP_ORIGIN;

    const requestedParticipantId = req.nextUrl.searchParams.get("participantId");
    let participantId: string;

    if (requestedParticipantId) {
      if (!isValidParticipantId(requestedParticipantId)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Invalid participantId. Use lowercase letters, numbers, dots, and hyphens only.",
          },
          { status: 400 }
        );
      }

      participantId = requestedParticipantId;
    } else {
      participantId = await getNextHumanParticipantId(PATTERN_MEMORY_GAME_TYPE);
    }

    const session = createPatternMemorySession(sessionId, participantId);
    await insertGameSession(PATTERN_MEMORY_GAME_TYPE, session);

    return NextResponse.json({
      ok: true,
      ...serializePatternMemorySession(session, origin),
    });
  } catch (error) {
    console.error("GET /api/pattern-memory failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create session." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ResetBody & AnswerBody;
    const origin = PUBLIC_APP_ORIGIN;

    if (body.action === "reset") {
      let participantId: string | null = null;

      if (body.sessionId) {
        const existingSession = await getGameSession<PatternMemorySessionData>(
          PATTERN_MEMORY_GAME_TYPE,
          body.sessionId
        );
        participantId = existingSession?.participantId ?? null;
      }

      if (!participantId && body.participantId) {
        if (!isValidParticipantId(body.participantId)) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Invalid participantId. Use lowercase letters, numbers, dots, and hyphens only.",
            },
            { status: 400 }
          );
        }

        participantId = body.participantId;
      }

      if (!participantId) {
        participantId = await getNextHumanParticipantId(PATTERN_MEMORY_GAME_TYPE);
      }

      const sessionId = makeSessionId();
      const session = createPatternMemorySession(sessionId, participantId);
      await insertGameSession(PATTERN_MEMORY_GAME_TYPE, session);

      return NextResponse.json({
        ok: true,
        ...serializePatternMemorySession(session, origin),
      });
    }

    if (!body.sessionId || typeof body.answer !== "string") {
      return NextResponse.json(
        { ok: false, error: "sessionId and answer are required." },
        { status: 400 }
      );
    }

    const session = await getGameSession<PatternMemorySessionData>(
      PATTERN_MEMORY_GAME_TYPE,
      body.sessionId
    );

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found or expired." },
        { status: 404 }
      );
    }

    const updated = answerPatternMemorySession(session, body.answer);
    await updateGameSession(PATTERN_MEMORY_GAME_TYPE, updated);

    return NextResponse.json({
      ok: true,
      ...serializePatternMemorySession(updated, origin),
    });
  } catch (error) {
    console.error("POST /api/pattern-memory failed:", error);

    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  COLOR_MEMORY_GAME_TYPE,
  answerColorMemorySession,
  createColorMemorySession,
  serializeColorMemorySession,
  type ColorMemorySessionData,
} from "@/lib/tests/color-memory";
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

type ResetBody = {
  action?: "reset";
  sessionId?: string;
  participantId?: string;
};

type AnswerBody = {
  sessionId?: string;
  answer?: string[];
};

export async function GET(req: NextRequest) {
  try {
    const sessionId = makeSessionId();

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
      participantId = await getNextHumanParticipantId(COLOR_MEMORY_GAME_TYPE);
    }

    const session = createColorMemorySession(sessionId, participantId);
    await insertGameSession(COLOR_MEMORY_GAME_TYPE, session);

    return NextResponse.json({
      ok: true,
      ...serializeColorMemorySession(session),
    });
  } catch (error) {
    console.error("GET /api/color-memory failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create session." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ResetBody & AnswerBody;

    if (body.action === "reset") {
      let participantId: string | null = null;

      if (body.sessionId) {
        const existingSession = await getGameSession<ColorMemorySessionData>(
          COLOR_MEMORY_GAME_TYPE,
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
        participantId = await getNextHumanParticipantId(COLOR_MEMORY_GAME_TYPE);
      }

      const sessionId = makeSessionId();
      const session = createColorMemorySession(sessionId, participantId);
      await insertGameSession(COLOR_MEMORY_GAME_TYPE, session);

      return NextResponse.json({
        ok: true,
        ...serializeColorMemorySession(session),
      });
    }

    if (
      !body.sessionId ||
      !Array.isArray(body.answer) ||
      !body.answer.every((value) => typeof value === "string")
    ) {
      return NextResponse.json(
        { ok: false, error: "sessionId and answer are required." },
        { status: 400 }
      );
    }

    const session = await getGameSession<ColorMemorySessionData>(
      COLOR_MEMORY_GAME_TYPE,
      body.sessionId
    );

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found or expired." },
        { status: 404 }
      );
    }

    const updated = answerColorMemorySession(session, body.answer);
    await updateGameSession(COLOR_MEMORY_GAME_TYPE, updated);

    return NextResponse.json({
      ok: true,
      ...serializeColorMemorySession(updated),
    });
  } catch (error) {
    console.error("POST /api/color-memory failed:", error);

    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }
}

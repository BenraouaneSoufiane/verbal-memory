import { NextRequest, NextResponse } from "next/server";
import {
  NUMBER_MEMORY_GAME_TYPE,
  answerNumberMemorySession,
  createNumberMemorySession,
  serializeNumberMemorySession,
  type NumberMemorySessionData,
} from "@/lib/tests/number-memory";
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
  answer?: string;
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
      participantId = await getNextHumanParticipantId(NUMBER_MEMORY_GAME_TYPE);
    }

    const session = createNumberMemorySession(sessionId, participantId);
    await insertGameSession(NUMBER_MEMORY_GAME_TYPE, session);

    return NextResponse.json({
      ok: true,
      ...serializeNumberMemorySession(session),
    });
  } catch (error) {
    console.error("GET /api/number-memory failed:", error);

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
        const existingSession = await getGameSession<NumberMemorySessionData>(
          NUMBER_MEMORY_GAME_TYPE,
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
        participantId = await getNextHumanParticipantId(NUMBER_MEMORY_GAME_TYPE);
      }

      const sessionId = makeSessionId();
      const session = createNumberMemorySession(sessionId, participantId);
      await insertGameSession(NUMBER_MEMORY_GAME_TYPE, session);

      return NextResponse.json({
        ok: true,
        ...serializeNumberMemorySession(session),
      });
    }

    if (!body.sessionId || typeof body.answer !== "string") {
      return NextResponse.json(
        { ok: false, error: "sessionId and answer are required." },
        { status: 400 }
      );
    }

    const session = await getGameSession<NumberMemorySessionData>(
      NUMBER_MEMORY_GAME_TYPE,
      body.sessionId
    );

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found or expired." },
        { status: 404 }
      );
    }

    const updated = answerNumberMemorySession(session, body.answer);
    await updateGameSession(NUMBER_MEMORY_GAME_TYPE, updated);

    return NextResponse.json({
      ok: true,
      ...serializeNumberMemorySession(updated),
    });
  } catch (error) {
    console.error("POST /api/number-memory failed:", error);

    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }
}

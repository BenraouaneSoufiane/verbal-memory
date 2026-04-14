import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

type AdminRow = {
  id: string;
  participant_id: string | null;
  created_at: string;
  updated_at: string;
  score: number | null;
  lives: number | null;
  turn: number | null;
  gameState: "playing" | "gameover";
  historyCount: number;
  accuracy: number | null;
};

function isHumanParticipant(participantId: string | null): boolean {
  if (!participantId) return false;
  return participantId.toLowerCase().startsWith("human");
}

function getParticipantKind(
  participantId: string | null | undefined
): "human" | "ai" {
  return isHumanParticipant(participantId ?? null) ? "human" : "ai";
}

function hasVisibleScore(score: unknown): boolean {
  if (score === null || score === undefined) return false;
  if (score === "") return false;
  if (score === "null") return false;

  const n = Number(score);
  return Number.isFinite(n) && n > 0;
}

function toCsvValue(value: unknown): string {
  const stringValue =
    value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    /*const adminToken = req.headers.get("x-admin-token");
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }*/

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    const gameState = searchParams.get("gameState"); // all | playing | gameover
    const kind = searchParams.get("kind"); // all | human | ai
    const hideNull = searchParams.get("hideNull") === "true";

    const result = await pool.query<AdminRow>(
      `
      select
        id,
        state->>'participantId' as participant_id,
        created_at,
        updated_at,

        case
          when state->>'score' is null or state->>'score' = '' then null
          else (state->>'score')::int
        end as score,

        case
          when state->>'lives' is null or state->>'lives' = '' then null
          else (state->>'lives')::int
        end as lives,

        case
          when state->>'turn' is null or state->>'turn' = '' then null
          else (state->>'turn')::int
        end as turn,

        (state->>'gameState')::text as "gameState",
        coalesce(jsonb_array_length(state->'history'), 0) as "historyCount",

        case
          when
            (
              coalesce(nullif(state->>'score', '')::int, 0) +
              (3 - coalesce(nullif(state->>'lives', '')::int, 3))
            ) <= 0
          then 0
          else round(
            (
              coalesce(nullif(state->>'score', '')::numeric, 0) /
              (
                coalesce(nullif(state->>'score', '')::int, 0) +
                (3 - coalesce(nullif(state->>'lives', '')::int, 3))
              )::numeric
            ) * 100
          )
        end as accuracy

      from game_sessions
      where game_type = 'verbal-memory'
      order by updated_at desc
      `
    );

    const participants = result.rows;

    const filtered = participants.filter((p) => {
      const matchesGameState =
        !gameState || gameState === "all" ? true : p.gameState === gameState;

      const matchesKind =
        !kind || kind === "all"
          ? true
          : getParticipantKind(p.participant_id) === kind;

      const matchesScore = hideNull ? hasVisibleScore(p.score) : true;

      return matchesGameState && matchesKind && matchesScore;
    });

    if (format === "csv") {
      const headers = [
        "session_id",
        "participant_id",
        "kind",
        "game_state",
        "score",
        "accuracy",
        "turn",
        "lives",
        "words",
        "created_at",
        "updated_at",
      ];

      const csv = [
        headers.join(","),
        ...filtered.map((p) =>
          [
            p.id,
            p.participant_id ?? "",
            getParticipantKind(p.participant_id),
            p.gameState,
            p.score ?? "",
            p.accuracy ?? "",
            p.turn ?? "",
            p.lives ?? "",
            p.historyCount,
            p.created_at,
            p.updated_at,
          ]
            .map(toCsvValue)
            .join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="verbal-memory.csv"',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      participants: filtered,
    });
  } catch (error) {
    console.error("GET /api/admin/verbal-memory failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to fetch participants." },
      { status: 500 }
    );
  }
}
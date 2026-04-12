import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

type AdminRow = {
  id: string;
  created_at: string;
  updated_at: string;
  score: number;
  lives: number;
  turn: number;
  gameState: "playing" | "gameover";
  historyCount: number;
};

export async function GET(req: NextRequest) {
  try {
    const adminToken = req.headers.get("x-admin-token");
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `
      select
        id,
        state->>'participantId' as participant_id,
        created_at,
        updated_at,
        (state->>'score')::int as score,
        (state->>'lives')::int as lives,
        (state->>'turn')::int as turn,
        (state->>'gameState')::text as "gameState",
        coalesce(jsonb_array_length(state->'history'), 0) as "historyCount",
      
        case
          when ((state->>'score')::int + (3 - (state->>'lives')::int)) <= 0 then 0
          else round(
            (
              ((state->>'score')::numeric) /
              (((state->>'score')::int + (3 - (state->>'lives')::int))::numeric)
            ) * 100
          )
        end as accuracy
      
      from game_sessions
      order by updated_at desc
      `
    );

    return NextResponse.json({
      ok: true,
      participants: result.rows,
    });
  } catch (error) {
    console.error("GET /api/admin/verbal-memory failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to fetch participants." },
      { status: 500 }
    );
  }
}
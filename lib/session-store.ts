import { pool } from "@/lib/db";
import type { GameType } from "@/lib/tests/types";

export async function insertGameSession<TSession extends { id: string }>(
  gameType: GameType,
  session: TSession
) {
  await pool.query(
    `
    insert into game_sessions (id, game_type, state, created_at, updated_at)
    values ($1, $2, $3::jsonb, now(), now())
    `,
    [session.id, gameType, JSON.stringify(session)]
  );
}

export async function getGameSession<TSession>(
  gameType: GameType,
  sessionId: string
): Promise<TSession | null> {
  const result = await pool.query(
    `
    select state
    from game_sessions
    where id = $1
      and game_type = $2
    limit 1
    `,
    [sessionId, gameType]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0].state as TSession;
}

export async function updateGameSession<TSession extends { id: string }>(
  gameType: GameType,
  session: TSession
) {
  await pool.query(
    `
    update game_sessions
    set state = $3::jsonb,
        updated_at = now()
    where id = $1
      and game_type = $2
    `,
    [session.id, gameType, JSON.stringify(session)]
  );
}
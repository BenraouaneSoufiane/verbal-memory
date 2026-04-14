import { pool } from "@/lib/db";
import type { GameType } from "@/lib/tests/types";

export function makeSessionId(): string {
  return crypto.randomUUID();
}

export function isValidParticipantId(value: string): boolean {
  return /^[a-z0-9.-]+$/.test(value);
}

export async function getNextHumanParticipantId(
  gameType: GameType
): Promise<string> {
  const result = await pool.query<{ max_number: number | null }>(
    `
    select max(
      cast(substring(state->>'participantId' from 'human-([0-9]+)') as int)
    ) as max_number
    from game_sessions
    where game_type = $1
      and state->>'participantId' ~ '^human-[0-9]+$'
    `,
    [gameType]
  );

  const maxNumber = result.rows[0]?.max_number ?? 0;
  return `human-${maxNumber + 1}`;
}
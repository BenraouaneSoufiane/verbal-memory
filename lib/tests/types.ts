export type GameType =
  | "verbal-memory"
  | "number-memory"
  | "color-memory"
  | "pattern-memory";

export type BaseGameState = "playing" | "gameover";

export type BaseSessionData = {
  id: string;
  participantId: string;
  gameState: BaseGameState;
  score: number;
};

export type SerializedSession = {
  sessionId: string;
  participantId: string;
  gameState: BaseGameState;
  score: number;
};

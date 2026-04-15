import type { SerializedSession } from "@/lib/tests/types";

export const NUMBER_MEMORY_GAME_TYPE = "number-memory" as const;
export const NUMBER_MEMORY_START_DIGITS = 3;
export const NUMBER_MEMORY_LIVES = 3;

export type NumberMemoryGameState = "playing" | "gameover";

export type NumberMemoryHistoryItem = {
  turn: number;
  digits: number;
  shownNumber: string;
  submittedAnswer: string;
  correct: boolean;
};

export type NumberMemorySessionData = {
  id: string;
  participantId: string;
  gameState: NumberMemoryGameState;
  score: number;
  lives: number;
  turn: number;
  digits: number;
  currentNumber: string;
  message: string;
  history: NumberMemoryHistoryItem[];
};

export type NumberMemoryAnswerPayload = {
  sessionId: string;
  answer: string;
};

export type SerializedNumberMemorySession = SerializedSession & {
  lives: number;
  turn: number;
  digits: number;
  currentNumber: string;
  message: string;
  accuracy: number;
  history: NumberMemoryHistoryItem[];
};

function generateDigitString(length: number): string {
  let value = String(Math.floor(Math.random() * 9) + 1);

  while (value.length < length) {
    value += String(Math.floor(Math.random() * 10));
  }

  return value;
}

export function createNumberMemorySession(
  sessionId: string,
  participantId: string
): NumberMemorySessionData {
  return {
    id: sessionId,
    participantId,
    gameState: "playing",
    score: 0,
    lives: NUMBER_MEMORY_LIVES,
    turn: 1,
    digits: NUMBER_MEMORY_START_DIGITS,
    currentNumber: generateDigitString(NUMBER_MEMORY_START_DIGITS),
    message: "Memorize the number, then type it back exactly.",
    history: [],
  };
}

export function calculateNumberMemoryAccuracy(
  score: number,
  lives: number
): number {
  const answered = score + (NUMBER_MEMORY_LIVES - lives);
  if (answered <= 0) return 0;
  return Math.round((score / answered) * 100);
}

export function answerNumberMemorySession(
  session: NumberMemorySessionData,
  answer: string
): NumberMemorySessionData {
  if (session.gameState !== "playing" || !session.currentNumber) {
    return session;
  }

  const normalizedAnswer = answer.trim();
  const correct = normalizedAnswer === session.currentNumber;
  const history = [
    ...session.history,
    {
      turn: session.turn,
      digits: session.digits,
      shownNumber: session.currentNumber,
      submittedAnswer: normalizedAnswer,
      correct,
    },
  ];

  if (!correct) {
    const nextLives = session.lives - 1;

    if (nextLives <= 0) {
      return {
        ...session,
        gameState: "gameover",
        lives: 0,
        currentNumber: "",
        message: `Wrong. You entered "${normalizedAnswer || "blank"}" but the number was "${session.currentNumber}".`,
        history,
      };
    }

    return {
      ...session,
      lives: nextLives,
      turn: session.turn + 1,
      currentNumber: generateDigitString(session.digits),
      message: `Wrong. You entered "${normalizedAnswer || "blank"}" but the number was "${session.currentNumber}".`,
      history,
    };
  }

  const nextDigits = session.digits + 1;

  return {
    ...session,
    score: session.score + 1,
    turn: session.turn + 1,
    digits: nextDigits,
    currentNumber: generateDigitString(nextDigits),
    message: `Correct. Get ready for ${nextDigits} digits.`,
    history,
  };
}

export function serializeNumberMemorySession(
  session: NumberMemorySessionData
): SerializedNumberMemorySession {
  return {
    sessionId: session.id,
    participantId: session.participantId,
    gameState: session.gameState,
    score: session.score,
    lives: session.lives,
    turn: session.turn,
    digits: session.digits,
    currentNumber: session.currentNumber,
    message: session.message,
    accuracy: calculateNumberMemoryAccuracy(session.score, session.lives),
    history: session.gameState === "gameover" ? session.history.slice(-20) : [],
  };
}

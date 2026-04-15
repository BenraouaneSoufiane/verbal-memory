import type { SerializedSession } from "@/lib/tests/types";

export const COLOR_MEMORY_GAME_TYPE = "color-memory" as const;
export const COLOR_MEMORY_START_LENGTH = 1;
export const COLOR_MEMORY_LIVES = 3;

export const COLOR_MEMORY_PALETTE = [
  { id: "red", label: "Red", hex: "#ef4444", textColor: "#ffffff" },
  { id: "blue", label: "Blue", hex: "#3b82f6", textColor: "#ffffff" },
  { id: "green", label: "Green", hex: "#22c55e", textColor: "#111111" },
  { id: "yellow", label: "Yellow", hex: "#facc15", textColor: "#111111" },
  { id: "orange", label: "Orange", hex: "#f97316", textColor: "#ffffff" },
  { id: "purple", label: "Purple", hex: "#a855f7", textColor: "#ffffff" },
  { id: "pink", label: "Pink", hex: "#ec4899", textColor: "#ffffff" },
  { id: "brown", label: "Brown", hex: "#92400e", textColor: "#ffffff" },
  { id: "black", label: "Black", hex: "#171717", textColor: "#ffffff" },
  { id: "white", label: "White", hex: "#f5f5f5", textColor: "#111111" },
] as const;

export type ColorMemoryColorId = (typeof COLOR_MEMORY_PALETTE)[number]["id"];
export type ColorMemoryGameState = "playing" | "gameover";

export type ColorMemoryHistoryItem = {
  turn: number;
  sequenceLength: number;
  shownColors: ColorMemoryColorId[];
  submittedColors: ColorMemoryColorId[];
  correct: boolean;
};

export type ColorMemorySessionData = {
  id: string;
  participantId: string;
  gameState: ColorMemoryGameState;
  score: number;
  lives: number;
  turn: number;
  sequenceLength: number;
  currentSequence: ColorMemoryColorId[];
  message: string;
  history: ColorMemoryHistoryItem[];
};

export type ColorMemoryAnswerPayload = {
  sessionId: string;
  answer: ColorMemoryColorId[];
};

export type SerializedColorMemorySession = SerializedSession & {
  lives: number;
  turn: number;
  sequenceLength: number;
  currentSequence: ColorMemoryColorId[];
  message: string;
  accuracy: number;
  history: ColorMemoryHistoryItem[];
};

const COLOR_IDS = COLOR_MEMORY_PALETTE.map((color) => color.id);

function shuffle<T>(values: readonly T[]): T[] {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
  }

  return copy;
}

function generateColorSequence(length: number): ColorMemoryColorId[] {
  return shuffle(COLOR_IDS).slice(0, length) as ColorMemoryColorId[];
}

function normalizeAnswer(answer: string[]): ColorMemoryColorId[] {
  const validIds = new Set<ColorMemoryColorId>(COLOR_IDS);

  return answer
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ColorMemoryColorId =>
      validIds.has(value as ColorMemoryColorId)
    );
}

function areSequencesEqual(
  left: ColorMemoryColorId[],
  right: ColorMemoryColorId[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((colorId, index) => colorId === right[index]);
}

export function calculateColorMemoryAccuracy(
  score: number,
  lives: number
): number {
  const answered = score + (COLOR_MEMORY_LIVES - lives);
  if (answered <= 0) return 0;
  return Math.round((score / answered) * 100);
}

export function createColorMemorySession(
  sessionId: string,
  participantId: string
): ColorMemorySessionData {
  return {
    id: sessionId,
    participantId,
    gameState: "playing",
    score: 0,
    lives: COLOR_MEMORY_LIVES,
    turn: 1,
    sequenceLength: COLOR_MEMORY_START_LENGTH,
    currentSequence: generateColorSequence(COLOR_MEMORY_START_LENGTH),
    message: "Memorize the colors in order, then rebuild the same sequence.",
    history: [],
  };
}

export function answerColorMemorySession(
  session: ColorMemorySessionData,
  answer: string[]
): ColorMemorySessionData {
  if (session.gameState !== "playing" || session.currentSequence.length === 0) {
    return session;
  }

  const normalizedAnswer = normalizeAnswer(answer);
  const correct = areSequencesEqual(normalizedAnswer, session.currentSequence);
  const history = [
    ...session.history,
    {
      turn: session.turn,
      sequenceLength: session.sequenceLength,
      shownColors: session.currentSequence,
      submittedColors: normalizedAnswer,
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
        currentSequence: [],
        message: `Wrong. You entered ${normalizedAnswer.join(", ") || "nothing"}, but the sequence was ${session.currentSequence.join(", ")}.`,
        history,
      };
    }

    return {
      ...session,
      lives: nextLives,
      turn: session.turn + 1,
      currentSequence: generateColorSequence(session.sequenceLength),
      message: `Wrong. You entered ${normalizedAnswer.join(", ") || "nothing"}, but the sequence was ${session.currentSequence.join(", ")}.`,
      history,
    };
  }

  const nextLength = session.sequenceLength + 1;

  if (nextLength > COLOR_IDS.length) {
    return {
      ...session,
      gameState: "gameover",
      score: session.score + 1,
      turn: session.turn + 1,
      currentSequence: [],
      message: "Perfect run. You cleared every available color length without duplicates.",
      history,
    };
  }

  return {
    ...session,
    score: session.score + 1,
    turn: session.turn + 1,
    sequenceLength: nextLength,
    currentSequence: generateColorSequence(nextLength),
    message: `Correct. Get ready for ${nextLength} colors.`,
    history,
  };
}

export function serializeColorMemorySession(
  session: ColorMemorySessionData
): SerializedColorMemorySession {
  return {
    sessionId: session.id,
    participantId: session.participantId,
    gameState: session.gameState,
    score: session.score,
    lives: session.lives,
    turn: session.turn,
    sequenceLength: session.sequenceLength,
    currentSequence: session.currentSequence,
    message: session.message,
    accuracy: calculateColorMemoryAccuracy(session.score, session.lives),
    history: session.gameState === "gameover" ? session.history.slice(-20) : [],
  };
}

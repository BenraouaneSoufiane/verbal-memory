import type { SerializedSession } from "@/lib/tests/types";

export const PATTERN_MEMORY_GAME_TYPE = "pattern-memory" as const;
export const PATTERN_MEMORY_START_LENGTH = 1;
export const PATTERN_MEMORY_LIVES = 3;
export const PATTERN_MEMORY_CHOICE_COUNT = 4;

export const PATTERN_MEMORY_ICONS = [
  { id: "sun", label: "Sun" },
  { id: "moon", label: "Moon" },
  { id: "cloud", label: "Cloud" },
  { id: "star", label: "Star" },
  { id: "heart", label: "Heart" },
  { id: "bell", label: "Bell" },
  { id: "leaf", label: "Leaf" },
  { id: "flame", label: "Flame" },
  { id: "snowflake", label: "Snowflake" },
  { id: "music", label: "Music" },
  { id: "camera", label: "Camera" },
  { id: "gift", label: "Gift" },
] as const;

export type PatternMemoryIconId = (typeof PATTERN_MEMORY_ICONS)[number]["id"];
export type PatternMemoryGameState = "playing" | "gameover";

export type PatternMemoryChoice = {
  id: string;
  label: string;
  iconIds: PatternMemoryIconId[];
};

export type SerializedPatternMemoryChoice = {
  id: string;
  label: string;
};

export type PatternMemoryAsset = {
  token: string;
  iconId: PatternMemoryIconId;
};

export type PatternMemoryHistoryItem = {
  turn: number;
  patternLength: number;
  shownIcons: PatternMemoryIconId[];
  selectedChoiceId: string;
  selectedIconIds: PatternMemoryIconId[];
  correct: boolean;
};

export type PatternMemorySessionData = {
  id: string;
  participantId: string;
  gameState: PatternMemoryGameState;
  score: number;
  lives: number;
  turn: number;
  patternLength: number;
  currentIcons: PatternMemoryIconId[];
  currentAssets: PatternMemoryAsset[];
  choices: PatternMemoryChoice[];
  correctChoiceId: string;
  message: string;
  history: PatternMemoryHistoryItem[];
};

export type PatternMemoryAnswerPayload = {
  sessionId: string;
  answer: string;
};

export type SerializedPatternMemorySession = SerializedSession & {
  lives: number;
  turn: number;
  patternLength: number;
  currentIcons: string[];
  choices: SerializedPatternMemoryChoice[];
  message: string;
  accuracy: number;
  history: PatternMemoryHistoryItem[];
};

const PATTERN_ICON_IDS = PATTERN_MEMORY_ICONS.map((icon) => icon.id);
const PATTERN_ICON_LABELS = Object.fromEntries(
  PATTERN_MEMORY_ICONS.map((icon) => [icon.id, icon.label])
) as Record<PatternMemoryIconId, string>;

function shuffle<T>(values: readonly T[]): T[] {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
  }

  return copy;
}

function makeChoiceId(): string {
  return crypto.randomUUID();
}

function makeAssetToken(): string {
  return crypto.randomUUID();
}

function makeChoiceLabel(iconIds: PatternMemoryIconId[]): string {
  return iconIds
    .map((iconId) => PATTERN_ICON_LABELS[iconId])
    .sort((left, right) => left.localeCompare(right))
    .join(", ");
}

function arePatternsEqual(
  left: PatternMemoryIconId[],
  right: PatternMemoryIconId[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((iconId, index) => iconId === right[index]);
}

function generatePattern(length: number): PatternMemoryIconId[] {
  return shuffle(PATTERN_ICON_IDS).slice(0, length) as PatternMemoryIconId[];
}

function generateChoices(
  correctIcons: PatternMemoryIconId[]
): { choices: PatternMemoryChoice[]; correctChoiceId: string } {
  const uniqueChoices = new Map<string, PatternMemoryChoice>();
  const correctLabel = makeChoiceLabel(correctIcons);
  const correctChoiceId = makeChoiceId();

  uniqueChoices.set(correctLabel, {
    id: correctChoiceId,
    label: correctLabel,
    iconIds: correctIcons,
  });

  while (uniqueChoices.size < PATTERN_MEMORY_CHOICE_COUNT) {
    const candidate = generatePattern(correctIcons.length);

    if (arePatternsEqual(candidate, correctIcons)) {
      continue;
    }

    const label = makeChoiceLabel(candidate);

    if (uniqueChoices.has(label)) {
      continue;
    }

    uniqueChoices.set(label, {
      id: makeChoiceId(),
      label,
      iconIds: candidate,
    });
  }

  return {
    choices: shuffle(Array.from(uniqueChoices.values())),
    correctChoiceId,
  };
}

function buildRound(length: number) {
  const currentIcons = generatePattern(length);
  const { choices, correctChoiceId } = generateChoices(currentIcons);
  const currentAssets = currentIcons.map((iconId) => ({
    token: makeAssetToken(),
    iconId,
  }));

  return {
    currentIcons,
    currentAssets,
    choices,
    correctChoiceId,
  };
}

export function createPatternMemoryAssetUrl(
  origin: string,
  sessionId: string,
  token: string
): string {
  return new URL(
    `/api/pattern-memory/assets/${sessionId}/${token}`,
    origin
  ).toString();
}

export function calculatePatternMemoryAccuracy(
  score: number,
  lives: number
): number {
  const answered = score + (PATTERN_MEMORY_LIVES - lives);
  if (answered <= 0) return 0;
  return Math.round((score / answered) * 100);
}

export function createPatternMemorySession(
  sessionId: string,
  participantId: string
): PatternMemorySessionData {
  const firstRound = buildRound(PATTERN_MEMORY_START_LENGTH);

  return {
    id: sessionId,
    participantId,
    gameState: "playing",
    score: 0,
    lives: PATTERN_MEMORY_LIVES,
    turn: 1,
    patternLength: PATTERN_MEMORY_START_LENGTH,
    currentIcons: firstRound.currentIcons,
    currentAssets: firstRound.currentAssets,
    choices: firstRound.choices,
    correctChoiceId: firstRound.correctChoiceId,
    message: "Study the icons, then choose the matching description.",
    history: [],
  };
}

export function answerPatternMemorySession(
  session: PatternMemorySessionData,
  answer: string
): PatternMemorySessionData {
  if (
    session.gameState !== "playing" ||
    session.currentIcons.length === 0 ||
    session.choices.length === 0
  ) {
    return session;
  }

  const selectedChoice =
    session.choices.find((choice) => choice.id === answer) ?? null;
  const correct = selectedChoice?.id === session.correctChoiceId;
  const history = [
    ...session.history,
    {
      turn: session.turn,
      patternLength: session.patternLength,
      shownIcons: session.currentIcons,
      selectedChoiceId: answer,
      selectedIconIds: selectedChoice?.iconIds ?? [],
      correct: Boolean(correct),
    },
  ];

  if (!correct) {
    const nextLives = session.lives - 1;
    const wrongMessage = selectedChoice
      ? `Wrong. You picked "${selectedChoice.label}", but the correct answer was "${makeChoiceLabel(session.currentIcons)}".`
      : `Wrong. No valid choice was selected. The correct answer was "${makeChoiceLabel(session.currentIcons)}".`;

    if (nextLives <= 0) {
      return {
        ...session,
        gameState: "gameover",
        lives: 0,
        currentIcons: [],
        currentAssets: [],
        choices: [],
        correctChoiceId: "",
        message: wrongMessage,
        history,
      };
    }

    const nextRound = buildRound(session.patternLength);

    return {
      ...session,
      lives: nextLives,
      turn: session.turn + 1,
      currentIcons: nextRound.currentIcons,
      currentAssets: nextRound.currentAssets,
      choices: nextRound.choices,
      correctChoiceId: nextRound.correctChoiceId,
      message: wrongMessage,
      history,
    };
  }

  const nextLength = session.patternLength + 1;

  if (nextLength > PATTERN_ICON_IDS.length) {
    return {
      ...session,
      gameState: "gameover",
      score: session.score + 1,
      turn: session.turn + 1,
      currentIcons: [],
      currentAssets: [],
      choices: [],
      correctChoiceId: "",
      message:
        "Perfect run. You cleared every available icon length without duplicates.",
      history,
    };
  }

  const nextRound = buildRound(nextLength);

  return {
    ...session,
    score: session.score + 1,
    turn: session.turn + 1,
    patternLength: nextLength,
    currentIcons: nextRound.currentIcons,
    currentAssets: nextRound.currentAssets,
    choices: nextRound.choices,
    correctChoiceId: nextRound.correctChoiceId,
    message: `Correct. Get ready for ${nextLength} icons.`,
    history,
  };
}

export function serializePatternMemorySession(
  session: PatternMemorySessionData,
  origin: string
): SerializedPatternMemorySession {
  return {
    sessionId: session.id,
    participantId: session.participantId,
    gameState: session.gameState,
    score: session.score,
    lives: session.lives,
    turn: session.turn,
    patternLength: session.patternLength,
    currentIcons: session.currentAssets.map((asset) =>
      createPatternMemoryAssetUrl(origin, session.id, asset.token)
    ),
    choices: session.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
    })),
    message: session.message,
    accuracy: calculatePatternMemoryAccuracy(session.score, session.lives),
    history: session.gameState === "gameover" ? session.history.slice(-20) : [],
  };
}

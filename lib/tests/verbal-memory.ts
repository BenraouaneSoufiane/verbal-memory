import type { SerializedSession } from "@/lib/tests/types";

export const VERBAL_MEMORY_GAME_TYPE = "verbal-memory" as const;
export const VERBAL_MEMORY_LIVES = 3;

export const WORD_POOL = [
  "apple", "bridge", "candle", "desert", "engine", "forest", "garden", "hammer",
  "island", "jacket", "kitten", "ladder", "magnet", "napkin", "orange", "planet",
  "quartz", "rocket", "silver", "thunder", "umbrella", "velvet", "window", "yellow",
  "anchor", "basket", "castle", "dragon", "ember", "feather", "globe", "harbor",
  "insect", "jungle", "kernel", "lantern", "mirror", "needle", "ocean", "pencil",
  "quiver", "ribbon", "shadow", "temple", "unicorn", "valley", "whistle", "zipper",
  "apricot", "button", "circle", "donkey", "eagle", "fabric", "guitar", "helmet",
  "igloo", "jewel", "kettle", "lemon", "marble", "nickel", "olive", "parrot",
  "quilt", "radar", "saddle", "tunnel", "utensil", "violet", "walnut", "yogurt",
  "artist", "beacon", "copper", "dolphin", "elbow", "falcon", "galaxy", "hazel",
  "icicle", "jigsaw", "kayak", "legend", "meadow", "nectar", "orbit", "pepper",
  "quokka", "raven", "scooter", "trophy", "violet", "wander", "yonder", "zephyr",
] as const;

export type VerbalMemoryGameState = "playing" | "gameover";

export type QueueItem = {
  word: string;
  dueAtTurn: number;
};

export type VerbalMemorySessionData = {
  id: string;
  participantId: string;
  gameState: VerbalMemoryGameState;
  score: number;
  lives: number;
  turn: number;
  currentWord: string;
  message: string;
  shownWords: string[];
  history: string[];
  repeatQueue: QueueItem[];
  usedNewWords: string[];
  pool: string[];
};

export type VerbalMemoryAnswer = "new" | "seen";

export type VerbalMemoryAnswerPayload = {
  sessionId: string;
  answer: VerbalMemoryAnswer;
};

export type SerializedVerbalMemorySession = SerializedSession & {
  lives: number;
  turn: number;
  currentWord: string;
  message: string;
  accuracy: number;
  history: string[];
};

export function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateAccuracy(score: number, lives: number): number {
  const answered = score + (VERBAL_MEMORY_LIVES - lives);
  if (answered <= 0) return 0;
  return Math.round((score / answered) * 100);
}

function drawFreshWord(pool: string[], excluded: Set<string>): string {
  let available = pool.filter((w) => !excluded.has(w));

  if (available.length === 0) {
    const recycled = shuffle([...new Set(WORD_POOL)]);
    pool.splice(0, pool.length, ...recycled);
    available = pool.filter((w) => !excluded.has(w));
  }

  return available[0] ?? pool[0];
}

function scheduleRepeat(word: string, upcomingTurn: number, queue: QueueItem[]) {
  const delay = Math.random() < 0.18 ? randomInt(10, 18) : randomInt(2, 9);
  queue.push({ word, dueAtTurn: upcomingTurn + delay });
}

function chooseNextWord(
  nextTurn: number,
  seen: Set<string>,
  queue: QueueItem[],
  used: Set<string>,
  pool: string[]
): string {
  const dueRepeats = queue.filter(
    (item) => item.dueAtTurn <= nextTurn && seen.has(item.word)
  );

  const repeatChance = nextTurn < 8 ? 0.28 : nextTurn < 20 ? 0.4 : 0.52;
  const shouldUseRepeat = dueRepeats.length > 0 && Math.random() < repeatChance;

  if (shouldUseRepeat) {
    const chosen = dueRepeats[randomInt(0, dueRepeats.length - 1)];
    const idx = queue.findIndex(
      (item) => item.word === chosen.word && item.dueAtTurn === chosen.dueAtTurn
    );

    if (idx >= 0) {
      queue.splice(idx, 1);
    }

    if (Math.random() < 0.75) {
      scheduleRepeat(chosen.word, nextTurn, queue);
    }

    return chosen.word;
  }

  const fresh = drawFreshWord(pool, used);
  used.add(fresh);
  scheduleRepeat(fresh, nextTurn, queue);
  return fresh;
}

export function createVerbalMemorySession(
  sessionId: string,
  participantId: string
): VerbalMemorySessionData {
  const pool = shuffle([...new Set(WORD_POOL)]);
  const queue: QueueItem[] = [];
  const used = new Set<string>();
  const shown = new Set<string>();

  const firstTurn = 1;
  const firstWord = chooseNextWord(firstTurn, shown, queue, used, pool);

  return {
    id: sessionId,
    participantId,
    gameState: "playing",
    score: 0,
    lives: VERBAL_MEMORY_LIVES,
    turn: firstTurn,
    currentWord: firstWord,
    message: "Decide whether the word is new or seen before.",
    shownWords: [],
    history: [],
    repeatQueue: queue,
    usedNewWords: [...used],
    pool,
  };
}

export function answerVerbalMemorySession(
  session: VerbalMemorySessionData,
  answer: VerbalMemoryAnswer
): VerbalMemorySessionData {
  if (session.gameState !== "playing" || !session.currentWord) {
    return session;
  }

  const shownWords = new Set(session.shownWords);
  const usedNewWords = new Set(session.usedNewWords);
  const repeatQueue = [...session.repeatQueue];
  const history = [...session.history, session.currentWord];

  const actuallySeen = shownWords.has(session.currentWord);
  const correct =
    (answer === "seen" && actuallySeen) || (answer === "new" && !actuallySeen);

  shownWords.add(session.currentWord);

  if (!correct) {
    const nextLives = session.lives - 1;

    if (nextLives <= 0) {
      return {
        ...session,
        gameState: "gameover",
        lives: 0,
        message: `Wrong. "${session.currentWord}" was ${actuallySeen ? "seen" : "new"}.`,
        shownWords: [...shownWords],
        history,
        repeatQueue,
        usedNewWords: [...usedNewWords],
        currentWord: "",
      };
    }

    const nextTurn = session.turn + 1;
    const nextWord = chooseNextWord(
      nextTurn,
      shownWords,
      repeatQueue,
      usedNewWords,
      session.pool
    );

    return {
      ...session,
      gameState: "playing",
      score: session.score,
      lives: nextLives,
      turn: nextTurn,
      currentWord: nextWord,
      message: `Wrong. "${session.currentWord}" was ${actuallySeen ? "seen" : "new"}.`,
      shownWords: [...shownWords],
      history,
      repeatQueue,
      usedNewWords: [...usedNewWords],
    };
  }

  const nextScore = session.score + 1;
  const nextTurn = session.turn + 1;
  const nextWord = chooseNextWord(
    nextTurn,
    shownWords,
    repeatQueue,
    usedNewWords,
    session.pool
  );

  return {
    ...session,
    gameState: "playing",
    score: nextScore,
    lives: session.lives,
    turn: nextTurn,
    currentWord: nextWord,
    message: `Correct. "${session.currentWord}" was ${actuallySeen ? "seen" : "new"}.`,
    shownWords: [...shownWords],
    history,
    repeatQueue,
    usedNewWords: [...usedNewWords],
  };
}

export function serializeVerbalMemorySession(
  session: VerbalMemorySessionData
): SerializedVerbalMemorySession {
  return {
    sessionId: session.id,
    participantId: session.participantId,
    gameState: session.gameState,
    score: session.score,
    lives: session.lives,
    turn: session.turn,
    currentWord: session.currentWord,
    message: session.message,
    accuracy: calculateAccuracy(session.score, session.lives),
    history: session.gameState === "gameover" ? session.history.slice(-20) : [],
  };
}
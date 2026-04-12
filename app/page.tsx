"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// Verbal Memory test app
// Drop into app/page.tsx in a Next.js project.
// Uses a mixed strategy:
// - mostly unseen words early on
// - repeated words are reintroduced at irregular intervals
// - avoids predictable cycles that users could game by counting

const WORD_POOL = [
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
  "quokka", "raven", "scooter", "trophy", "violet", "wander", "yonder", "zephyr"
];

type GameState = "idle" | "playing" | "gameover";

type QueueItem = {
  word: string;
  dueAtTurn: number;
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Page() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [turn, setTurn] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [message, setMessage] = useState("Press start to begin.");
  const [shownWords, setShownWords] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<string[]>([]);
  const [repeatQueue, setRepeatQueue] = useState<QueueItem[]>([]);
  const [usedNewWords, setUsedNewWords] = useState<Set<string>>(new Set());

  const poolRef = useRef<string[]>(shuffle([...new Set(WORD_POOL)]));

  const accuracy = useMemo(() => {
    const answered = score + (3 - lives);
    if (answered <= 0) return 0;
    return Math.round((score / answered) * 100);
  }, [score, lives]);

  function resetGame() {
    const freshPool = shuffle([...new Set(WORD_POOL)]);
    poolRef.current = freshPool;
    setGameState("playing");
    setScore(0);
    setLives(3);
    setTurn(0);
    setMessage("Decide whether the word is new or seen before.");
    setShownWords(new Set());
    setHistory([]);
    setRepeatQueue([]);
    setUsedNewWords(new Set());
    setCurrentWord("");
  }

  function drawFreshWord(excluded: Set<string>): string {
    const available = poolRef.current.filter((w) => !excluded.has(w));
    if (available.length === 0) {
      // recycle pool if exhausted, but still avoid immediate duplicates when possible
      poolRef.current = shuffle([...new Set(WORD_POOL)]);
      const recycled = poolRef.current.filter((w) => !excluded.has(w));
      return recycled[0] ?? poolRef.current[0];
    }
    return available[randomInt(0, available.length - 1)];
  }

  function scheduleRepeat(word: string, upcomingTurn: number, queue: QueueItem[]) {
    // Irregular delay so the user cannot game the test by counting.
    // Most repeats come back after 2-9 turns, with occasional longer delays.
    const delay = Math.random() < 0.18 ? randomInt(10, 18) : randomInt(2, 9);
    queue.push({ word, dueAtTurn: upcomingTurn + delay });
  }

  function chooseNextWord(nextTurn: number, seen: Set<string>, queue: QueueItem[], used: Set<string>) {
    const dueRepeats = queue.filter((item) => item.dueAtTurn <= nextTurn && seen.has(item.word));

    // Dynamic repeat rate:
    // - early game: fewer repeats
    // - later game: more repeats
    const repeatChance = nextTurn < 8 ? 0.28 : nextTurn < 20 ? 0.4 : 0.52;

    const shouldUseRepeat = dueRepeats.length > 0 && Math.random() < repeatChance;

    if (shouldUseRepeat) {
      const chosen = dueRepeats[randomInt(0, dueRepeats.length - 1)];
      const idx = queue.findIndex(
        (item) => item.word === chosen.word && item.dueAtTurn === chosen.dueAtTurn
      );
      if (idx >= 0) queue.splice(idx, 1);
      // Re-schedule the repeated word again sometimes, to allow later reappearances.
      if (Math.random() < 0.75) {
        scheduleRepeat(chosen.word, nextTurn, queue);
      }
      return chosen.word;
    }

    const excluded = new Set([...used]);
    const fresh = drawFreshWord(excluded);
    used.add(fresh);
    // Fresh words are scheduled for future repeats after the user has seen them.
    scheduleRepeat(fresh, nextTurn, queue);
    return fresh;
  }

  function advanceRound(nextSeen?: Set<string>, nextQueue?: QueueItem[], nextUsed?: Set<string>, nextTurnOverride?: number) {
    const seen = nextSeen ? new Set(nextSeen) : new Set(shownWords);
    const queue = nextQueue ? [...nextQueue] : [...repeatQueue];
    const used = nextUsed ? new Set(nextUsed) : new Set(usedNewWords);
    const nextTurn = nextTurnOverride ?? turn;

    const word = chooseNextWord(nextTurn, seen, queue, used);

    setRepeatQueue(queue);
    setUsedNewWords(used);
    setCurrentWord(word);
  }

  useEffect(() => {
    if (gameState === "playing" && turn === 0 && !currentWord) {
      advanceRound(new Set(), [], new Set(), 1);
      setTurn(1);
    }
  }, [gameState, turn, currentWord]);

  function handleAnswer(answer: "new" | "seen") {
    if (gameState !== "playing" || !currentWord) return;

    const actuallySeen = shownWords.has(currentWord);
    const correct = (answer === "seen" && actuallySeen) || (answer === "new" && !actuallySeen);

    const nextSeen = new Set(shownWords);
    nextSeen.add(currentWord);

    const nextHistory = [...history, currentWord];
    setHistory(nextHistory);
    setShownWords(nextSeen);

    if (correct) {
      const nextScore = score + 1;
      setScore(nextScore);
      setMessage(`Correct. “${currentWord}” was ${actuallySeen ? "seen" : "new"}.`);
    } else {
      const nextLives = lives - 1;
      setLives(nextLives);
      setMessage(`Wrong. “${currentWord}” was ${actuallySeen ? "seen" : "new"}.`);
      if (nextLives <= 0) {
        setGameState("gameover");
        return;
      }
    }

    const nextTurn = turn + 1;
    setTurn(nextTurn);
    advanceRound(nextSeen, repeatQueue, usedNewWords, nextTurn);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Verbal Memory</h1>
            <p className="mt-2 text-sm text-neutral-300">
              Tap <span className="font-semibold text-white">Seen</span> if the word appeared earlier.
              Tap <span className="font-semibold text-white"> New</span> if it has not.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm shadow-lg">
            <div>Score: <span className="font-semibold">{score}</span></div>
            <div>Lives: <span className="font-semibold">{lives}</span></div>
            <div>Accuracy: <span className="font-semibold">{accuracy}%</span></div>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
          {gameState === "idle" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <p className="mb-6 max-w-xl text-neutral-300">
                Words repeat at irregular intervals, so the test stays about memory rather than counting.
              </p>
              <button
                onClick={resetGame}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                Start Test
              </button>
            </div>
          )}

          {gameState === "playing" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <div className="mb-8 text-5xl font-bold tracking-wide sm:text-7xl">
                {currentWord || "..."}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleAnswer("seen")}
                  className="rounded-2xl border border-neutral-700 bg-neutral-800 px-6 py-3 text-base font-semibold transition hover:bg-neutral-700"
                >
                  Seen
                </button>
                <button
                  onClick={() => handleAnswer("new")}
                  className="rounded-2xl bg-white px-6 py-3 text-base font-semibold text-black transition hover:scale-[1.02]"
                >
                  New
                </button>
              </div>

              <p className="mt-6 text-sm text-neutral-400">Turn {turn}</p>
            </div>
          )}

          {gameState === "gameover" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-bold">Game Over</h2>
              <p className="mt-3 text-neutral-300">Final score: {score}</p>
              <p className="mt-1 text-neutral-400">Accuracy: {accuracy}%</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={resetGame}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="text-sm font-semibold text-white">Current logic</h3>
            <p className="mt-2 text-sm text-neutral-400">
              New words come from a pool. Repeated words return after irregular delays, usually between 2 and 9 turns, with occasional longer gaps.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="text-sm font-semibold text-white">Why this avoids counting</h3>
            <p className="mt-2 text-sm text-neutral-400">
              There is no fixed pattern like “every 7th word is seen.” A repeat only appears when it is due and when probability allows it.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="text-sm font-semibold text-white">Last shown words</h3>
          <p className="mt-2 break-words text-sm text-neutral-400">
            {history.length ? history.slice(-20).join(", ") : "No words shown yet."}
          </p>
        </div>
      </div>
    </main>
  );
}

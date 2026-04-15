"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import {
  COLOR_MEMORY_PALETTE,
  type ColorMemoryColorId,
} from "@/lib/tests/color-memory";
import {
  type PatternMemoryHistoryItem,
  type SerializedPatternMemoryChoice,
} from "@/lib/tests/pattern-memory";

type GameMode =
  | "verbal-memory"
  | "number-memory"
  | "color-memory"
  | "pattern-memory";

type VerbalGameState = {
  ok: boolean;
  sessionId: string;
  participantId: string;
  gameState: "playing" | "gameover";
  score: number;
  lives: number;
  turn: number;
  currentWord: string;
  message: string;
  accuracy: number;
  history: string[];
};

type NumberMemoryHistoryItem = {
  turn: number;
  digits: number;
  shownNumber: string;
  submittedAnswer: string;
  correct: boolean;
};

type NumberGameState = {
  ok: boolean;
  sessionId: string;
  participantId: string;
  gameState: "playing" | "gameover";
  score: number;
  lives: number;
  turn: number;
  digits: number;
  currentNumber: string;
  message: string;
  accuracy: number;
  history: NumberMemoryHistoryItem[];
};

type ColorMemoryHistoryItem = {
  turn: number;
  sequenceLength: number;
  shownColors: ColorMemoryColorId[];
  submittedColors: ColorMemoryColorId[];
  correct: boolean;
};

type ColorGameState = {
  ok: boolean;
  sessionId: string;
  participantId: string;
  gameState: "playing" | "gameover";
  score: number;
  lives: number;
  turn: number;
  sequenceLength: number;
  currentSequence: ColorMemoryColorId[];
  message: string;
  accuracy: number;
  history: ColorMemoryHistoryItem[];
};

type PatternGameState = {
  ok: boolean;
  sessionId: string;
  participantId: string;
  gameState: "playing" | "gameover";
  score: number;
  lives: number;
  turn: number;
  patternLength: number;
  currentIcons: string[];
  choices: SerializedPatternMemoryChoice[];
  message: string;
  accuracy: number;
  history: PatternMemoryHistoryItem[];
};

type TestConfig = {
  title: string;
  subtitle: string;
  route: string;
  adminHref: string;
  guideHref: string;
  startLabel: string;
};

const TEST_CONFIG: Record<GameMode, TestConfig> = {
  "verbal-memory": {
    title: "Verbal Memory",
    subtitle:
      "Tap Seen if the word appeared earlier. Tap New if it has not.",
    route: "/api/verbal-memory",
    adminHref: "/admin/verbal-memory",
    guideHref:
      "https://github.com/benraouanesoufiane/verbal-memory/docs/ai-agents.md",
    startLabel: "Start Verbal Memory",
  },
  "number-memory": {
    title: "Number Memory",
    subtitle:
      "Memorize the number, wait for it to disappear, then type it back exactly.",
    route: "/api/number-memory",
    adminHref: "/admin/number-memory",
    guideHref:
      "https://github.com/benraouanesoufiane/verbal-memory/docs/ai-agents.md",
    startLabel: "Start Number Memory",
  },
  "color-memory": {
    title: "Color Memory",
    subtitle:
      "Memorize the color sequence in order, then rebuild the same sequence without duplicate colors.",
    route: "/api/color-memory",
    adminHref: "/admin/color-memory",
    guideHref:
      "https://github.com/benraouanesoufiane/verbal-memory/docs/ai-agents.md",
    startLabel: "Start Color Memory",
  },
  "pattern-memory": {
    title: "Pattern Memory",
    subtitle:
      "Study the icons, then choose the text option that matches the same icon set. Each correct round adds one more icon.",
    route: "/api/pattern-memory",
    adminHref: "/admin/pattern-memory",
    guideHref:
      "https://github.com/benraouanesoufiane/verbal-memory/docs/pattern-memory-ai-agents.md",
    startLabel: "Start Pattern Memory",
  },
};

const COLOR_BY_ID = Object.fromEntries(
  COLOR_MEMORY_PALETTE.map((color) => [color.id, color])
) as Record<
  ColorMemoryColorId,
  {
    id: ColorMemoryColorId;
    label: string;
    hex: string;
    textColor: string;
  }
>;

function getRevealDurationMs(digits: number): number {
  return Math.min(6000, 1200 + digits * 400);
}

function getColorRevealDurationMs(length: number): number {
  return Math.min(9000, 1400 + length * 850);
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm shadow-lg">
      <div className="text-neutral-400">{label}</div>
      <div className="mt-1 font-semibold text-white">{value}</div>
    </div>
  );
}

function ColorSwatch({
  colorId,
  className = "",
  showLabel = true,
}: {
  colorId: ColorMemoryColorId;
  className?: string;
  showLabel?: boolean;
}) {
  const color = COLOR_BY_ID[colorId];

  return (
    <div
      className={`flex min-h-[88px] items-center justify-center rounded-2xl border border-white/10 px-4 py-3 shadow-lg ${className}`}
      style={{ backgroundColor: color.hex }}
    >
      {showLabel ? (
        <span className="text-base font-semibold" style={{ color: color.textColor }}>
          {color.label}
        </span>
      ) : null}
    </div>
  );
}

export default function Page() {
  const [mode, setMode] = useState<GameMode>("verbal-memory");
  const [verbalGame, setVerbalGame] = useState<VerbalGameState | null>(null);
  const [numberGame, setNumberGame] = useState<NumberGameState | null>(null);
  const [colorGame, setColorGame] = useState<ColorGameState | null>(null);
  const [patternGame, setPatternGame] = useState<PatternGameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [numberAnswer, setNumberAnswer] = useState("");
  const [colorAnswer, setColorAnswer] = useState<ColorMemoryColorId[]>([]);
  const [numberRevealVisible, setNumberRevealVisible] = useState(false);
  const [colorRevealVisible, setColorRevealVisible] = useState(false);

  const config = TEST_CONFIG[mode];
  const activeGame =
    mode === "verbal-memory"
      ? verbalGame
      : mode === "number-memory"
        ? numberGame
        : mode === "color-memory"
          ? colorGame
          : patternGame;

  useEffect(() => {
    if (mode !== "number-memory" || !numberGame || numberGame.gameState !== "playing") {
      setNumberRevealVisible(false);
      return;
    }

    setNumberRevealVisible(true);
    const timeout = window.setTimeout(() => {
      setNumberRevealVisible(false);
    }, getRevealDurationMs(numberGame.digits));

    return () => window.clearTimeout(timeout);
  }, [mode, numberGame]);

  useEffect(() => {
    if (mode !== "color-memory" || !colorGame || colorGame.gameState !== "playing") {
      setColorRevealVisible(false);
      return;
    }

    setColorRevealVisible(true);
    const timeout = window.setTimeout(() => {
      setColorRevealVisible(false);
    }, getColorRevealDurationMs(colorGame.sequenceLength));

    return () => window.clearTimeout(timeout);
  }, [mode, colorGame]);

  const metrics = useMemo(() => {
    if (mode === "verbal-memory") {
      return [
        { label: "Score", value: verbalGame?.score ?? 0 },
        { label: "Lives", value: verbalGame?.lives ?? 3 },
        { label: "Accuracy", value: `${verbalGame?.accuracy ?? 0}%` },
      ];
    }

    if (mode === "number-memory") {
      return [
        { label: "Score", value: numberGame?.score ?? 0 },
        { label: "Lives", value: numberGame?.lives ?? 3 },
        { label: "Accuracy", value: `${numberGame?.accuracy ?? 0}%` },
      ];
    }

    if (mode === "color-memory") {
      return [
        { label: "Score", value: colorGame?.score ?? 0 },
        { label: "Lives", value: colorGame?.lives ?? 3 },
        { label: "Accuracy", value: `${colorGame?.accuracy ?? 0}%` },
      ];
    }

    return [
      { label: "Score", value: patternGame?.score ?? 0 },
      { label: "Lives", value: patternGame?.lives ?? 3 },
      { label: "Accuracy", value: `${patternGame?.accuracy ?? 0}%` },
    ];
  }, [mode, verbalGame, numberGame, colorGame, patternGame]);

  async function startGame(nextMode: GameMode = mode) {
    setLoading(true);
    setNumberAnswer("");
    setColorAnswer([]);

    try {
      const res = await fetch(TEST_CONFIG[nextMode].route, {
        method: "GET",
        cache: "no-store",
      });

      if (nextMode === "verbal-memory") {
        const data: VerbalGameState = await res.json();
        setVerbalGame(data);
        return;
      }

      if (nextMode === "number-memory") {
        const data: NumberGameState = await res.json();
        setNumberGame(data);
        return;
      }

      if (nextMode === "color-memory") {
        const data: ColorGameState = await res.json();
        setColorGame(data);
        return;
      }

      const data: PatternGameState = await res.json();
      setPatternGame(data);
    } finally {
      setLoading(false);
    }
  }

  async function resetGame() {
    setLoading(true);
    setNumberAnswer("");
    setColorAnswer([]);

    try {
      const res = await fetch(config.route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          sessionId: activeGame?.sessionId,
        }),
      });

      if (mode === "verbal-memory") {
        const data: VerbalGameState = await res.json();
        setVerbalGame(data);
        return;
      }

      if (mode === "number-memory") {
        const data: NumberGameState = await res.json();
        setNumberGame(data);
        return;
      }

      if (mode === "color-memory") {
        const data: ColorGameState = await res.json();
        setColorGame(data);
        return;
      }

      const data: PatternGameState = await res.json();
      setPatternGame(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerbalAnswer(answer: "new" | "seen") {
    if (!verbalGame || verbalGame.gameState !== "playing") return;

    setLoading(true);
    try {
      const res = await fetch(TEST_CONFIG["verbal-memory"].route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: verbalGame.sessionId,
          answer,
        }),
      });

      const data: VerbalGameState = await res.json();
      setVerbalGame(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleNumberSubmit() {
    if (!numberGame || numberGame.gameState !== "playing") return;

    setLoading(true);
    try {
      const res = await fetch(TEST_CONFIG["number-memory"].route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: numberGame.sessionId,
          answer: numberAnswer,
        }),
      });

      const data: NumberGameState = await res.json();
      setNumberGame(data);
      setNumberAnswer("");
    } finally {
      setLoading(false);
    }
  }

  function handleColorPick(colorId: ColorMemoryColorId) {
    if (!colorGame || colorGame.gameState !== "playing" || colorRevealVisible) {
      return;
    }

    setColorAnswer((current) => {
      if (
        current.includes(colorId) ||
        current.length >= colorGame.sequenceLength
      ) {
        return current;
      }

      return [...current, colorId];
    });
  }

  function handleColorRemoveLast() {
    setColorAnswer((current) => current.slice(0, -1));
  }

  function handleColorClear() {
    setColorAnswer([]);
  }

  async function handleColorSubmit() {
    if (!colorGame || colorGame.gameState !== "playing") return;
    if (colorAnswer.length !== colorGame.sequenceLength) return;

    setLoading(true);
    try {
      const res = await fetch(TEST_CONFIG["color-memory"].route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: colorGame.sessionId,
          answer: colorAnswer,
        }),
      });

      const data: ColorGameState = await res.json();
      setColorGame(data);
      setColorAnswer([]);
    } finally {
      setLoading(false);
    }
  }

  async function handlePatternSubmit(choiceId: string) {
    if (!patternGame || patternGame.gameState !== "playing") return;

    setLoading(true);
    try {
      const res = await fetch(TEST_CONFIG["pattern-memory"].route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: patternGame.sessionId,
          answer: choiceId,
        }),
      });

      const data: PatternGameState = await res.json();
      setPatternGame(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-5">
          <div className="flex flex-wrap gap-3">
            {(
              [
                "verbal-memory",
                "number-memory",
                "color-memory",
                "pattern-memory",
              ] as const
            ).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  mode === value
                    ? "bg-white text-black"
                    : "border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"
                }`}
              >
                {TEST_CONFIG[value].title}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{config.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-300">
                {config.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
          {!activeGame && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <p className="mb-6 max-w-xl text-neutral-300">
                {mode === "verbal-memory"
                  ? "Words repeat at irregular intervals, so the challenge stays about memory rather than counting."
                  : mode === "number-memory"
                    ? "Each correct round adds one more digit. The reveal time scales up with the length, then the number disappears."
                    : mode === "color-memory"
                      ? "Each correct round adds one more unique color. Watch the sequence, then rebuild it in the same order."
                      : "Each correct round adds one more icon. Memorize the icon set, then pick the text option that describes it."}
              </p>
              <button
                onClick={() => startGame(mode)}
                disabled={loading}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
              >
                {loading ? "Starting..." : config.startLabel}
              </button>
            </div>
          )}

          {mode === "verbal-memory" && verbalGame?.gameState === "playing" && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="mb-8 text-5xl font-bold tracking-wide sm:text-7xl">
                {verbalGame.currentWord}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleVerbalAnswer("seen")}
                  disabled={loading}
                  className="rounded-2xl border border-neutral-700 bg-neutral-800 px-6 py-3 text-base font-semibold transition hover:bg-neutral-700 disabled:opacity-60"
                >
                  Seen
                </button>
                <button
                  onClick={() => handleVerbalAnswer("new")}
                  disabled={loading}
                  className="rounded-2xl bg-white px-6 py-3 text-base font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
                >
                  New
                </button>
              </div>

              <p className="mt-6 text-sm text-neutral-400">Turn {verbalGame.turn}</p>
              <p className="mt-2 text-sm text-neutral-500">{verbalGame.message}</p>
            </div>
          )}

          {mode === "number-memory" && numberGame?.gameState === "playing" && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
                {numberRevealVisible ? "Memorize" : "Recall"}
              </div>

              <div className="mb-8 min-h-[96px] text-4xl font-bold tracking-[0.35em] sm:text-6xl">
                {numberRevealVisible ? numberGame.currentNumber : "•".repeat(numberGame.digits)}
              </div>

              {numberRevealVisible ? (
                <p className="text-sm text-neutral-400">
                  This number will hide automatically after a short delay.
                </p>
              ) : (
                <div className="w-full max-w-sm">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={numberAnswer}
                    onChange={(e) => setNumberAnswer(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleNumberSubmit();
                      }
                    }}
                    placeholder={`Enter the ${numberGame.digits}-digit number`}
                    className="w-full rounded-2xl border border-neutral-700 bg-black px-4 py-3 text-center text-xl tracking-[0.25em] text-white outline-none placeholder:tracking-normal placeholder:text-neutral-500"
                  />

                  <button
                    type="button"
                    onClick={handleNumberSubmit}
                    disabled={loading || numberAnswer.length === 0}
                    className="mt-4 w-full rounded-2xl bg-white px-6 py-3 text-base font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
                  >
                    Submit Answer
                  </button>
                </div>
              )}

              <p className="mt-6 text-sm text-neutral-500">{numberGame.message}</p>
            </div>
          )}

          {mode === "color-memory" && colorGame?.gameState === "playing" && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
                {colorRevealVisible ? "Memorize" : "Recall"}
              </div>

              <div className="w-full max-w-3xl">
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {(colorRevealVisible
                    ? colorGame.currentSequence
                    : Array.from({ length: colorGame.sequenceLength }, (_, index) =>
                        colorAnswer[index] ?? null
                      )
                  ).map((colorId, index) =>
                    colorId ? (
                      <ColorSwatch key={`${colorId}-${index}`} colorId={colorId} />
                    ) : (
                      <div
                        key={`empty-${index}`}
                        className="flex min-h-[88px] items-center justify-center rounded-2xl border border-dashed border-neutral-700 bg-neutral-950 text-sm text-neutral-500"
                      >
                        Slot {index + 1}
                      </div>
                    )
                  )}
                </div>

                {colorRevealVisible ? (
                  <p className="text-sm text-neutral-400">
                    Watch the order carefully. The colors will hide automatically.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {COLOR_MEMORY_PALETTE.map((color) => {
                        const selected = colorAnswer.includes(color.id);

                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => handleColorPick(color.id)}
                            disabled={
                              loading ||
                              selected ||
                              colorAnswer.length >= colorGame.sequenceLength
                            }
                            className={`rounded-2xl border border-white/10 p-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              selected ? "ring-2 ring-white/60" : "hover:scale-[1.02]"
                            }`}
                          >
                            <ColorSwatch colorId={color.id} className="min-h-[72px]" />
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleColorRemoveLast}
                        disabled={loading || colorAnswer.length === 0}
                        className="rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold transition hover:bg-neutral-700 disabled:opacity-60"
                      >
                        Remove Last
                      </button>
                      <button
                        type="button"
                        onClick={handleColorClear}
                        disabled={loading || colorAnswer.length === 0}
                        className="rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold transition hover:bg-neutral-700 disabled:opacity-60"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleColorSubmit}
                        disabled={loading || colorAnswer.length !== colorGame.sequenceLength}
                        className="rounded-2xl bg-white px-6 py-2 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
                      >
                        Submit Sequence
                      </button>
                    </div>
                  </>
                )}
              </div>

              <p className="mt-6 text-sm text-neutral-400">
                Turn {colorGame.turn} · Sequence length {colorGame.sequenceLength}
              </p>
              <p className="mt-2 text-sm text-neutral-500">{colorGame.message}</p>
            </div>
          )}

          {mode === "pattern-memory" && patternGame?.gameState === "playing" && (
            <div className="min-h-[360px]">
              <div className="text-center">
                <div className="mb-3 text-sm uppercase tracking-[0.35em] text-neutral-500">
                  Pattern Length {patternGame.patternLength}
                </div>
                <h2 className="text-2xl font-semibold text-white">
                  Which option matches these icons?
                </h2>
                <p className="mt-2 text-sm text-neutral-400">
                  Remember the whole icon set before you choose.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {patternGame.currentIcons.map((imageUrl, index) => (
                  <div
                    key={`${patternGame.turn}-${index}`}
                    className="flex min-h-[120px] items-center justify-center rounded-3xl border border-neutral-800 bg-black/40 px-4 py-6 text-center shadow-lg"
                  >
                    <Image
                      src={imageUrl}
                      alt={`Pattern icon ${index + 1}`}
                      width={80}
                      height={80}
                      className="h-20 w-20"
                      unoptimized
                      style={{ filter: "invert(1)" }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {patternGame.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => handlePatternSubmit(choice.id)}
                    disabled={loading}
                    className="rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-4 text-left text-sm font-medium text-white transition hover:border-neutral-500 hover:bg-neutral-900 disabled:opacity-60"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>

              <p className="mt-6 text-center text-sm text-neutral-400">
                Turn {patternGame.turn} · Pattern length {patternGame.patternLength}
              </p>
              <p className="mt-2 text-center text-sm text-neutral-500">
                {patternGame.message}
              </p>
            </div>
          )}

          {mode === "verbal-memory" && verbalGame?.gameState === "gameover" && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-bold">Game Over</h2>
              <p className="mt-3 text-neutral-300">Final score: {verbalGame.score}</p>
              <p className="mt-1 text-neutral-400">Accuracy: {verbalGame.accuracy}%</p>
              <p className="mt-2 text-neutral-500">{verbalGame.message}</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={resetGame}
                  disabled={loading}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}

          {mode === "number-memory" && numberGame?.gameState === "gameover" && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-bold">Game Over</h2>
              <p className="mt-3 text-neutral-300">
                Final score: {numberGame.score}
              </p>
              <p className="mt-1 text-neutral-400">
                Accuracy: {numberGame.accuracy}%
              </p>
              <p className="mt-1 text-neutral-400">
                Highest cleared length: {Math.max(2, numberGame.digits - 1)} digits
              </p>
              <p className="mt-2 text-neutral-500">{numberGame.message}</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={resetGame}
                  disabled={loading}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}

          {mode === "color-memory" && colorGame?.gameState === "gameover" && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-bold">Game Over</h2>
              <p className="mt-3 text-neutral-300">Final score: {colorGame.score}</p>
              <p className="mt-1 text-neutral-400">Accuracy: {colorGame.accuracy}%</p>
              <p className="mt-1 text-neutral-400">
                Highest cleared length: {colorGame.score} colors
              </p>
              <p className="mt-2 text-neutral-500">{colorGame.message}</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={resetGame}
                  disabled={loading}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}

          {mode === "pattern-memory" && patternGame?.gameState === "gameover" && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-bold">Game Over</h2>
              <p className="mt-3 text-neutral-300">
                Final score: {patternGame.score}
              </p>
              <p className="mt-1 text-neutral-400">
                Accuracy: {patternGame.accuracy}%
              </p>
              <p className="mt-1 text-neutral-400">
                Highest cleared length: {patternGame.score} icons
              </p>
              <p className="mt-2 text-neutral-500">{patternGame.message}</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={resetGame}
                  disabled={loading}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        {mode === "verbal-memory" && verbalGame?.gameState === "gameover" && (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="text-sm font-semibold text-white">Words Shown</h3>
            <p className="mt-2 break-words text-sm text-neutral-400">
              {verbalGame.history.length ? verbalGame.history.join(", ") : "No words shown yet."}
            </p>
          </div>
        )}

        {mode === "number-memory" && numberGame?.gameState === "gameover" && (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="text-sm font-semibold text-white">Recent Attempts</h3>
            <div className="mt-3 space-y-2 text-sm text-neutral-400">
              {numberGame.history.length ? (
                numberGame.history.map((attempt) => (
                  <div
                    key={`${attempt.turn}-${attempt.shownNumber}`}
                    className="flex flex-col gap-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      Turn {attempt.turn} · {attempt.digits} digits
                    </span>
                    <span>
                      Expected {attempt.shownNumber} · Entered {attempt.submittedAnswer || "blank"} ·{" "}
                      {attempt.correct ? "Correct" : "Wrong"}
                    </span>
                  </div>
                ))
              ) : (
                <p>No attempts recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {mode === "color-memory" && colorGame?.gameState === "gameover" && (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="text-sm font-semibold text-white">Recent Rounds</h3>
            <div className="mt-3 space-y-2 text-sm text-neutral-400">
              {colorGame.history.length ? (
                colorGame.history.map((attempt) => (
                  <div
                    key={`${attempt.turn}-${attempt.shownColors.join("-")}`}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3"
                  >
                    <p>
                      Turn {attempt.turn} · {attempt.sequenceLength} colors ·{" "}
                      {attempt.correct ? "Correct" : "Wrong"}
                    </p>
                    <p className="mt-1">
                      Expected {attempt.shownColors.join(", ")} · Entered{" "}
                      {attempt.submittedColors.join(", ") || "nothing"}
                    </p>
                  </div>
                ))
              ) : (
                <p>No rounds recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {mode === "pattern-memory" && patternGame?.gameState === "gameover" && (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="text-sm font-semibold text-white">Recent Rounds</h3>
            <div className="mt-3 space-y-2 text-sm text-neutral-400">
              {patternGame.history.length ? (
                patternGame.history.map((attempt) => (
                  <div
                    key={`${attempt.turn}-${attempt.shownIcons.join("-")}`}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-3"
                  >
                    <p>
                      Turn {attempt.turn} · {attempt.patternLength} icons ·{" "}
                      {attempt.correct ? "Correct" : "Wrong"}
                    </p>
                    <p className="mt-1">
                      Expected {attempt.shownIcons.join(", ")} · Entered{" "}
                      {attempt.selectedIconIds.join(", ") || "nothing"}
                    </p>
                  </div>
                ))
              ) : (
                <p>No rounds recorded yet.</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <a
            href={config.guideHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            AI Agents Guide
          </a>

          <a
            href={config.adminHref}
            className="rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            See Results
          </a>
        </div>
      </div>
    </main>
  );
}

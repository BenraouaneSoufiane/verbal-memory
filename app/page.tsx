"use client";

import React, { useState } from "react";

type ApiState = {
  ok: boolean;
  sessionId: string;
  gameState: "playing" | "gameover";
  score: number;
  lives: number;
  turn: number;
  currentWord: string;
  message: string;
  accuracy: number;
  history: string[];
};

export default function Page() {
  const [game, setGame] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(false);

  async function startGame() {
    setLoading(true);
    try {
      const res = await fetch("/api/verbal-memory", {
        method: "GET",
        cache: "no-store",
      });
      const data: ApiState = await res.json();
      setGame(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(answer: "new" | "seen") {
    if (!game || game.gameState !== "playing") return;

    setLoading(true);
    try {
      const res = await fetch("/api/verbal-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: game.sessionId,
          answer,
        }),
      });

      const data: ApiState = await res.json();
      setGame(data);
    } finally {
      setLoading(false);
    }
  }

  async function resetGame() {
    setLoading(true);
    try {
      const res = await fetch("/api/verbal-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });

      const data: ApiState = await res.json();
      setGame(data);
    } finally {
      setLoading(false);
    }
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
            <div>Score: <span className="font-semibold">{game?.score ?? 0}</span></div>
            <div>Lives: <span className="font-semibold">{game?.lives ?? 3}</span></div>
            <div>Accuracy: <span className="font-semibold">{game?.accuracy ?? 0}%</span></div>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
          {!game && (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <p className="mb-6 max-w-xl text-neutral-300">
                Words repeat at irregular intervals, so the test stays about memory rather than counting.
              </p>
              <button
                onClick={startGame}
                disabled={loading}
                className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
              >
                {loading ? "Starting..." : "Start Test"}
              </button>
            </div>
          )}

          {game?.gameState === "playing" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <div className="mb-8 text-5xl font-bold tracking-wide sm:text-7xl">
                {game.currentWord}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleAnswer("seen")}
                  disabled={loading}
                  className="rounded-2xl border border-neutral-700 bg-neutral-800 px-6 py-3 text-base font-semibold transition hover:bg-neutral-700 disabled:opacity-60"
                >
                  Seen
                </button>
                <button
                  onClick={() => handleAnswer("new")}
                  disabled={loading}
                  className="rounded-2xl bg-white px-6 py-3 text-base font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
                >
                  New
                </button>
              </div>

              <p className="mt-6 text-sm text-neutral-400">Turn {game.turn}</p>
              <p className="mt-2 text-sm text-neutral-500">{game.message}</p>
            </div>
          )}

          {game?.gameState === "gameover" && (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-bold">Game Over</h2>
              <p className="mt-3 text-neutral-300">Final score: {game.score}</p>
              <p className="mt-1 text-neutral-400">Accuracy: {game.accuracy}%</p>
              <p className="mt-2 text-neutral-500">{game.message}</p>
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

        {game?.gameState === "gameover" && (
          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="text-sm font-semibold text-white">Words Shown</h3>
            <p className="mt-2 break-words text-sm text-neutral-400">
              {game.history?.length ? game.history.join(", ") : "No words shown yet."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
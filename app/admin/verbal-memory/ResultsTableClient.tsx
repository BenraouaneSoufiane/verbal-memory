"use client";

import React, { useMemo, useState } from "react";
import type { Participant } from "./page";

type ComparisonRow = {
  human: Participant;
  ai: Participant;
};

type GameStateFilter = "all" | "playing" | "gameover";
type KindFilter = "all" | "human" | "ai";

function isHumanParticipant(participantId: string | null): boolean {
  if (!participantId) return false;
  return participantId.toLowerCase().startsWith("human");
}

function getParticipantKind(
  participantId: string | null | undefined
): "human" | "ai" {
  return isHumanParticipant(participantId ?? null) ? "human" : "ai";
}

function hasVisibleScore(score: unknown) {
  if (score === null || score === undefined || score === "" || score === "null") {
    return false;
  }

  const n = Number(score);
  return Number.isFinite(n) && n > 0;
}

function formatUtcDate(dateString: string): string {
  const date = new Date(dateString);

  const datePart = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);

  return `${datePart} ${timePart} UTC`;
}

function buildComparisons(participants: Participant[]): ComparisonRow[] {
  const validFinished = participants.filter(
    (p) =>
      p.gameState === "gameover" &&
      p.score !== null &&
      p.participant_id !== null
  );

  const latestByParticipant = new Map<string, Participant>();

  for (const row of validFinished) {
    const key = row.participant_id!;
    const existing = latestByParticipant.get(key);

    if (
      !existing ||
      new Date(row.updated_at).getTime() > new Date(existing.updated_at).getTime()
    ) {
      latestByParticipant.set(key, row);
    }
  }

  const latestRows = Array.from(latestByParticipant.values()).sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const humans = latestRows.filter((p) => isHumanParticipant(p.participant_id));
  const aiModels = latestRows.filter((p) => !isHumanParticipant(p.participant_id));

  const pairCount = Math.min(humans.length, aiModels.length);

  return Array.from({ length: pairCount }, (_, i) => ({
    human: humans[i],
    ai: aiModels[i],
  }));
}

function toCsvValue(value: unknown): string {
  const stringValue =
    value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const headers =
    rows.length > 0
      ? Object.keys(rows[0])
      : [
          "session_id",
          "participant_id",
          "kind",
          "game_state",
          "score",
          "accuracy",
          "turn",
          "lives",
          "words",
          "created_at",
          "updated_at",
        ];

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function AvgSummary({ comparisons }: { comparisons: ComparisonRow[] }) {
  if (comparisons.length === 0) return null;

  const humanAvg =
    comparisons.reduce((sum, row) => sum + (row.human.score ?? 0), 0) /
    comparisons.length;

  const aiAvg =
    comparisons.reduce((sum, row) => sum + (row.ai.score ?? 0), 0) /
    comparisons.length;

  const maxAvg = Math.max(humanAvg, aiAvg, 1);

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
      <h2 className="text-xl font-semibold text-white">Human vs AI Summary</h2>
      <p className="mt-2 text-sm text-neutral-400">
        Based on matched pairs only: average = total score ÷ number of pairs.
        Finished sessions only. Null scores and playing sessions are excluded.
        Extra AI results are ignored to keep the comparison balanced.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-neutral-300">Humans average</span>
            <span className="font-medium text-white">{humanAvg.toFixed(1)}</span>
          </div>
          <div className="h-3 rounded-full bg-neutral-800">
            <div
              className="h-3 rounded-full bg-white"
              style={{ width: `${(humanAvg / maxAvg) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-neutral-300">AI average</span>
            <span className="font-medium text-white">{aiAvg.toFixed(1)}</span>
          </div>
          <div className="h-3 rounded-full bg-neutral-800">
            <div
              className="h-3 rounded-full bg-neutral-500"
              style={{ width: `${(aiAvg / maxAvg) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PairChart({ comparisons }: { comparisons: ComparisonRow[] }) {
  if (comparisons.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-400">
        No completed human-vs-AI pairs yet.
      </div>
    );
  }

  const maxScore = Math.max(
    ...comparisons.flatMap((row) => [row.human.score ?? 0, row.ai.score ?? 0]),
    1
  );

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
      <h2 className="text-xl font-semibold text-white">Human vs AI Pairs</h2>
      <p className="mt-2 text-sm text-neutral-400">
        One human is matched with one AI model.
        Bars represent raw scores and are scaled for visual comparison only.
      </p>

      <div className="mt-6 space-y-6">
        {comparisons.map((row, index) => (
          <div key={`${row.human.id}-${row.ai.id}`} className="space-y-3">
            <div className="text-sm font-medium text-neutral-300">
              Pair {index + 1}: {row.human.participant_id} vs {row.ai.participant_id}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
                <span>{row.human.participant_id}</span>
                <span>{row.human.score}</span>
              </div>
              <div className="h-3 rounded-full bg-neutral-800">
                <div
                  className="h-3 rounded-full bg-white"
                  style={{ width: `${((row.human.score ?? 0) / maxScore) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
                <span>{row.ai.participant_id}</span>
                <span>{row.ai.score}</span>
              </div>
              <div className="h-3 rounded-full bg-neutral-800">
                <div
                  className="h-3 rounded-full bg-neutral-500"
                  style={{ width: `${((row.ai.score ?? 0) / maxScore) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultsTableClient({
  participants,
  gameTitle = "Verbal Memory",
  csvPrefix = "verbal-memory-results",
  historyLabel = "Words",
  summaryDescription = "Participants and saved sessions from Postgres.",
}: {
  participants: Participant[];
  gameTitle?: string;
  csvPrefix?: string;
  historyLabel?: string;
  summaryDescription?: string;
}) {
  const [gameStateFilter, setGameStateFilter] = useState<GameStateFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [hideNulledScores, setHideNulledScores] = useState(false);

  const comparisons = useMemo(() => buildComparisons(participants), [participants]);

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchesGameState =
        gameStateFilter === "all" ? true : p.gameState === gameStateFilter;

      const matchesKind =
        kindFilter === "all"
          ? true
          : getParticipantKind(p.participant_id) === kindFilter;

      const matchesScore = hideNulledScores ? hasVisibleScore(p.score) : true;

      return matchesGameState && matchesKind && matchesScore;
    });
  }, [participants, gameStateFilter, kindFilter, hideNulledScores]);

  const handleExportCsv = () => {
    const rows = filteredParticipants.map((p) => ({
      session_id: p.id,
      participant_id: p.participant_id ?? "",
      kind: getParticipantKind(p.participant_id),
      game_state: p.gameState,
      score: p.score ?? "",
      accuracy: p.accuracy ?? "",
      turn: p.turn ?? "",
      lives: p.lives ?? "",
      words: p.historyCount,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    const safeDate = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadCsv(`${csvPrefix}-${safeDate}.csv`, rows);
  };

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">{gameTitle} Admin</h1>
          <p className="mt-3 text-lg text-neutral-400">
            {summaryDescription}
          </p>
        </div>

        <AvgSummary comparisons={comparisons} />
        <PairChart comparisons={comparisons} />

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex flex-col gap-1">
                <label htmlFor="gameStateFilter" className="text-sm font-medium text-neutral-300">
                  Game state
                </label>
                <select
                  id="gameStateFilter"
                  value={gameStateFilter}
                  onChange={(e) =>
                    setGameStateFilter(e.target.value as GameStateFilter)
                  }
                  className="rounded-md border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="all">All</option>
                  <option value="playing">Playing</option>
                  <option value="gameover">Gameover</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="kindFilter" className="text-sm font-medium text-neutral-300">
                  Kind
                </label>
                <select
                  id="kindFilter"
                  value={kindFilter}
                  onChange={(e) => setKindFilter(e.target.value as KindFilter)}
                  className="rounded-md border border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="all">All</option>
                  <option value="human">Human</option>
                  <option value="ai">AI</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input
                  type="checkbox"
                  checked={hideNulledScores}
                  onChange={(e) => setHideNulledScores(e.target.checked)}
                  className="rounded border-neutral-700 bg-black"
                />
                Hide nulled scores
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-neutral-400">
                Showing{" "}
                <span className="font-semibold text-white">
                  {filteredParticipants.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-white">
                  {participants.length}
                </span>
              </div>

              <button
                type="button"
                onClick={handleExportCsv}
                className="rounded-md border border-neutral-700 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-800 text-neutral-300">
              <tr>
                <th className="px-4 py-4">Session</th>
                <th className="px-4 py-4">Participant</th>
                <th className="px-4 py-4">Kind</th>
                <th className="px-4 py-4">State</th>
                <th className="px-4 py-4">Score</th>
                <th className="px-4 py-4">Accuracy</th>
                <th className="px-4 py-4">Turn</th>
                <th className="px-4 py-4">Lives</th>
                <th className="px-4 py-4">{historyLabel}</th>
                <th className="px-4 py-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map((p) => (
                <tr key={p.id} className="border-b border-neutral-900">
                  <td className="px-4 py-4 break-all">{p.id}</td>
                  <td className="px-4 py-4">{p.participant_id ?? "—"}</td>
                  <td className="px-4 py-4 capitalize">
                    {getParticipantKind(p.participant_id)}
                  </td>
                  <td className="px-4 py-4">{p.gameState}</td>
                  <td className="px-4 py-4">{p.score ?? "—"}</td>
                  <td className="px-4 py-4">
                    {p.accuracy !== null && p.accuracy !== undefined
                      ? `${p.accuracy}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-4">{p.turn ?? "—"}</td>
                  <td className="px-4 py-4">{p.lives ?? "—"}</td>
                  <td className="px-4 py-4">{p.historyCount}</td>
                  <td className="px-4 py-4">{formatUtcDate(p.updated_at)}</td>
                </tr>
              ))}

              {filteredParticipants.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-neutral-400" colSpan={10}>
                    No participants match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

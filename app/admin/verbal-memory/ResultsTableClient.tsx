"use client";

import React, { useMemo, useState } from "react";
import type { Participant } from "./page";

type GameStateFilter = "all" | "playing" | "gameover";
type KindFilter = "all" | "human" | "ai";

type Props = {
  participants: Participant[];
};

function toCsvValue(value: unknown): string {
  const stringValue =
    value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function getParticipantKind(participantId: string | null | undefined): "human" | "ai" {
  if (!participantId) return "ai";
  return participantId.toLowerCase().startsWith("human") ? "human" : "ai";
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    const emptyCsv = "session_id,participant_id,game_state,score,accuracy,turn,lives,words,created_at,updated_at\n";
    const blob = new Blob([emptyCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const headers = Object.keys(rows[0]);
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

function hasRealScore(score: unknown) {
  if (score === null || score === undefined) return false;
  if (score === "") return false;
  if (score === "null") return false;
  if (typeof score === "number" && Number.isNaN(score)) return false;
  return true;
}

function hasVisibleScore(score: unknown) {
  if (score === null || score === undefined || score === "" || score === "null") {
    return false;
  }

  const n = Number(score);
  return Number.isFinite(n) && n > 0;
}

export default function ResultsTableClient({ participants }: Props) {
  const [gameStateFilter, setGameStateFilter] = useState<GameStateFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [hideNulledScores, setHideNulledScores] = useState(false);




  const filteredParticipants = useMemo(() => {
  return participants.filter((p) => {
    const matchesGameState =
      gameStateFilter === "all" ? true : p.gameState === gameStateFilter;

    const participantKind = getParticipantKind(p.participant_id);
    const matchesKind =
      kindFilter === "all" ? true : participantKind === kindFilter;

    const matchesScore = hideNulledScores ? hasVisibleScore(p.score) : true;

    return matchesGameState && matchesKind && matchesScore;
  });
}, [participants, gameStateFilter, kindFilter, hideNulledScores]);

  const handleExportCsv = () => {
    const rows = filteredParticipants.map((p) => ({
      session_id: p.id,
      participant_id: p.participant_id ?? "",
      game_state: p.gameState,
      score: p.score ?? "",
      accuracy: p.accuracy ?? "",
      turn: p.turn,
      lives: p.lives,
      words: p.historyCount,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    const safeDate = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadCsv(`verbal-memory-results-${safeDate}.csv`, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="gameStateFilter" className="text-sm font-medium">
              Game state
            </label>
            <select
              id="gameStateFilter"
              value={gameStateFilter}
              onChange={(e) => setGameStateFilter(e.target.value as GameStateFilter)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="playing">Playing</option>
              <option value="gameover">Gameover</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="kindFilter" className="text-sm font-medium">
              Kind
            </label>
            <select
              id="kindFilter"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as KindFilter)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="human">Human</option>
              <option value="ai">AI</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideNulledScores}
              onChange={(e) => setHideNulledScores(e.target.checked)}
            />
            Hide nulled scores
          </label>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredParticipants.length}</span> of{" "}
            <span className="font-semibold">{participants.length}</span>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border-b px-4 py-3 text-left">Session</th>
              <th className="border-b px-4 py-3 text-left">Participant</th>
              <th className="border-b px-4 py-3 text-left">State</th>
              <th className="border-b px-4 py-3 text-left">Score</th>
              <th className="border-b px-4 py-3 text-left">Accuracy</th>
              <th className="border-b px-4 py-3 text-left">Turn</th>
              <th className="border-b px-4 py-3 text-left">Lives</th>
              <th className="border-b px-4 py-3 text-left">Words</th>
              <th className="border-b px-4 py-3 text-left">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((p) => (
              <tr key={p.id} className="odd:bg-white even:bg-gray-50/40">
                <td className="border-b px-4 py-3 font-mono text-xs">{p.id}</td>
                <td className="border-b px-4 py-3">{p.participant_id ?? "—"}</td>
                <td className="border-b px-4 py-3">{p.gameState}</td>
                <td className="border-b px-4 py-3">{p.score ?? "—"}</td>
                <td className="border-b px-4 py-3">
                  {p.accuracy !== null && p.accuracy !== undefined ? `${p.accuracy}%` : "—"}
                </td>
                <td className="border-b px-4 py-3">{p.turn}</td>
                <td className="border-b px-4 py-3">{p.lives}</td>
                <td className="border-b px-4 py-3">{p.historyCount}</td>
                <td className="border-b px-4 py-3">
                  {new Date(p.updated_at).toISOString().replace("T", " ").slice(0, 19)} UTC
                </td>
              </tr>
            ))}

            {filteredParticipants.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No participants match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
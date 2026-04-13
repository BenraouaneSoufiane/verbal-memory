import React from "react";
import ResultsTableClient from "./ResultsTableClient";

export type Participant = {
  id: string;
  participant_id: string | null;
  created_at: string;
  updated_at: string;
  score: number | null;
  lives: number;
  turn: number;
  gameState: "playing" | "gameover";
  historyCount: number;
  accuracy: number | null;
};

async function getParticipants(): Promise<Participant[]> {
  const res = await fetch("http://intellitest.space/api/admin/verbal-memory", {
    headers: {
      "x-admin-token": process.env.ADMIN_TOKEN ?? "",
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (!data.ok) return [];
  return data.participants;
}

export default async function AdminPage() {
  const participants = await getParticipants();

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-2xl font-bold">Verbal Memory Admin</h1>
      <p className="mt-2 text-sm text-gray-600">
        Participants and saved sessions from Postgres.
      </p>

      <div className="mt-6">
        <ResultsTableClient participants={participants} />
      </div>
    </main>
  );
}
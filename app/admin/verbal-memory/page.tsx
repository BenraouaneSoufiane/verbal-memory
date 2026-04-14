import React from "react";
import ResultsTableClient from "./ResultsTableClient";

export type Participant = {
  id: string;
  participant_id: string | null;
  created_at: string;
  updated_at: string;
  score: number | null;
  lives: number | null;
  turn: number | null;
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

  return <ResultsTableClient participants={participants} />;
}
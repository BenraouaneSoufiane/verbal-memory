import React from "react";
import ResultsTableClient from "../verbal-memory/ResultsTableClient";
import type { Participant } from "../verbal-memory/page";

async function getParticipants(): Promise<Participant[]> {
  const res = await fetch("http://intellitest.space/api/admin/number-memory", {
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
    <ResultsTableClient
      participants={participants}
      gameTitle="Number Memory"
      csvPrefix="number-memory-results"
      historyLabel="Attempts"
      summaryDescription="Number-memory sessions and recall attempts from Postgres."
    />
  );
}

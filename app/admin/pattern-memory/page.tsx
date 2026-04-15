import React from "react";
import ResultsTableClient from "../verbal-memory/ResultsTableClient";
import type { Participant } from "../verbal-memory/page";

async function getParticipants(): Promise<Participant[]> {
  const res = await fetch("http://intellitest.space/api/admin/pattern-memory", {
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
      gameTitle="Pattern Memory"
      csvPrefix="pattern-memory-results"
      historyLabel="Rounds"
      summaryDescription="Pattern-memory sessions and icon rounds from Postgres."
    />
  );
}

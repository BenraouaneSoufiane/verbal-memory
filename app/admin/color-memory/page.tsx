import React from "react";
import ResultsTableClient from "../verbal-memory/ResultsTableClient";
import type { Participant } from "../verbal-memory/page";

async function getParticipants(): Promise<Participant[]> {
  const res = await fetch("http://intellitest.space/api/admin/color-memory", {
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
      gameTitle="Color Memory"
      csvPrefix="color-memory-results"
      historyLabel="Rounds"
      summaryDescription="Color-memory sessions and sequence recall rounds from Postgres."
    />
  );
}

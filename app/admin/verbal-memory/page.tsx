import React from "react";

type Participant = {
  id: string;
  created_at: string;
  updated_at: string;
  score: number;
  lives: number;
  turn: number;
  gameState: "playing" | "gameover";
  historyCount: number;
};

async function getParticipants(): Promise<Participant[]> {
  const res = await fetch("http://localhost:3001/api/admin/verbal-memory", {
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
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Verbal Memory Admin</h1>
        <p className="mt-2 text-neutral-400">
          Participants and saved sessions from Postgres.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-800 bg-neutral-950/40">
              <tr>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Turn</th>
                <th className="px-4 py-3">Lives</th>
                <th className="px-4 py-3">Words</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-b border-neutral-800">
                  <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3">{p.gameState}</td>
                  <td className="px-4 py-3">{p.score}</td>
                  <td className="px-4 py-3">{p.turn}</td>
                  <td className="px-4 py-3">{p.lives}</td>
                  <td className="px-4 py-3">{p.historyCount}</td>
                  <td className="px-4 py-3">
                    {new Date(p.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {participants.length === 0 && (
            <div className="px-4 py-6 text-neutral-400">
              No participants yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
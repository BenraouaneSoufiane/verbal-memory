import React from "react";

type Participant = {
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

type ComparisonRow = {
  human: Participant;
  ai: Participant;
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

function isHumanParticipant(participantId: string | null): boolean {
  if (!participantId) return false;
  return participantId.toLowerCase().startsWith("human");
}

function buildComparisons(participants: Participant[]): ComparisonRow[] {
  const validFinished = participants.filter(
    (p) =>
      p.gameState === "gameover" &&
      p.score !== null &&
      p.participant_id !== null
  );

  // keep only the latest valid finished session per participant
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

export default async function AdminPage() {
  const participants = await getParticipants();
  const comparisons = buildComparisons(participants);

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Verbal Memory Admin</h1>
          <p className="mt-3 text-lg text-neutral-400">
            Participants and saved sessions from Postgres.
          </p>
        </div>

        <AvgSummary comparisons={comparisons} />
        <PairChart comparisons={comparisons} />

        <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-800 text-neutral-300">
              <tr>
                <th className="px-4 py-4">Session</th>
                <th className="px-4 py-4">Participant</th>
                <th className="px-4 py-4">State</th>
                <th className="px-4 py-4">Score</th>
                <th className="px-4 py-4">Accuracy</th>
                <th className="px-4 py-4">Turn</th>
                <th className="px-4 py-4">Lives</th>
                <th className="px-4 py-4">Words</th>
                <th className="px-4 py-4">Updated</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-b border-neutral-900">
                  <td className="px-4 py-4 break-all">{p.id}</td>
                  <td className="px-4 py-4">{p.participant_id ?? "—"}</td>
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
                  <td className="px-4 py-4">
                    {new Date(p.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))}

              {participants.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-neutral-400" colSpan={9}>
                    No participants yet.
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
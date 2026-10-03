export type LeaderboardEntry = {
  rank: number;
  playerName: string;
  score: number;
  date: string; // "DD/MM/YYYY", formatted from created_at
};

export type DataResult<T> = { ok: true; data: T } | { ok: false };

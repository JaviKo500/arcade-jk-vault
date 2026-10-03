import type { LeaderboardEntry } from "@/lib/data/types";
import type { Database } from "@/lib/supabase/database.types";

export type LeaderboardRow = Database["public"]["Views"]["leaderboard"]["Row"];

export const LEADERBOARD_COLUMNS =
  "game_id, player_name, score, created_at, rank";

// created_at → "DD/MM/YYYY" in UTC, so server and browser render the same date.
function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

// View columns are typed as nullable; rows missing any field are dropped.
export function toLeaderboardEntry(
  row: LeaderboardRow,
): LeaderboardEntry | null {
  if (
    row.rank === null ||
    row.player_name === null ||
    row.score === null ||
    row.created_at === null
  ) {
    return null;
  }

  return {
    rank: row.rank,
    playerName: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  };
}

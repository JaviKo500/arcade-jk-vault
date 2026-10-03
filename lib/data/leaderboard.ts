import {
  LEADERBOARD_COLUMNS,
  toLeaderboardEntry,
} from "@/lib/data/leaderboard-entry";
import type { DataResult, LeaderboardEntry } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<DataResult<LeaderboardEntry[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leaderboard")
      .select(LEADERBOARD_COLUMNS)
      .eq("game_id", gameId)
      .order("rank")
      .limit(limit);

    if (error) {
      console.error("getLeaderboard failed", error);
      return { ok: false };
    }

    return {
      ok: true,
      data: data
        .map(toLeaderboardEntry)
        .filter((entry): entry is LeaderboardEntry => entry !== null),
    };
  } catch (error) {
    console.error("getLeaderboard failed", error);
    return { ok: false };
  }
}

import {
  LEADERBOARD_COLUMNS,
  toLeaderboardEntry,
} from "@/lib/data/leaderboard-entry";
import type { DataResult, LeaderboardEntry } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/client";

export async function insertScore(entry: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<DataResult<null>> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("scores").insert({
      game_id: entry.gameId,
      player_name: entry.playerName,
      score: entry.score,
    });

    if (error) {
      console.error("insertScore failed", error);
      return { ok: false };
    }

    return { ok: true, data: null };
  } catch (error) {
    console.error("insertScore failed", error);
    return { ok: false };
  }
}

export async function getPlayerBest(
  gameId: string,
  playerName: string,
): Promise<DataResult<LeaderboardEntry | null>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("leaderboard")
      .select(LEADERBOARD_COLUMNS)
      .eq("game_id", gameId)
      .eq("player_name", playerName)
      .maybeSingle();

    if (error) {
      console.error("getPlayerBest failed", error);
      return { ok: false };
    }

    return { ok: true, data: data ? toLeaderboardEntry(data) : null };
  } catch (error) {
    console.error("getPlayerBest failed", error);
    return { ok: false };
  }
}

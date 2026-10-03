import type { Game, GameCategory } from "@/data/games";
import type { DataResult } from "@/lib/data/types";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

// TODO(step 4): replace with Game once data/games.ts types playCount as number.
type CatalogGame = Omit<Game, "playCount"> & { playCount: number };

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type GameStatsRow = Database["public"]["Views"]["game_stats"]["Row"];

const GAME_COLUMNS =
  "id, title, short_description, long_description, category, cover, accent_color, sort_order, created_at";

function toGame(row: GameRow, stats: GameStatsRow | undefined): CatalogGame {
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    category: row.category as GameCategory,
    cover: row.cover,
    accentColor: row.accent_color as Game["accentColor"],
    bestScore: stats?.best_score ?? 0,
    playCount: stats?.play_count ?? 0,
  };
}

export async function getGames(): Promise<DataResult<CatalogGame[]>> {
  try {
    const supabase = await createClient();
    const [games, stats] = await Promise.all([
      supabase.from("games").select(GAME_COLUMNS).order("sort_order"),
      supabase.from("game_stats").select("game_id, best_score, play_count"),
    ]);

    if (games.error || stats.error) {
      console.error("getGames failed", games.error ?? stats.error);
      return { ok: false };
    }

    const statsById = new Map(stats.data.map((s) => [s.game_id, s]));
    return {
      ok: true,
      data: games.data.map((row) => toGame(row, statsById.get(row.id))),
    };
  } catch (error) {
    console.error("getGames failed", error);
    return { ok: false };
  }
}

export async function getGame(
  id: string,
): Promise<DataResult<CatalogGame | null>> {
  try {
    const supabase = await createClient();
    const [game, stats] = await Promise.all([
      supabase.from("games").select(GAME_COLUMNS).eq("id", id).maybeSingle(),
      supabase
        .from("game_stats")
        .select("game_id, best_score, play_count")
        .eq("game_id", id)
        .maybeSingle(),
    ]);

    if (game.error || stats.error) {
      console.error("getGame failed", game.error ?? stats.error);
      return { ok: false };
    }

    return {
      ok: true,
      data: game.data ? toGame(game.data, stats.data ?? undefined) : null,
    };
  } catch (error) {
    console.error("getGame failed", error);
    return { ok: false };
  }
}

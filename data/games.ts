export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  category: GameCategory;
  cover: string;
  accentColor: "cyan" | "magenta" | "yellow" | "green";
  bestScore: number; // game_stats.best_score
  playCount: number; // game_stats.play_count (saved scores)
};

export const CATEGORY_FILTERS = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
] as const;

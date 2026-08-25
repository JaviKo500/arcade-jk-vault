export type ActivityAccent = "cyan" | "magenta" | "yellow" | "green";

export type RecentScoreEntry = {
  player: string;
  game: string;
  score: number;
  timeAgo: string;
  accent: ActivityAccent;
};

export type TopPlayerToday = {
  rank: number;
  player: string;
  score: number;
};

export const RECENT_SCORES: RecentScoreEntry[] = [
  { player: "NEONFOX", game: "Caída", score: 184220, timeAgo: "hace 2 min", accent: "magenta" },
  { player: "PX_KAI", game: "Glotón", score: 96400, timeAgo: "hace 5 min", accent: "yellow" },
  { player: "Z3R0COOL", game: "Invasores", score: 54190, timeAgo: "hace 8 min", accent: "green" },
  { player: "VAULT_07", game: "Rocas", score: 41200, timeAgo: "hace 12 min", accent: "cyan" },
  { player: "GLITCHA", game: "Bloque Buster", score: 28450, timeAgo: "hace 18 min", accent: "cyan" },
  { player: "ARKADYA", game: "Serpentina", score: 7820, timeAgo: "hace 24 min", accent: "green" },
  { player: "CYBER_LU", game: "Ranaria", score: 18900, timeAgo: "hace 31 min", accent: "yellow" },
];

export const TOP_PLAYERS_TODAY: TopPlayerToday[] = [
  { rank: 1, player: "NEONFOX", score: 312840 },
  { rank: 2, player: "PX_KAI", score: 248110 },
  { rank: 3, player: "M00NRYU", score: 196720 },
  { rank: 4, player: "VAULT_07", score: 154300 },
  { rank: 5, player: "GLITCHA", score: 138900 },
];

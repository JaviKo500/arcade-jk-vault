export type SavedScore = {
  gameId: string;
  playerName: string;
  score: number;
  savedAt: number; // epoch ms
};

const SAVED_SCORES_KEY = "arcade-vault:saved-scores";

export function getSavedScores(): SavedScore[] {
  try {
    const raw = localStorage.getItem(SAVED_SCORES_KEY);
    return raw ? (JSON.parse(raw) as SavedScore[]) : [];
  } catch {
    return [];
  }
}

export function addSavedScore(entry: Omit<SavedScore, "savedAt">): void {
  try {
    const all = getSavedScores();
    all.push({ ...entry, savedAt: Date.now() });
    localStorage.setItem(SAVED_SCORES_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable (private mode, SSR) — score just won't persist.
  }
}

const MAX_PLAYER_NAME_LENGTH = 12;
const DEFAULT_PLAYER_NAME = "INVITADO";

// 0 → "NUEVO", 950 → "950", 12400 → "12.4K", 2300000 → "2.3M"
export function formatPlayCount(n: number): string {
  if (n <= 0) return "NUEVO";
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

// Matches the scores.player_name check: ^[A-Z0-9_]{1,12}$
export function normalizePlayerName(raw: string): string {
  const name = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, MAX_PLAYER_NAME_LENGTH);

  return name || DEFAULT_PLAYER_NAME;
}

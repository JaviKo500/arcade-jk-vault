import type { SkinId } from "@/lib/games/types";

// Skin elegida por juego, persistida en localStorage. Solo se llama desde el
// cliente (efectos o handlers), nunca durante el render del servidor.

export const DEFAULT_SKIN: SkinId = "classic";

const skinKey = (gameId: string) => `arcade-vault:skin:${gameId}`;

/** Skin guardada para el juego, o `classic` si no hay una válida para el motor. */
export function getSkinPreference(
  gameId: string,
  skins: readonly SkinId[],
): SkinId {
  try {
    const saved = localStorage.getItem(skinKey(gameId));
    const match = skins.find((skin) => skin === saved);
    return match ?? DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

export function setSkinPreference(gameId: string, skin: SkinId): void {
  try {
    localStorage.setItem(skinKey(gameId), skin);
  } catch {
    // localStorage unavailable (private mode, SSR) — the choice just won't persist.
  }
}

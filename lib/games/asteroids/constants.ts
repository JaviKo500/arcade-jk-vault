import type { SkinId } from "../types";

// Espacio lógico del canvas, independiente de su tamaño CSS.
export const W = 800;
export const H = 600;

// Tablas indexadas por tamaño de asteroide: 1 (pequeño), 2 (mediano), 3 (grande).
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const; // velocidad base en px/s
export const POINTS = [0, 100, 50, 20] as const;

export type AsteroidSize = 1 | 2 | 3;

// Power-up de disparo triple.
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5; // s
export const POWERUP_TTL = 12; // s
export const TRIPLE_SPREAD = 0.18; // rad

// ── Skins ─────────────────────────────────────────────────────────────────────
// Un campo por rol pintado en el canvas. `glow` escala todos los `shadowBlur`
// del motor (0 = sin glow). Ningún color del render vive fuera de `SKINS`.
export type AsteroidsPalette = {
  background: string;
  ship: string;
  thrust: string;
  asteroid: string;
  asteroidGlow: string;
  bullet: string;
  /** Las partículas se pintan con `globalAlpha`, que se desvanece con su vida. */
  particle: string;
  powerUp: string;
  powerUpText: string;
  text: string;
  textDim: string;
  glow: number;
};

export const DEFAULT_SKIN: SkinId = "classic";

export const SKINS: Record<SkinId, AsteroidsPalette> = {
  // Paleta original: tokens neón de app/globals.css.
  classic: {
    background: "#0a0a0f",
    ship: "#00f5ff",
    thrust: "#ff006e",
    asteroid: "#e6e9ff",
    asteroidGlow: "#ff006e",
    bullet: "#f5ff00",
    particle: "#ff006e",
    powerUp: "#00ff88",
    powerUpText: "#00ff88",
    text: "#e6e9ff",
    textDim: "#8a8fb5",
    glow: 1,
  },
  // Synthwave: rocas magenta, nave cian, balas blancas y glow alto.
  neon: {
    background: "#07020f",
    ship: "#00f5ff",
    thrust: "#00ff88",
    asteroid: "#ff2bd6",
    asteroidGlow: "#ff006e",
    bullet: "#ffffff",
    particle: "#ff2bd6",
    powerUp: "#f5ff00",
    powerUpText: "#f5ff00",
    text: "#f5ff00",
    textDim: "#b8a6ff",
    glow: 1.75,
  },
  // 8-bit: subconjunto de la paleta PICO-8, colores planos y sin glow.
  retro: {
    background: "#000000",
    ship: "#29adff",
    thrust: "#ffa300",
    asteroid: "#83769c",
    asteroidGlow: "#83769c",
    bullet: "#fff1e8",
    particle: "#ffa300",
    powerUp: "#00e436",
    powerUpText: "#00e436",
    text: "#fff1e8",
    textDim: "#c2c3c7",
    glow: 0,
  },
};

/** Alias de la skin por defecto. */
export const COLORS = SKINS[DEFAULT_SKIN];

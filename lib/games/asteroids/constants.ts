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

// Paleta neón de la plataforma (mismos valores que los tokens de app/globals.css).
export const COLORS = {
  background: "#0a0a0f",
  ship: "#00f5ff",
  thrust: "#ff006e",
  asteroid: "#e6e9ff",
  asteroidGlow: "#ff006e",
  bullet: "#f5ff00",
  particle: "255, 0, 110", // RGB para componer rgba() con alpha
  powerUp: "#00ff88",
  powerUpText: "#00ff88",
  text: "#e6e9ff",
  textDim: "#8a8fb5",
} as const;

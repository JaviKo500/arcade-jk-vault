import type { SkinId } from "../types";
import type { BlockColor } from "./levels";

// Espacio lógico del canvas, el mismo que el original.
export const W = 800;
export const H = 600;

// Pala y pelota.
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_SPEED = 400; // px/s
export const BALL_SIZE = 16;
export const PADDLE_TOLERANCE = 8; // px por debajo del borde superior de la pala

// Rejilla de bloques.
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = 80;
export const BLOCKS_ORIGIN_Y = 80;

// Física y reglas.
export const BASE_BALL_VX = 200; // px/s
export const BASE_BALL_VY = -300; // px/s
export const POINTS_PER_BLOCK = 10;
export const INITIAL_LIVES = 3;
export const EXPLOSION_DURATION = 0.15; // s, 4 fases
export const MAX_DT = 0.05; // s

// Rutas absolutas desde `/`, servidas desde `public/`.
export const SOUNDS = {
  bounce: "/games/bloque-buster/sounds/ball-bounce.mp3",
  break: "/games/bloque-buster/sounds/break-sound.mp3",
} as const;

export type SoundName = keyof typeof SOUNDS;

// ── Skins ─────────────────────────────────────────────────────────────────────
// Un campo por rol pintado en el canvas. `glow` escala todos los `shadowBlur`
// del motor (0 = sin glow). Ningún color del render vive fuera de `SKINS`.
export type BloqueBusterPalette = {
  background: string;
  paddle: string;
  /** Línea central de la pala (se pinta con alpha 0.85). */
  paddleCore: string;
  ball: string;
  ballGlow: string;
  /** Reflejo de la pelota, filo de los bloques, destello y chispas de la explosión. */
  highlight: string;
  title: string;
  text: string;
  blocks: Record<BlockColor, string>;
  /** Opacidad del interior de los bloques (1 = bloque macizo). */
  blockFill: number;
  glow: number;
};

export const DEFAULT_SKIN: SkinId = "classic";

export const SKINS: Record<SkinId, BloqueBusterPalette> = {
  // Paleta original: neón de la plataforma, ampliada a 7 colores de bloque.
  classic: {
    background: "#0a0a0f",
    paddle: "#00f5ff",
    paddleCore: "#ffffff",
    ball: "#e6e9ff",
    ballGlow: "#00f5ff",
    highlight: "#ffffff",
    title: "#00f5ff",
    text: "#e6e9ff",
    blocks: {
      red: "#ff7700", // naranja
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#aa00ff", // violeta
      hotpink: "#ff006e",
      green: "#00ff88",
      gray: "#8a8fb5", // gris metálico
    },
    blockFill: 0.22,
    glow: 1,
  },
  // Synthwave: tubos saturados, título magenta, texto amarillo y glow alto.
  neon: {
    background: "#07020f",
    paddle: "#00f5ff",
    paddleCore: "#ffffff",
    ball: "#ffffff",
    ballGlow: "#ff2bd6",
    highlight: "#ffffff",
    title: "#ff2bd6",
    text: "#f5ff00",
    blocks: {
      red: "#ff6b00",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#c64bff",
      hotpink: "#ff2bd6",
      green: "#39ff14",
      gray: "#b8a6ff", // lavanda
    },
    blockFill: 0.3,
    glow: 1.75,
  },
  // 8-bit: subconjunto de la paleta PICO-8, bloques macizos y sin glow.
  retro: {
    background: "#000000",
    paddle: "#ff004d",
    paddleCore: "#fff1e8",
    ball: "#fff1e8",
    ballGlow: "#fff1e8",
    highlight: "#fff1e8",
    title: "#ff004d",
    text: "#fff1e8",
    blocks: {
      red: "#ff6c24", // naranja
      yellow: "#ffec27",
      cyan: "#29adff",
      magenta: "#83769c", // lavanda
      hotpink: "#ff77a8",
      green: "#00e436",
      gray: "#c2c3c7",
    },
    blockFill: 1,
    glow: 0,
  },
};

/** Alias de la skin por defecto. */
export const COLORS = SKINS[DEFAULT_SKIN];

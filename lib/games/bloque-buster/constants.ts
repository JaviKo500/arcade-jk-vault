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

// Paleta neón de la plataforma, ampliada a 7 colores de bloque.
export const COLORS = {
  background: "#0a0a0f",
  paddle: "#00f5ff",
  ball: "#e6e9ff",
  text: "#e6e9ff",
  textDim: "#8a8fb5",
  blocks: {
    red: "#ff7700", // naranja
    yellow: "#f5ff00",
    cyan: "#00f5ff",
    magenta: "#aa00ff", // violeta
    hotpink: "#ff006e",
    green: "#00ff88",
    gray: "#8a8fb5", // gris metálico
  } satisfies Record<BlockColor, string>,
} as const;

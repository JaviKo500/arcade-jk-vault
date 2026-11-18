import type { SkinId } from "../types";

// Espacio lógico del canvas y rejilla de 40×30 celdas de 20 px.
export const W = 800;
export const H = 600;
export const CELL = 20;
export const COLS = 40;
export const ROWS = 30;
export const INITIAL_LENGTH = 3;

// Reglas.
export const INITIAL_LIVES = 3;
export const POINTS_PER_FRUIT = 10; // × nivel
export const FRUITS_PER_LEVEL = 5;
export const BASE_STEPS_PER_SECOND = 8;
export const MAX_STEPS_PER_SECOND = 20;
export const DEAD_DURATION = 1; // s
export const MAX_SCORE = 10_000_000; // check de scores.score
export const MAX_DT = 0.05; // s

// Ruta absoluta desde `/`, servida desde `public/`.
export const FRUITS_SRC = "/games/serpentina/fruits.png";

export type FruitSprite = {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

// Fila pixel art de fruits.png (3790×442). Coordenadas de sprites.js con los
// nombres corregidos según la imagen.
export const FRUIT_SPRITES: readonly FruitSprite[] = [
  { name: "apple", x: 34, y: 136, w: 110, h: 160 },
  { name: "banana", x: 186, y: 136, w: 150, h: 160 },
  { name: "pineapple", x: 378, y: 136, w: 110, h: 160 },
  { name: "grape", x: 540, y: 136, w: 130, h: 160 },
  { name: "pumpkin", x: 712, y: 136, w: 130, h: 160 },
  { name: "turnip", x: 894, y: 136, w: 110, h: 160 },
  { name: "eggplant", x: 1066, y: 136, w: 110, h: 160 },
  { name: "strawberry", x: 1228, y: 136, w: 130, h: 160 },
  { name: "cherry", x: 1400, y: 136, w: 130, h: 160 },
  { name: "carrot", x: 1582, y: 136, w: 110, h: 160 },
  { name: "mushroom", x: 1734, y: 136, w: 150, h: 160 },
  { name: "broccoli", x: 1906, y: 136, w: 150, h: 160 },
  { name: "watermelon", x: 2068, y: 136, w: 170, h: 160 },
  { name: "pepper", x: 2250, y: 136, w: 140, h: 160 },
  { name: "kiwi", x: 2432, y: 136, w: 130, h: 160 },
  { name: "lemon", x: 2604, y: 136, w: 130, h: 160 },
  { name: "orange", x: 2786, y: 136, w: 110, h: 160 },
  { name: "peach", x: 2948, y: 136, w: 130, h: 160 },
  { name: "peanut", x: 3110, y: 136, w: 150, h: 160 },
  { name: "raspberry", x: 3302, y: 136, w: 110, h: 160 },
  { name: "tomato", x: 3454, y: 136, w: 150, h: 160 },
  { name: "salad", x: 3637, y: 136, w: 130, h: 160 },
];

// ── Skins ─────────────────────────────────────────────────────────────────────
// Un campo por rol pintado en el canvas. `glow` escala todos los `shadowBlur`
// del motor (0 = sin glow). Ningún color del render vive fuera de `SKINS`.
// Las frutas son sprites de fruits.png y no se recolorean.
export type SerpentinaPalette = {
  background: string;
  /** Línea de la rejilla (decorativa, con alfa). */
  grid: string;
  head: string;
  /** Cuerpo en degradado de `bodyFrom` (junto a la cabeza) a `bodyTo` (cola). Formato `#rrggbb`. */
  bodyFrom: string;
  bodyTo: string;
  /** Parpadeo de toda la serpiente tras un choque. */
  dead: string;
  /** Núcleo que sustituye a la fruta si fruits.png no carga. */
  fruitFallback: string;
  text: string;
  textDim: string;
  glow: number;
};

export const DEFAULT_SKIN: SkinId = "classic";

export const SKINS: Record<SkinId, SerpentinaPalette> = {
  // Paleta original: tokens neón de app/globals.css.
  classic: {
    background: "#0a0a0f",
    grid: "rgba(138,143,181,0.08)",
    head: "#00ff88",
    bodyFrom: "#00ff88",
    bodyTo: "#00f5ff",
    dead: "#ff006e",
    fruitFallback: "#ff006e",
    text: "#e6e9ff",
    textDim: "#8a8fb5",
    glow: 1,
  },
  // Synthwave: serpiente cian que se vuelve magenta hacia la cola, rejilla
  // magenta, destello amarillo y glow alto.
  neon: {
    background: "#07020f",
    grid: "rgba(255,43,214,0.12)",
    head: "#00f5ff",
    bodyFrom: "#00f5ff",
    bodyTo: "#ff2bd6",
    dead: "#f5ff00",
    fruitFallback: "#f5ff00",
    text: "#f5ff00",
    textDim: "#b8a6ff",
    glow: 1.75,
  },
  // 8-bit: subconjunto de la paleta PICO-8 sobre negro, colores planos y sin glow.
  retro: {
    background: "#000000",
    grid: "rgba(29,43,83,0.55)",
    head: "#00e436",
    bodyFrom: "#00e436",
    bodyTo: "#008751",
    dead: "#ff004d",
    fruitFallback: "#29adff",
    text: "#fff1e8",
    textDim: "#c2c3c7",
    glow: 0,
  },
};

/** Alias de la skin por defecto. */
export const COLORS = SKINS[DEFAULT_SKIN];

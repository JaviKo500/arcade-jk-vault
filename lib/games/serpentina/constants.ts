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

// Paleta neón de la plataforma.
export const COLORS = {
  background: "#0a0a0f",
  grid: "rgba(138,143,181,0.08)",
  head: "#00ff88",
  bodyFrom: "#00ff88",
  bodyTo: "#00f5ff",
  dead: "#ff006e",
  fruitFallback: "#ff006e",
  text: "#e6e9ff",
  textDim: "#8a8fb5",
} as const;

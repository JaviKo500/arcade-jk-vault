import type { SkinId } from "../types";

// Espacio lógico del canvas, independiente de su tamaño CSS.
export const W = 800;
export const H = 600;

// Tablero en celdas y su posición en el canvas (centrado, alto completo).
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30; // px por celda
export const BOARD_X = 250;
export const BOARD_Y = 0;

// 1..8 = I, O, T, S, Z, J, L y la tuerca N.
export type PieceType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const PIECE_COUNT = 8;

// Matrices del original, en el mismo orden. Cada celda vale 0 o el índice de color.
export const PIECES: readonly (readonly (readonly number[])[] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

// Puntos por 0, 1, 2, 3 o 4 líneas limpiadas, multiplicados por el nivel.
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;

// Desplazamientos horizontales que se prueban al rotar.
export const KICKS = [0, -1, 1, -2, 2] as const;

// Tope para que la puntuación siempre quepa en `scores.score`.
export const MAX_SCORE = 10_000_000;
export const MAX_DT = 0.05; // s

/** Marca interior de un bloque: pista para distinguir piezas sin depender del color. */
export type PieceMark = "plain" | "dot" | "frame";

export type CaidaPalette = {
  /** Fondo del canvas (paneles laterales). */
  background: string;
  /** Fondo del tablero. */
  well: string;
  /** Línea de la rejilla del tablero (decorativa). */
  grid: string;
  /** Raíles del pozo y títulos de los paneles. */
  accent: string;
  /** Contorno de las teclas y de la caja de SIGUIENTE (decorativo). */
  keycap: string;
  text: string;
  textDim: string;
  /** Indexado de 1 a 8, igual que PIECES (I, O, T, S, Z, J, L, N). */
  pieces: readonly string[];
  /** Marca de cada pieza, mismo índice que `pieces`. */
  marks: readonly PieceMark[];
  /** Color de las marcas `dot`/`frame`. */
  mark: string;
  /** Brillo de la franja superior de cada bloque (0 = bloque plano). */
  highlight: string;
  highlightAlpha: number;
  /** Opacidad de la pieza fantasma (dónde aterrizará). */
  ghostAlpha: number;
  /** Multiplicador del `shadowBlur` de raíles y textos (0 = sin glow). */
  glow: number;
};

export const DEFAULT_SKIN: SkinId = "classic";

const PLAIN_MARKS: readonly PieceMark[] = [
  "plain",
  "plain",
  "plain",
  "plain",
  "plain",
  "plain",
  "plain",
  "plain",
  "plain",
];

// Lisa: I, O, T, L · punto: S, Z · marco: J, N. Separa los pares que se
// confunden con daltonismo (T/J/Z, I/N, O/S, S/L) aunque el color se parezca.
const SHAPE_MARKS: readonly PieceMark[] = [
  "plain",
  "plain", // I
  "plain", // O
  "plain", // T
  "dot", // S
  "dot", // Z
  "frame", // J
  "plain", // L
  "frame", // N
];

export const SKINS: Record<SkinId, CaidaPalette> = {
  // Paleta original: tokens neón de la plataforma, ampliada a 8 colores de pieza.
  classic: {
    background: "#0a0a0f",
    well: "#0e0e18",
    grid: "rgba(230, 233, 255, 0.06)",
    accent: "#ff006e", // acento magenta de CAÍDA: raíles, títulos
    keycap: "rgba(230, 233, 255, 0.35)",
    text: "#e6e9ff",
    textDim: "#8a8fb5",
    pieces: [
      "",
      "#00f5ff", // I - cyan
      "#f5ff00", // O - amarillo
      "#aa00ff", // T - violeta
      "#00ff88", // S - verde
      "#ff006e", // Z - magenta
      "#3d7bff", // J - azul
      "#ff7700", // L - naranja
      "#8a8fb5", // N - tuerca, gris metálico
    ],
    marks: PLAIN_MARKS,
    mark: "#0e0e18",
    highlight: "#ffffff",
    highlightAlpha: 0.12,
    ghostAlpha: 0.2,
    glow: 1,
  },
  // Synthwave: pozo morado, raíles magenta, texto amarillo y glow alto.
  neon: {
    background: "#07020f",
    well: "#0c0418",
    grid: "rgba(255, 43, 214, 0.1)",
    accent: "#ff2bd6",
    keycap: "rgba(0, 245, 255, 0.45)",
    text: "#f5ff00",
    textDim: "#b8a6ff",
    pieces: [
      "",
      "#00f5ff", // I - cian
      "#f5ff00", // O - amarillo
      "#c64bff", // T - violeta
      "#39ff14", // S - verde lima
      "#ff2bd6", // Z - rosa
      "#4d8bff", // J - azul
      "#ff8c1a", // L - naranja
      "#e6e9ff", // N - tuerca, cromo
    ],
    marks: SHAPE_MARKS,
    mark: "#0c0418",
    highlight: "#ffffff",
    highlightAlpha: 0.22,
    ghostAlpha: 0.25,
    glow: 1.75,
  },
  // 8-bit: paleta PICO-8 sobre negro, bloques planos con marcas tipo NES, sin glow.
  retro: {
    background: "#000000",
    well: "#000000",
    grid: "rgba(29, 43, 83, 0.7)",
    accent: "#ff004d",
    keycap: "#83769c",
    text: "#fff1e8",
    textDim: "#c2c3c7",
    pieces: [
      "",
      "#29adff", // I - azul
      "#ffec27", // O - amarillo
      "#ff77a8", // T - rosa
      "#00e436", // S - verde
      "#ff004d", // Z - rojo
      "#83769c", // J - lavanda
      "#ffa300", // L - naranja
      "#c2c3c7", // N - tuerca, gris
    ],
    marks: SHAPE_MARKS,
    mark: "#000000",
    highlight: "#ffffff",
    highlightAlpha: 0,
    ghostAlpha: 0.35,
    glow: 0,
  },
};

/** Alias de la skin por defecto. */
export const COLORS = SKINS[DEFAULT_SKIN];

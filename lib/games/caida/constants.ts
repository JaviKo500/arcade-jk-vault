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

// Paleta neón de la plataforma, ampliada a 8 colores de pieza.
export const COLORS = {
  background: "#0a0a0f",
  well: "#0e0e18", // fondo del tablero
  grid: "rgba(230, 233, 255, 0.06)",
  accent: "#ff006e", // acento magenta de CAÍDA: raíles, títulos
  keycap: "rgba(230, 233, 255, 0.35)",
  text: "#e6e9ff",
  textDim: "#8a8fb5",
  // Indexado de 1 a 8, igual que PIECES.
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
} as const;

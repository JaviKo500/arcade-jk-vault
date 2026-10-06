// Los 7 colores de bloque del original; la paleta real está en COLORS.blocks.
export type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";

export type LevelBlock = { col: number; row: number; color: BlockColor };
export type Level = { speed: number; blocks: readonly LevelBlock[] };

const COLS = 10;
const ROWS = 6;

// Recorre la rejilla 10×6 y deja los bloques para los que `pick` devuelve un color.
function grid(
  pick: (col: number, row: number) => BlockColor | null,
): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const color = pick(col, row);
      if (color) blocks.push({ col, row, color });
    }
  }
  return blocks;
}

const ROW_COLORS_1: readonly BlockColor[] = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
];
const ROW_COLORS_2: readonly BlockColor[] = [
  "gray",
  "cyan",
  "hotpink",
  "yellow",
  "magenta",
  "green",
];
const ROW_COLORS_4: readonly BlockColor[] = [
  "cyan",
  "magenta",
  "green",
  "yellow",
  "hotpink",
  "red",
];

// Nivel 2: columnas inicial y final de la pirámide en cada fila.
const PYRAMID_START = [4, 3, 2, 1, 0, 0];
const PYRAMID_END = [5, 6, 7, 8, 9, 9];

// Nivel 4: columnas vacías en cada fila.
const GAPS_4: readonly (readonly number[])[] = [
  [2, 5, 8],
  [0, 4, 7, 9],
  [1, 3, 6],
  [2, 5, 8, 9],
  [0, 4, 7],
  [1, 3, 6, 9],
];

// Mismos patrones y velocidades que references/04-arkanoid/levels.js.
export const LEVELS: readonly Level[] = [
  // 1 · Parrilla completa (60)
  { speed: 1.0, blocks: grid((_, row) => ROW_COLORS_1[row]) },
  // 2 · Pirámide centrada (40)
  {
    speed: 1.1,
    blocks: grid((col, row) =>
      col >= PYRAMID_START[row] && col <= PYRAMID_END[row]
        ? ROW_COLORS_2[row]
        : null,
    ),
  },
  // 3 · Tablero de ajedrez (30)
  {
    speed: 1.21,
    blocks: grid((col, row) =>
      (col + row) % 2 === 0 ? (row < 3 ? "yellow" : "magenta") : null,
    ),
  },
  // 4 · Filas con huecos (39)
  {
    speed: 1.33,
    blocks: grid((col, row) =>
      GAPS_4[row].includes(col) ? null : ROW_COLORS_4[row],
    ),
  },
  // 5 · Marco + cruz central (39)
  {
    speed: 1.46,
    blocks: grid((col, row) => {
      const isFrame =
        col === 0 || col === COLS - 1 || row === 0 || row === ROWS - 1;
      const isCross = col === 4 || row === 2;
      if (!isFrame && !isCross) return null;
      return isCross && !isFrame ? "hotpink" : "cyan";
    }),
  },
];

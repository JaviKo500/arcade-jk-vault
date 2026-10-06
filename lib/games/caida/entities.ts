import {
  COLORS,
  COLS,
  PIECE_COUNT,
  PIECES,
  ROWS,
  type PieceType,
} from "./constants";

// ROWS × COLS; 0 = vacía, 1..8 = índice de color.
export type Board = number[][];

export type Piece = {
  type: PieceType;
  shape: number[][]; // matriz cuadrada; cada celda vale 0 o el índice de color
  x: number; // columna de la esquina superior izquierda
  y: number; // fila de la esquina superior izquierda
};

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

// Las 8 piezas son equiprobables, como en el original.
export function randomPiece(): Piece {
  const type = (Math.floor(Math.random() * PIECE_COUNT) + 1) as PieceType;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

export function collide(
  board: Board,
  shape: number[][],
  x: number,
  y: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c;
      const ny = y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

// Fija la pieza en el tablero.
export function merge(board: Board, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        board[piece.y + r][piece.x + c] = piece.shape[r][c];
}

// Quita las filas completas y devuelve cuántas se limpiaron.
export function clearFullRows(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++; // la fila que bajó ocupa ahora la posición r
    }
  }
  return cleared;
}

// Fila en la que aterrizaría la pieza si cayera en vertical.
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}

// `px`/`py` son la esquina superior izquierda de la celda, en píxeles lógicos.
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  colorIndex: number,
  size: number,
  alpha = 1,
): void {
  if (!colorIndex) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS.pieces[colorIndex];
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  // brillo superior
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(px + 1, py + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}

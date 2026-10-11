import {
  CELL,
  COLORS,
  COLS,
  FRUIT_SPRITES,
  H,
  INITIAL_LENGTH,
  ROWS,
  W,
} from "./constants";

export type Direction = "up" | "down" | "left" | "right";

// 0 ≤ col < COLS, 0 ≤ row < ROWS. Origen arriba a la izquierda.
export type Cell = { col: number; row: number };

export type Fruit = {
  cell: Cell;
  sprite: number; // índice en FRUIT_SPRITES
};

const DELTAS: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

// Cabeza primero, en el centro y mirando a la derecha: [(20,15), (19,15), (18,15)].
export function initialSnake(): Cell[] {
  const col = Math.floor(COLS / 2);
  const row = Math.floor(ROWS / 2);
  return Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
    col: col - i,
    row,
  }));
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b;
}

export function nextHead(head: Cell, direction: Direction): Cell {
  const d = DELTAS[direction];
  return { col: head.col + d.col, row: head.row + d.row };
}

// Si la serpiente no crece en este paso, la cola se recorta y su celda queda libre.
export function hitsWallOrBody(
  head: Cell,
  snake: Cell[],
  willGrow: boolean,
): boolean {
  if (head.col < 0 || head.col >= COLS || head.row < 0 || head.row >= ROWS)
    return true;
  const body = willGrow ? snake.length : snake.length - 1;
  for (let i = 0; i < body; i++) {
    if (snake[i].col === head.col && snake[i].row === head.row) return true;
  }
  return false;
}

// Elige al azar entre las celdas libres. `null` si el tablero está lleno.
export function spawnFruit(snake: Cell[], random: () => number): Fruit | null {
  const occupied = new Set(snake.map((c) => c.row * COLS + c.col));
  const free: number[] = [];
  for (let i = 0; i < COLS * ROWS; i++) if (!occupied.has(i)) free.push(i);
  if (free.length === 0) return null;
  const index = free[Math.floor(random() * free.length)];
  return {
    cell: { col: index % COLS, row: Math.floor(index / COLS) },
    sprite: Math.floor(random() * FRUIT_SPRITES.length),
  };
}

export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    ctx.moveTo(c * CELL + 0.5, 0);
    ctx.lineTo(c * CELL + 0.5, H);
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.moveTo(0, r * CELL + 0.5);
    ctx.lineTo(W, r * CELL + 0.5);
  }
  ctx.stroke();
}

// Grosor del tubo: cada segmento deja un margen de SNAKE_INSET px en la celda.
const SNAKE_INSET = 3;
const HEAD_INSET = 2;
const HEAD_GLOW = 14;

// Tubo de luz continuo: los segmentos se unen con puentes del mismo grosor.
// Sin `color`, cabeza `head` con brillo y cuerpo en degradado de `bodyFrom`
// (junto a la cabeza) a `bodyTo` (cola). Con `color` (p. ej. `dead`), toda la
// serpiente de ese color.
export function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: Cell[],
  color?: string,
): void {
  if (snake.length === 0) return;
  const size = CELL - SNAKE_INSET * 2;
  const colorAt = (i: number) =>
    color ??
    mixHex(COLORS.bodyFrom, COLORS.bodyTo, i / Math.max(snake.length - 1, 1));

  ctx.save();
  // Cuerpo, de la cola hacia la cabeza
  for (let i = snake.length - 1; i >= 1; i--) {
    const cell = snake[i];
    const toward = snake[i - 1];
    ctx.fillStyle = colorAt(i);
    const x = cell.col * CELL + SNAKE_INSET;
    const y = cell.row * CELL + SNAKE_INSET;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 3);
    ctx.fill();
    // Puente hacia el segmento siguiente (más cerca de la cabeza)
    const bx = Math.min(cell.col, toward.col) * CELL + SNAKE_INSET;
    const by = Math.min(cell.row, toward.row) * CELL + SNAKE_INSET;
    const horizontal = cell.row === toward.row;
    ctx.fillRect(
      bx + (horizontal ? size / 2 : 0),
      by + (horizontal ? 0 : size / 2),
      horizontal ? CELL : size,
      horizontal ? size : CELL,
    );
  }

  // Cabeza, algo más ancha y con brillo
  const head = snake[0];
  const headColor = color ?? COLORS.head;
  const hx = head.col * CELL + HEAD_INSET;
  const hy = head.row * CELL + HEAD_INSET;
  const hs = CELL - HEAD_INSET * 2;
  ctx.shadowColor = headColor;
  ctx.shadowBlur = HEAD_GLOW;
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.roundRect(hx, hy, hs, hs, 5);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Ojos mirando hacia donde avanza (a la derecha si solo hay cabeza)
  const dx = snake.length > 1 ? head.col - snake[1].col : 1;
  const dy = snake.length > 1 ? head.row - snake[1].row : 0;
  const cx = head.col * CELL + CELL / 2;
  const cy = head.row * CELL + CELL / 2;
  const eye = 3;
  const forward = 3;
  const spread = 4;
  ctx.fillStyle = COLORS.background;
  for (const side of [-1, 1]) {
    const ex = cx + dx * forward + (dy !== 0 ? side * spread : 0);
    const ey = cy + dy * forward + (dx !== 0 ? side * spread : 0);
    ctx.fillRect(Math.round(ex - eye / 2), Math.round(ey - eye / 2), eye, eye);
  }
  ctx.restore();
}

// `image` es `null` si no cargó o falló: se dibuja el núcleo de respaldo.
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  fruit: Fruit,
): void {
  const x = fruit.cell.col * CELL;
  const y = fruit.cell.row * CELL;
  const sprite = FRUIT_SPRITES[fruit.sprite];
  if (!image || !image.complete || image.naturalWidth === 0 || !sprite) {
    ctx.save();
    ctx.fillStyle = COLORS.fruitFallback;
    ctx.shadowColor = COLORS.fruitFallback;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x + CELL / 2, y + CELL / 2, CELL * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // Escala proporcional que cabe en la celda, centrada.
  const scale = Math.min(CELL / sprite.w, CELL / sprite.h);
  const dw = sprite.w * scale;
  const dh = sprite.h * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    image,
    sprite.x,
    sprite.y,
    sprite.w,
    sprite.h,
    x + (CELL - dw) / 2,
    y + (CELL - dh) / 2,
    dw,
    dh,
  );
  ctx.restore();
}

// Interpola dos colores `#rrggbb`.
function mixHex(from: string, to: string, t: number): string {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const ch = (v: number, shift: number) => (v >> shift) & 0xff;
  const mix = (shift: number) =>
    Math.round(ch(a, shift) + (ch(b, shift) - ch(a, shift)) * t);
  return `rgb(${mix(16)},${mix(8)},${mix(0)})`;
}

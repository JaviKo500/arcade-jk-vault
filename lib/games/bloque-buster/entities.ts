import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  COLORS,
  EXPLOSION_DURATION,
} from "./constants";
import type { BlockColor, Level } from "./levels";

export type Rect = { x: number; y: number; w: number; h: number };
export type Block = Rect & { color: BlockColor; alive: boolean };
export type Ball = Rect & { vx: number; vy: number }; // px/s
export type Explosion = Rect & { color: BlockColor; elapsed: number }; // elapsed en segundos

export function buildBlocks(level: Level): Block[] {
  return level.blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
}

// Coloca la pelota centrada sobre la pala con la velocidad base × `speed`.
export function resetBall(ball: Ball, paddle: Rect, speed: number): void {
  ball.w = BALL_SIZE;
  ball.h = BALL_SIZE;
  ball.x = paddle.x + (paddle.w - ball.w) / 2;
  ball.y = paddle.y - ball.h;
  ball.vx = BASE_BALL_VX * speed;
  ball.vy = BASE_BALL_VY * speed;
}

export function collideAABB(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// Estética "tubo de neón": interior oscuro teñido, contorno luminoso con
// resplandor y un filo de brillo arriba. Todo con primitivas, sin imágenes.

export function drawPaddle(ctx: CanvasRenderingContext2D, paddle: Rect): void {
  const { x, y, w, h } = paddle;
  const r = h / 2;
  ctx.save();
  ctx.shadowColor = COLORS.paddle;
  ctx.shadowBlur = 18;
  ctx.fillStyle = COLORS.paddle;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  // Línea central incandescente
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillRect(x + r, y + h / 2 - 1, w - r * 2, 2);
}

export function drawBall(ctx: CanvasRenderingContext2D, ball: Rect): void {
  const cx = ball.x + ball.w / 2;
  const cy = ball.y + ball.h / 2;
  const r = ball.w / 2;
  ctx.save();
  ctx.shadowColor = COLORS.paddle;
  ctx.shadowBlur = 14;
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Reflejo
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// Un bloque roto deja su hueco: un contorno discontinuo casi invisible que
// mantiene legible el patrón del nivel.
export function drawBlock(ctx: CanvasRenderingContext2D, block: Block): void {
  const color = COLORS.blocks[block.color];
  const x = block.x + 3;
  const y = block.y + 3;
  const w = block.w - 6;
  const h = block.h - 6;

  ctx.save();
  if (!block.alive) {
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();
    return;
  }

  // Interior teñido
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  // Tubo luminoso
  ctx.globalAlpha = 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();

  // Filo de brillo superior
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.fillRect(x + 4, y + 4, w - 8, 1);
}

// Direcciones fijas de las esquirlas (unitarias, aplanadas en vertical como el bloque).
const SHARDS: readonly [number, number][] = [
  [-1, -0.6],
  [0, -1],
  [1, -0.6],
  [1, 0.6],
  [0, 1],
  [-1, 0.6],
];

// 4 fases en EXPLOSION_DURATION, como los 4 frames del original:
// 0 destello · 1 onda + esquirlas · 2 esquirlas lejos · 3 chispas.
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  explosion: Explosion,
  color: string,
): void {
  const phase = Math.min(
    Math.floor((explosion.elapsed / EXPLOSION_DURATION) * 4),
    3,
  );
  const { x, y, w, h } = explosion;
  const cx = x + w / 2;
  const cy = y + h / 2;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;

  if (phase === 0) {
    // Destello: el bloque se enciende al blanco
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
    ctx.restore();
    return;
  }

  // Onda: el contorno se expande y se apaga
  if (phase < 3) {
    const grow = phase * 5;
    ctx.globalAlpha = phase === 1 ? 0.8 : 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - grow, y - grow, w + grow * 2, h + grow * 2);
  }

  // Esquirlas que se alejan y se encogen hasta quedar en chispas
  const dist = [0, 14, 26, 36][phase];
  const size = [0, 6, 4, 3][phase];
  ctx.globalAlpha = [1, 1, 0.75, 0.5][phase];
  ctx.fillStyle = phase === 3 ? "#ffffff" : color;
  for (const [dx, dy] of SHARDS) {
    const sx = cx + dx * (w / 2 + dist);
    const sy = cy + dy * (h / 2 + dist * 0.5);
    ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
  }
  ctx.restore();
}

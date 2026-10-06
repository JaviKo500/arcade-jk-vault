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

export function drawPaddle(ctx: CanvasRenderingContext2D, paddle: Rect): void {
  ctx.fillStyle = COLORS.paddle;
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
}

export function drawBall(ctx: CanvasRenderingContext2D, ball: Rect): void {
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.arc(ball.x + ball.w / 2, ball.y + ball.h / 2, ball.w / 2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBlock(ctx: CanvasRenderingContext2D, block: Block): void {
  ctx.fillStyle = COLORS.blocks[block.color];
  ctx.fillRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2);
}

// 4 fases en EXPLOSION_DURATION, como los 4 frames del original.
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  explosion: Explosion,
  color: string,
): void {
  const phase = Math.min(
    Math.floor((explosion.elapsed / EXPLOSION_DURATION) * 4),
    3,
  );
  const shrink = (phase + 1) * 4;
  ctx.globalAlpha = 1 - phase / 4;
  ctx.fillStyle = color;
  ctx.fillRect(
    explosion.x + shrink,
    explosion.y + shrink / 2,
    explosion.w - shrink * 2,
    explosion.h - shrink,
  );
  ctx.globalAlpha = 1;
}

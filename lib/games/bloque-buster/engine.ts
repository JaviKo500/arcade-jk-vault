import type { GameCallbacks, GameFactory, GameInstance } from "../types";
import {
  BALL_SIZE,
  COLORS,
  EXPLOSION_DURATION,
  H,
  INITIAL_LIVES,
  MAX_DT,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_TOLERANCE,
  PADDLE_W,
  PADDLE_Y,
  POINTS_PER_BLOCK,
  W,
} from "./constants";
import {
  type Ball,
  type Block,
  type Explosion,
  type Rect,
  buildBlocks,
  collideAABB,
  resetBall,
} from "./entities";
import { LEVELS } from "./levels";

// Motor de BLOQUE BUSTER: port del loop, la física, los niveles y las vidas de
// references/04-arkanoid/game.js. Todo el estado vive en la instancia.

type Phase = "ready" | "playing" | "gameover";
// "ready": pantalla "PULSA ESPACIO PARA EMPEZAR", con el nivel 1, la pala centrada y la pelota encima
// "playing": partida en curso (la pausa es un flag aparte, como en ASTEROIDS y CAÍDA)
// "gameover": sin vidas, nivel 5 completado o llamada a end(). Ya se llamó a onGameOver

type EngineState = {
  phase: Phase;
  paused: boolean;
  inputEnabled: boolean;
  keys: { left: boolean; right: boolean }; // se ponen a false al pausar
  paddle: Rect;
  ball: Ball;
  blocks: Block[];
  explosions: Explosion[];
  score: number;
  lives: number;
  level: number; // de 1 a LEVELS.length
};

export const createBloqueBusterGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameInstance => {
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  // ── Estado ──────────────────────────────────────────────────────────────────
  const state: EngineState = createInitialState();

  // Último valor notificado a la plataforma: los callbacks solo se llaman
  // cuando el valor cambia, nunca en cada frame.
  const reported: {
    score: number | null;
    lives: number | null;
    level: number | null;
    paused: boolean | null;
  } = { score: null, lives: null, level: null, paused: null };

  function createInitialState(): EngineState {
    const paddle: Rect = {
      x: (W - PADDLE_W) / 2,
      y: PADDLE_Y,
      w: PADDLE_W,
      h: PADDLE_H,
    };
    const ball: Ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
    resetBall(ball, paddle, LEVELS[0].speed);
    return {
      phase: "ready",
      paused: false,
      inputEnabled: true,
      keys: { left: false, right: false },
      paddle,
      ball,
      blocks: buildBlocks(LEVELS[0]),
      explosions: [],
      score: 0,
      lives: INITIAL_LIVES,
      level: 1,
    };
  }

  function sync() {
    if (reported.score !== state.score) {
      reported.score = state.score;
      callbacks.onScore(state.score);
    }
    if (reported.lives !== state.lives) {
      reported.lives = state.lives;
      callbacks.onLives(state.lives);
    }
    if (reported.level !== state.level) {
      reported.level = state.level;
      callbacks.onLevel(state.level);
    }
    if (reported.paused !== state.paused) {
      reported.paused = state.paused;
      callbacks.onPauseChange(state.paused);
    }
  }

  // ── Reglas ──────────────────────────────────────────────────────────────────
  function gameOver() {
    state.phase = "gameover";
    sync();
    callbacks.onGameOver(state.score);
  }

  // Carga el nivel `n` (1..5) y recoloca la pelota sobre la pala. La puntuación se conserva.
  function loadLevel(n: number) {
    const level = LEVELS[n - 1];
    state.level = n;
    state.blocks = buildBlocks(level);
    state.explosions = [];
    resetBall(state.ball, state.paddle, level.speed);
  }

  function breakBlock(block: Block) {
    block.alive = false;
    const { x, y, w, h, color } = block;
    state.explosions.push({ x, y, w, h, color, elapsed: 0 });
    state.score += POINTS_PER_BLOCK;
    state.ball.vy = -state.ball.vy;

    if (state.blocks.every((b) => !b.alive)) {
      if (state.level < LEVELS.length) loadLevel(state.level + 1);
      else gameOver();
    }
  }

  function loseLife() {
    state.lives--;
    if (state.lives <= 0) {
      state.lives = 0;
      gameOver();
    } else {
      // Relanzamiento inmediato desde la pala, como el original
      resetBall(state.ball, state.paddle, LEVELS[state.level - 1].speed);
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state.phase !== "playing") return;
    const { paddle, ball, keys } = state;

    // Pala
    if (keys.left) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.right)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    // Pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Rebotes en las paredes izquierda, derecha y superior
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    // Rebote en la pala: solo se invierte vy, con tolerancia por debajo del borde
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + PADDLE_TOLERANCE
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }

    // Bloques: como máximo uno por frame
    const hit = state.blocks.find((b) => b.alive && collideAABB(ball, b));
    if (hit) {
      breakBlock(hit);
      if (state.phase !== "playing") return;
    }

    // Explosiones
    for (const exp of state.explosions) exp.elapsed += dt;
    state.explosions = state.explosions.filter(
      (exp) => exp.elapsed < EXPLOSION_DURATION,
    );

    // Pelota perdida
    if (ball.y > H) loseLife();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  // Provisional: el dibujo completo llega en el paso 4.
  function draw() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let destroyed = false;

  function loop(ts: number) {
    if (state.paused) {
      // Al reanudar, el primer dt vuelve a ser 0
      lastTime = null;
    } else {
      const dt =
        lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
      lastTime = ts;
      update(dt);
    }
    sync();
    // Un callback pudo haber destruido la instancia durante este frame
    if (destroyed) return;
    draw();
    rafId = requestAnimationFrame(loop);
  }

  // ── API de control ──────────────────────────────────────────────────────────
  // Entrada, pausa, reinicio y limpieza completa llegan en el paso 5.
  function start() {
    if (destroyed || rafId !== null) return;
    lastTime = null;
    sync();
    rafId = requestAnimationFrame(loop);
  }

  function end() {
    if (state.phase === "gameover") return;
    state.paused = false;
    gameOver();
  }

  function destroy() {
    destroyed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  const notYet = () => {};

  return {
    start,
    pause: notYet,
    resume: notYet,
    restart: notYet,
    end,
    setInputEnabled: notYet,
    destroy,
  };
};

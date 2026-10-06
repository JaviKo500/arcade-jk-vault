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
  drawBall,
  drawBlock,
  drawExplosion,
  drawPaddle,
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

/** Pila de fuentes de la plataforma, con `monospace` de respaldo. */
function resolveFontFamily(canvas: HTMLCanvasElement): string {
  const family = getComputedStyle(canvas)
    .getPropertyValue("--font-press-start-2p")
    .trim();
  return family ? `${family}, monospace` : "monospace";
}

export const createBloqueBusterGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameInstance => {
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = ctxOrNull;
  const fontFamily = resolveFontFamily(canvas);
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

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
  // Sin puntuación, vidas, nivel ni overlays: eso lo muestra la plataforma.
  function text(
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
    glow = 0,
  ) {
    ctx.save();
    ctx.font = `${size}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
    }
    ctx.fillText(value, x, y);
    ctx.restore();
  }

  // Entre la última fila de bloques (y = 224) y la pala (y = 560)
  function drawStartScreen() {
    const cx = W / 2;
    text("BLOQUE BUSTER", cx, 330, 28, COLORS.paddle, 16);
    // Parpadeo de máquina arcade, salvo con movimiento reducido
    const visible =
      reducedMotion || Math.floor(performance.now() / 500) % 2 === 0;
    if (visible)
      text("PULSA ESPACIO PARA EMPEZAR", cx, 390, 14, COLORS.text, 8);
  }

  function draw() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    for (const block of state.blocks) drawBlock(ctx, block);
    for (const exp of state.explosions)
      drawExplosion(ctx, exp, COLORS.blocks[exp.color]);
    drawPaddle(ctx, state.paddle);
    drawBall(ctx, state.ball);

    if (state.phase === "ready") drawStartScreen();
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

  // ── Entrada ─────────────────────────────────────────────────────────────────
  // Teclas que la página no debe usar para hacer scroll mientras se juega
  const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "Space"]);

  function onKeyDown(e: KeyboardEvent) {
    // Con la entrada desactivada (modal abierto) no se toca el evento, para
    // que el input de iniciales funcione con normalidad.
    if (!state.inputEnabled) return;

    if (e.code === "KeyP" || e.code === "Escape") {
      if (!e.repeat && state.phase === "playing") togglePause();
      return;
    }

    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (state.paused || state.phase === "gameover") return;

    if (e.code === "ArrowLeft") state.keys.left = true;
    else if (e.code === "ArrowRight") state.keys.right = true;
    else if (state.phase === "ready" && !e.repeat) {
      state.phase = "playing";
      lastTime = null;
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (!state.inputEnabled) return;
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (e.code === "ArrowLeft") state.keys.left = false;
    else if (e.code === "ArrowRight") state.keys.right = false;
  }

  // La pala sigue al ratón, en coordenadas lógicas aunque el canvas esté escalado.
  function onMouseMove(e: MouseEvent) {
    if (!state.inputEnabled || state.paused || state.phase === "gameover")
      return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const mouseX = (e.clientX - rect.left) * (W / rect.width);
    const { paddle } = state;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
    // En la pantalla de inicio la pelota acompaña a la pala
    if (state.phase === "ready")
      resetBall(state.ball, paddle, LEVELS[state.level - 1].speed);
  }

  function onVisibilityChange() {
    if (document.hidden) pause();
  }

  // ── API de control ──────────────────────────────────────────────────────────
  function start() {
    if (destroyed || rafId !== null) return;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    document.addEventListener("visibilitychange", onVisibilityChange);
    lastTime = null;
    sync();
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    if (state.phase === "gameover" || state.paused) return;
    state.paused = true;
    // El keyup puede perderse (pestaña oculta): sin esto la pala se movería sola
    state.keys.left = false;
    state.keys.right = false;
    sync();
  }

  function resume() {
    if (state.phase === "gameover" || !state.paused) return;
    state.paused = false;
    lastTime = null;
    sync();
  }

  function togglePause() {
    if (state.paused) resume();
    else pause();
  }

  // Nivel 1 completo, score 0, 3 vidas y vuelta a la pantalla de inicio
  function restart() {
    const { inputEnabled } = state;
    Object.assign(state, createInitialState(), { inputEnabled });
    lastTime = null;
    sync();
  }

  function end() {
    if (state.phase === "gameover") return;
    state.paused = false;
    gameOver();
  }

  function setInputEnabled(enabled: boolean) {
    state.inputEnabled = enabled;
    if (!enabled) {
      state.keys.left = false;
      state.keys.right = false;
    }
  }

  function destroy() {
    destroyed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { start, pause, resume, restart, end, setInputEnabled, destroy };
};

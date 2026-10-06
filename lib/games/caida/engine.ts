import type { GameCallbacks, GameFactory, GameInstance } from "../types";
import {
  COLORS,
  H,
  KICKS,
  LINE_SCORES,
  MAX_DT,
  MAX_SCORE,
  W,
} from "./constants";
import {
  type Board,
  type Piece,
  clearFullRows,
  collide,
  createBoard,
  ghostY,
  merge,
  randomPiece,
  rotateCW,
} from "./entities";

// Motor de CAÍDA: port del loop, la caída, las líneas y la puntuación de
// references/03-tetris/game.js. Todo el estado vive en la instancia.

type Phase = "ready" | "playing" | "gameover";
// "ready": pantalla "PULSA ESPACIO PARA EMPEZAR", con el tablero vacío
// "playing": partida en curso (la pausa es un flag aparte)
// "gameover": la pieza nueva colisionó al aparecer, o se llamó a end(); ya se llamó a onGameOver

type EngineState = {
  phase: Phase;
  paused: boolean;
  inputEnabled: boolean;
  board: Board;
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  dropAccum: number; // s
  dropInterval: number; // s
};

/** Intervalo de caída en segundos: el `max(100, 1000 − (nivel − 1) × 90)` ms del original. */
function dropIntervalFor(level: number): number {
  return Math.max(0.1, 1 - (level - 1) * 0.09);
}

export const createCaidaGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameInstance => {
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  // ── Estado ──────────────────────────────────────────────────────────────────
  const state: EngineState = createInitialState();

  // Último valor notificado a la plataforma: los callbacks solo se llaman
  // cuando el valor cambia, nunca en cada frame. `onLives` no se usa: CAÍDA
  // no tiene vidas.
  const reported: {
    score: number | null;
    level: number | null;
    paused: boolean | null;
  } = { score: null, level: null, paused: null };

  function createInitialState(): EngineState {
    return {
      phase: "ready",
      paused: false,
      inputEnabled: true,
      board: createBoard(),
      current: randomPiece(),
      next: randomPiece(),
      score: 0,
      lines: 0,
      level: 1,
      dropAccum: 0,
      dropInterval: dropIntervalFor(1),
    };
  }

  function sync() {
    if (reported.score !== state.score) {
      reported.score = state.score;
      callbacks.onScore(state.score);
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
  // Único punto donde cambia la puntuación, con el tope de `scores.score`.
  function addScore(points: number) {
    state.score = Math.min(state.score + points, MAX_SCORE);
  }

  function gameOver() {
    state.phase = "gameover";
    sync();
    callbacks.onGameOver(state.score);
  }

  function spawn() {
    state.current = state.next;
    state.next = randomPiece();
    const { current } = state;
    if (collide(state.board, current.shape, current.x, current.y)) gameOver();
  }

  function clearLines() {
    const cleared = clearFullRows(state.board);
    if (!cleared) return;
    state.lines += cleared;
    // Puntos con el nivel previo a la jugada; el nivel se recalcula después
    addScore((LINE_SCORES[cleared] ?? 0) * state.level);
    state.level = Math.floor(state.lines / 10) + 1;
    state.dropInterval = dropIntervalFor(state.level);
  }

  function lockPiece() {
    merge(state.board, state.current);
    clearLines();
    spawn();
  }

  function softDrop() {
    const { current } = state;
    if (!collide(state.board, current.shape, current.x, current.y + 1)) {
      current.y++;
      addScore(1);
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    const { current } = state;
    const gy = ghostY(state.board, current);
    addScore((gy - current.y) * 2);
    current.y = gy;
    lockPiece();
  }

  function tryRotate() {
    const { current } = state;
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(state.board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state.phase !== "playing") return;

    state.dropAccum += dt;
    if (state.dropAccum >= state.dropInterval) {
      // Como el original: se pone a 0, no se resta el intervalo
      state.dropAccum = 0;
      const { current } = state;
      if (!collide(state.board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
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
  function start() {
    if (destroyed || rafId !== null) return;
    lastTime = null;
    sync();
    rafId = requestAnimationFrame(loop);
  }

  function pause() {
    if (state.phase === "gameover" || state.paused) return;
    state.paused = true;
    sync();
  }

  function resume() {
    if (state.phase === "gameover" || !state.paused) return;
    state.paused = false;
    lastTime = null;
    sync();
  }

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
  }

  function destroy() {
    destroyed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Se conectan a la entrada de teclado en el paso 6
  void softDrop;
  void hardDrop;
  void tryRotate;

  return { start, pause, resume, restart, end, setInputEnabled, destroy };
};

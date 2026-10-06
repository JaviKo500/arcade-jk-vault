import type { GameCallbacks, GameFactory, GameInstance } from "../types";
import {
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLORS,
  COLS,
  H,
  KICKS,
  LINE_SCORES,
  MAX_DT,
  MAX_SCORE,
  ROWS,
  W,
} from "./constants";
import {
  type Board,
  type Piece,
  clearFullRows,
  collide,
  createBoard,
  drawBlock,
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

/** Pila de fuentes de la plataforma, con `monospace` de respaldo. */
function resolveFontFamily(canvas: HTMLCanvasElement): string {
  const family = getComputedStyle(canvas)
    .getPropertyValue("--font-press-start-2p")
    .trim();
  return family ? `${family}, monospace` : "monospace";
}

export const createCaidaGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameInstance => {
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = ctxOrNull;
  const fontFamily = resolveFontFamily(canvas);

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
  const BOARD_W = COLS * BLOCK;
  const BOARD_H = ROWS * BLOCK;
  const PANEL_PAD = 28;
  const RIGHT_X = BOARD_X + BOARD_W;
  const RIGHT_W = W - RIGHT_X;

  function text(
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = "left",
    glow = 0,
  ) {
    ctx.save();
    ctx.font = `${size}px ${fontFamily}`;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillStyle = color;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
    }
    ctx.fillText(value, x, y);
    ctx.restore();
  }

  function drawPiece(piece: Piece, row: number, alpha = 1) {
    for (let r = 0; r < piece.shape.length; r++)
      for (let c = 0; c < piece.shape[r].length; c++)
        if (piece.shape[r][c] && row + r >= 0)
          drawBlock(
            ctx,
            BOARD_X + (piece.x + c) * BLOCK,
            BOARD_Y + (row + r) * BLOCK,
            piece.shape[r][c],
            BLOCK,
            alpha,
          );
  }

  function drawBoard() {
    ctx.fillStyle = COLORS.well;
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);

    // Rejilla tenue
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(BOARD_X + c * BLOCK + 0.5, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK + 0.5, BOARD_Y + BOARD_H);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK + 0.5);
      ctx.lineTo(BOARD_X + BOARD_W, BOARD_Y + r * BLOCK + 0.5);
    }
    ctx.stroke();

    const { board } = state;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(
          ctx,
          BOARD_X + c * BLOCK,
          BOARD_Y + r * BLOCK,
          board[r][c],
          BLOCK,
        );

    if (state.phase !== "ready") {
      const { current } = state;
      if (state.phase === "playing")
        drawPiece(current, ghostY(state.board, current), 0.2);
      drawPiece(current, current.y);
    }

    // Raíles neón del pozo
    ctx.save();
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.accent;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(BOARD_X - 1, 0);
    ctx.lineTo(BOARD_X - 1, H);
    ctx.moveTo(RIGHT_X + 1, 0);
    ctx.lineTo(RIGHT_X + 1, H);
    ctx.stroke();
    ctx.restore();
  }

  type Cap = { label?: string; arrow?: "left" | "right" | "up" | "down" };

  // Tecla con contorno; las flechas se dibujan como triángulos para no
  // depender de los glifos de la fuente.
  function drawKeycap(cap: Cap, x: number, y: number): number {
    const h = 24;
    const w = cap.label ? Math.max(h, cap.label.length * 8 + 14) : h;
    ctx.save();
    ctx.strokeStyle = COLORS.keycap;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 4);
    ctx.stroke();
    ctx.restore();

    if (cap.label) {
      text(cap.label, x + w / 2, y + 8, 8, COLORS.text, "center");
    } else if (cap.arrow) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const s = 5;
      const pts: Record<NonNullable<Cap["arrow"]>, [number, number][]> = {
        left: [
          [cx - s, cy],
          [cx + s, cy - s],
          [cx + s, cy + s],
        ],
        right: [
          [cx + s, cy],
          [cx - s, cy - s],
          [cx - s, cy + s],
        ],
        up: [
          [cx, cy - s],
          [cx - s, cy + s],
          [cx + s, cy + s],
        ],
        down: [
          [cx, cy + s],
          [cx - s, cy - s],
          [cx + s, cy - s],
        ],
      };
      const [a, b, c] = pts[cap.arrow];
      ctx.fillStyle = COLORS.text;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.lineTo(...c);
      ctx.closePath();
      ctx.fill();
    }
    return w;
  }

  const CONTROLS: { caps: Cap[]; action: string }[] = [
    { caps: [{ arrow: "left" }, { arrow: "right" }], action: "MOVER" },
    { caps: [{ arrow: "up" }, { label: "X" }], action: "GIRAR" },
    { caps: [{ arrow: "down" }], action: "BAJAR" },
    { caps: [{ label: "ESPACIO" }], action: "SOLTAR" },
    { caps: [{ label: "P" }, { label: "ESC" }], action: "PAUSA" },
  ];

  function drawControlsPanel() {
    text("CONTROLES", PANEL_PAD, 48, 10, COLORS.accent, "left", 8);
    CONTROLS.forEach((row, i) => {
      const y = 92 + i * 48;
      let x = PANEL_PAD;
      for (const cap of row.caps) x += drawKeycap(cap, x, y) + 6;
      text(row.action, 136, y + 8, 8, COLORS.textDim);
    });
  }

  function drawNextPanel() {
    const cx = RIGHT_X + RIGHT_W / 2;
    text("SIGUIENTE", cx, 48, 10, COLORS.accent, "center", 8);

    // Caja de 4×4 celdas, con la pieza centrada por sus celdas ocupadas
    const box = 4 * BLOCK;
    const boxX = cx - box / 2;
    const boxY = 84;
    ctx.save();
    ctx.strokeStyle = COLORS.keycap;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX - 8.5, boxY - 8.5, box + 17, box + 17);
    ctx.restore();

    const { shape } = state.next;
    let minR = Infinity,
      maxR = -1,
      minC = Infinity,
      maxC = -1;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) {
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
    const offX = boxX + (box - (maxC - minC + 1) * BLOCK) / 2;
    const offY = boxY + (box - (maxR - minR + 1) * BLOCK) / 2;
    for (let r = minR; r <= maxR; r++)
      for (let c = minC; c <= maxC; c++)
        drawBlock(
          ctx,
          offX + (c - minC) * BLOCK,
          offY + (r - minR) * BLOCK,
          shape[r][c],
          BLOCK,
        );

    text("LÍNEAS", cx, 260, 10, COLORS.accent, "center", 8);
    text(String(state.lines), cx, 292, 28, COLORS.text, "center", 10);
  }

  function drawStartScreen() {
    const cx = BOARD_X + BOARD_W / 2;
    text("CAÍDA", cx, H / 2 - 70, 28, COLORS.accent, "center", 14);
    // Parpadeo suave del texto, como en las máquinas arcade
    if (Math.floor(performance.now() / 500) % 2 === 1) return;
    text("PULSA ESPACIO", cx, H / 2 + 10, 14, COLORS.text, "center", 8);
    text("PARA EMPEZAR", cx, H / 2 + 34, 14, COLORS.text, "center", 8);
  }

  function draw() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    drawBoard();
    drawControlsPanel();
    drawNextPanel();
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

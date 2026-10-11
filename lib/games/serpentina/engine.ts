import type { GameCallbacks, GameFactory, GameInstance } from "../types";
import {
  BASE_STEPS_PER_SECOND,
  CELL,
  COLORS,
  DEAD_DURATION,
  FRUITS_PER_LEVEL,
  FRUITS_SRC,
  INITIAL_LIVES,
  MAX_DT,
  MAX_SCORE,
  MAX_STEPS_PER_SECOND,
  POINTS_PER_FRUIT,
  W,
} from "./constants";
import {
  type Cell,
  type Direction,
  type Fruit,
  drawFruit,
  drawGrid,
  drawSnake,
  hitsWallOrBody,
  initialSnake,
  nextHead,
  spawnFruit,
} from "./entities";

// Motor de SERPENTINA: Snake original con rejilla de 40×30, frutas pixel art,
// niveles y 3 vidas. Todo el estado vive en la instancia.

type Phase = "ready" | "playing" | "dead" | "waiting" | "gameover";
// "ready": "PULSA ESPACIO PARA EMPEZAR" con la serpiente inicial y la primera fruta. Espacio solo arranca si la imagen cargó (o falló)
// "playing": la serpiente avanza un paso cada 1 / stepsPerSecond s (la pausa es un flag aparte)
// "dead": 1 s de parpadeo magenta tras un choque; la vida ya se restó
// "waiting": serpiente reaparecida en el centro; espera una flecha o WASD para volver a "playing"
// "gameover": sin vidas, tablero lleno o llamada a end(). Ya se llamó a onGameOver

type EngineState = {
  phase: Phase;
  paused: boolean;
  inputEnabled: boolean;
  imageReady: boolean; // true con load o con error de fruits.png
  snake: Cell[]; // cabeza primero
  direction: Direction; // dirección del último paso aplicado
  nextDirection: Direction | null; // giro para el próximo paso (uno por paso)
  queuedDirection: Direction | null; // búfer de 1 giro, para el paso siguiente
  fruit: Fruit;
  stepTimer: number; // s acumulados hacia el siguiente paso
  deadTimer: number; // s restantes de la fase "dead"
  fruitsEaten: number; // no se reinicia al perder una vida
  score: number;
  lives: number;
  level: number; // floor(fruitsEaten / FRUITS_PER_LEVEL) + 1
};

function stepsPerSecond(level: number): number {
  return Math.min(BASE_STEPS_PER_SECOND + (level - 1), MAX_STEPS_PER_SECOND);
}

function sameCell(a: Cell, b: Cell): boolean {
  return a.col === b.col && a.row === b.row;
}

/** Pila de fuentes de la plataforma, con `monospace` de respaldo. */
function resolveFontFamily(canvas: HTMLCanvasElement): string {
  const family = getComputedStyle(canvas)
    .getPropertyValue("--font-press-start-2p")
    .trim();
  return family ? `${family}, monospace` : "monospace";
}

export const createSerpentinaGame: GameFactory = (
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
    const snake = initialSnake();
    return {
      phase: "ready",
      paused: false,
      inputEnabled: true,
      imageReady: false,
      snake,
      direction: "right",
      nextDirection: null,
      queuedDirection: null,
      // Con la serpiente inicial siempre hay celda libre
      fruit: spawnFruit(snake, Math.random)!,
      stepTimer: 0,
      deadTimer: 0,
      fruitsEaten: 0,
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

  // ── Imagen de frutas ────────────────────────────────────────────────────────
  // Si falla, drawFruit dibuja el núcleo de respaldo y el juego sigue jugable.
  const fruitsImage = new Image();
  function onImageSettled() {
    state.imageReady = true;
  }
  fruitsImage.addEventListener("load", onImageSettled);
  fruitsImage.addEventListener("error", onImageSettled);
  fruitsImage.src = FRUITS_SRC;

  // ── Reglas ──────────────────────────────────────────────────────────────────
  function gameOver() {
    state.phase = "gameover";
    sync();
    callbacks.onGameOver(state.score);
  }

  function loseLife() {
    state.lives--;
    if (state.lives <= 0) {
      state.lives = 0;
      gameOver();
    } else {
      state.phase = "dead";
      state.deadTimer = DEAD_DURATION;
    }
  }

  // Serpiente inicial en el centro, quieta, y fruta reubicada. Puntuación y nivel se conservan.
  function respawn() {
    state.snake = initialSnake();
    state.direction = "right";
    state.nextDirection = null;
    state.queuedDirection = null;
    state.stepTimer = 0;
    const fruit = spawnFruit(state.snake, Math.random);
    if (!fruit) {
      gameOver();
      return;
    }
    state.fruit = fruit;
    state.phase = "waiting";
  }

  function step() {
    // Giro pendiente; el del búfer pasa a ser el del próximo paso
    if (state.nextDirection) {
      state.direction = state.nextDirection;
      state.nextDirection = state.queuedDirection;
      state.queuedDirection = null;
    }

    const head = nextHead(state.snake[0], state.direction);
    const willGrow = sameCell(head, state.fruit.cell);
    if (hitsWallOrBody(head, state.snake, willGrow)) {
      loseLife();
      return;
    }

    state.snake.unshift(head);
    if (!willGrow) {
      state.snake.pop();
      return;
    }

    // Puntos con el nivel previo al bocado; la cola no se recorta en este paso
    state.score = Math.min(
      state.score + POINTS_PER_FRUIT * state.level,
      MAX_SCORE,
    );
    state.fruitsEaten++;
    state.level = Math.floor(state.fruitsEaten / FRUITS_PER_LEVEL) + 1;
    const fruit = spawnFruit(state.snake, Math.random);
    if (!fruit) {
      // Tablero lleno
      gameOver();
      return;
    }
    state.fruit = fruit;
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state.phase === "playing") {
      state.stepTimer += dt;
      const interval = 1 / stepsPerSecond(state.level);
      while (state.phase === "playing" && state.stepTimer >= interval) {
        state.stepTimer -= interval;
        step();
      }
    } else if (state.phase === "dead") {
      state.deadTimer -= dt;
      if (state.deadTimer <= 0) respawn();
    }
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

  // Parpadeo de máquina arcade (on/off cada `periodMs`), salvo con movimiento reducido
  function blinkOn(periodMs: number): boolean {
    return reducedMotion || Math.floor(performance.now() / periodMs) % 2 === 0;
  }

  // La serpiente ocupa la fila 15 (y = 300–320): el texto va por encima y por debajo
  function drawStartScreen() {
    const cx = W / 2;
    text("SERPENTINA", cx, 210, 32, COLORS.head, 18);
    if (!state.imageReady) text("CARGANDO…", cx, 400, 14, COLORS.textDim);
    else if (blinkOn(500))
      text("PULSA ESPACIO PARA EMPEZAR", cx, 400, 14, COLORS.text, 8);
    text("FLECHAS O WASD PARA GIRAR", cx, 444, 10, COLORS.textDim);
  }

  // Flechas en las celdas a las que se puede salir (todas menos la izquierda)
  function drawWaitingHint() {
    const head = state.snake[0];
    const alpha = reducedMotion
      ? 0.8
      : 0.45 + 0.4 * Math.sin(performance.now() / 160);
    const hints: [Direction, number, number][] = [
      ["up", 0, -1],
      ["down", 0, 1],
      ["right", 1, 0],
    ];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.head;
    for (const [, dx, dy] of hints) {
      const cx = (head.col + dx) * CELL + CELL / 2;
      const cy = (head.row + dy) * CELL + CELL / 2;
      // Triángulo de 8 px que apunta hacia fuera de la cabeza
      const tip = 4;
      const base = 4;
      ctx.beginPath();
      ctx.moveTo(cx + dx * tip, cy + dy * tip);
      ctx.lineTo(cx - dx * tip + dy * base, cy - dy * tip + dx * base);
      ctx.lineTo(cx - dx * tip - dy * base, cy - dy * tip - dx * base);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    text("PULSA UNA DIRECCIÓN", W / 2, 400, 12, COLORS.text, 6);
  }

  function draw() {
    drawGrid(ctx);
    drawFruit(ctx, fruitsImage, state.fruit);

    // Tras un choque, la serpiente alterna entre magenta y sus colores
    const flash =
      state.phase === "dead" &&
      (reducedMotion || Math.floor(state.deadTimer * 10) % 2 === 0);
    drawSnake(ctx, state.snake, flash ? COLORS.dead : undefined);

    if (state.phase === "ready") drawStartScreen();
    else if (state.phase === "waiting") drawWaitingHint();
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
  // Entrada de teclado, pausa, reinicio y el resto del ciclo de vida: Paso 6.
  function start() {
    if (destroyed || rafId !== null) return;
    lastTime = null;
    sync();
    rafId = requestAnimationFrame(loop);
  }

  function pause() {}

  function resume() {}

  function restart() {}

  function end() {}

  function setInputEnabled(enabled: boolean) {
    state.inputEnabled = enabled;
  }

  function destroy() {
    destroyed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    fruitsImage.removeEventListener("load", onImageSettled);
    fruitsImage.removeEventListener("error", onImageSettled);
  }

  return { start, pause, resume, restart, end, setInputEnabled, destroy };
};

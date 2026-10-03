import type { GameCallbacks, GameInstance } from "../types";
import {
  COLORS,
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  type InputState,
  Particle,
  PowerUp,
  Ship,
  dist,
  rand,
} from "./entities";

// Motor de Asteroids: port del loop, colisiones, niveles y dibujo de
// references/02-asteroids/game.js. Todo el estado vive en la instancia.

type Phase = "ready" | "playing" | "dead" | "gameover";
// "ready": pantalla "PULSA ESPACIO PARA EMPEZAR"
// "dead": nave destruida, esperando 2 s para reaparecer
// "gameover": vidas agotadas o end(); ya se llamó a onGameOver

type EngineState = {
  phase: Phase;
  paused: boolean;
  score: number;
  lives: number;
  level: number;
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerUps: PowerUp[];
  deadTimer: number;
  powerUpSpawned: boolean;
  killsSinceSpawn: number;
};

const MAX_DT = 0.05; // s

/** Pila de fuentes de la plataforma, con `monospace` de respaldo. */
function resolveFontFamily(canvas: HTMLCanvasElement): string {
  const family = getComputedStyle(canvas)
    .getPropertyValue("--font-press-start-2p")
    .trim();
  return family ? `${family}, monospace` : "monospace";
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameInstance {
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = ctxOrNull;
  const fontFamily = resolveFontFamily(canvas);

  // ── Input ───────────────────────────────────────────────────────────────────
  const input: InputState = { keys: {} };
  const justPressed: Record<string, boolean> = {};

  let inputEnabled = true;

  // Teclas que la página no debe usar para hacer scroll mientras se juega
  const GAME_KEYS = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
  ]);

  function pressed(code: string) {
    const val = justPressed[code];
    justPressed[code] = false;
    return !!val;
  }

  function clearInput() {
    for (const code of Object.keys(input.keys)) input.keys[code] = false;
    for (const code of Object.keys(justPressed)) justPressed[code] = false;
  }

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
    const s: EngineState = {
      phase: "ready",
      paused: false,
      score: 0,
      lives: 3,
      level: 1,
      ship: new Ship(),
      bullets: [],
      asteroids: [],
      particles: [],
      powerUps: [],
      deadTimer: 0,
      powerUpSpawned: false,
      killsSinceSpawn: 0,
    };
    spawnAsteroids(s, 3 + s.level);
    return s;
  }

  function spawnAsteroids(s: EngineState, count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      s.asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function nextLevel() {
    state.level++;
    state.bullets = [];
    state.particles = [];
    state.powerUps = [];
    state.powerUpSpawned = false;
    state.killsSinceSpawn = 0;
    state.ship.reset();
    spawnAsteroids(state, 3 + state.level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) state.particles.push(new Particle(x, y));
  }

  function gameOver() {
    state.phase = "gameover";
    sync();
    callbacks.onGameOver(state.score);
  }

  function killShip() {
    const { ship } = state;
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    state.lives--;
    if (state.lives <= 0) {
      gameOver();
    } else {
      state.phase = "dead";
      state.deadTimer = 2;
    }
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

  // ── Update ──────────────────────────────────────────────────────────────────
  function updateParticles(dt: number) {
    state.particles.forEach((p) => p.update(dt));
    state.particles = state.particles.filter((p) => !p.dead);
  }

  function update(dt: number) {
    if (state.phase === "ready") {
      if (pressed("Space")) state.phase = "playing";
      return;
    }

    if (state.phase === "gameover") {
      updateParticles(dt);
      return;
    }

    if (state.phase === "dead") {
      state.deadTimer -= dt;
      updateParticles(dt);
      state.asteroids.forEach((a) => a.update(dt));
      if (state.deadTimer <= 0) {
        state.phase = "playing";
        state.ship.reset();
      }
      return;
    }

    const { ship } = state;

    // Disparar
    if (pressed("Space")) state.bullets.push(...ship.tryShoot());

    ship.update(dt, input);
    state.bullets.forEach((b) => b.update(dt));
    state.asteroids.forEach((a) => a.update(dt));
    state.particles.forEach((p) => p.update(dt));
    state.powerUps.forEach((p) => p.update(dt));

    state.bullets = state.bullets.filter((b) => !b.dead);
    state.particles = state.particles.filter((p) => !p.dead);
    state.powerUps = state.powerUps.filter((p) => !p.dead);

    for (const p of state.powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of state.bullets) {
      for (const a of state.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          state.score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!state.powerUpSpawned) {
            state.killsSinceSpawn++;
            const guaranteed = state.killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              state.powerUps.push(new PowerUp(a.x, a.y));
              state.powerUpSpawned = true;
            }
          }
        }
      }
    }
    state.asteroids = state.asteroids
      .filter((a) => !a.dead)
      .concat(newAsteroids);
    state.bullets = state.bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of state.asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (state.asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawPowerUpIndicator() {
    const { ship } = state;
    if (ship.tripleShot <= 0) return;
    ctx.save();
    ctx.font = `12px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLORS.powerUpText;
    ctx.shadowColor = COLORS.powerUpText;
    ctx.shadowBlur = 6;
    ctx.fillText(`3x ${ship.tripleShot.toFixed(1)}s`, 16, 30);
    ctx.restore();
  }

  function drawStartScreen() {
    // Parpadeo suave del texto, como en las máquinas arcade
    if (Math.floor(performance.now() / 500) % 2 === 1) return;
    ctx.save();
    ctx.font = `18px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.text;
    ctx.shadowColor = COLORS.ship;
    ctx.shadowBlur = 10;
    ctx.fillText("PULSA ESPACIO PARA EMPEZAR", W / 2, H / 2 + 80);
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    state.particles.forEach((p) => p.draw(ctx, COLORS));
    state.asteroids.forEach((a) => a.draw(ctx, COLORS));
    state.powerUps.forEach((p) => p.draw(ctx, COLORS, fontFamily));
    state.bullets.forEach((b) => b.draw(ctx, COLORS));
    state.ship.draw(ctx, COLORS);

    drawPowerUpIndicator();
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

  // ── Listeners ───────────────────────────────────────────────────────────────
  function onKeyDown(e: KeyboardEvent) {
    // Con la entrada desactivada (modal abierto) no se toca el evento, para
    // que el input de iniciales funcione con normalidad.
    if (!inputEnabled) return;

    if (e.code === "KeyP" || e.code === "Escape") {
      if (!e.repeat) togglePause();
      return;
    }

    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (state.paused) return;
    if (!input.keys[e.code]) justPressed[e.code] = true;
    input.keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    // Siempre se suelta la tecla, aunque la entrada esté desactivada, para
    // que ninguna quede "pegada" al volver a habilitarla.
    input.keys[e.code] = false;
  }

  function onVisibilityChange() {
    if (document.hidden) {
      clearInput();
      pause();
    }
  }

  // ── API de control ──────────────────────────────────────────────────────────
  function start() {
    if (destroyed || rafId !== null) return;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibilityChange);
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
    clearInput();
    sync();
  }

  function togglePause() {
    if (state.paused) resume();
    else pause();
  }

  function restart() {
    Object.assign(state, createInitialState());
    lastTime = null;
    clearInput();
    sync();
  }

  function end() {
    if (state.phase === "gameover") return;
    state.paused = false;
    gameOver();
  }

  function setInputEnabled(enabled: boolean) {
    inputEnabled = enabled;
    if (!enabled) clearInput();
  }

  function destroy() {
    destroyed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  return { start, pause, resume, restart, end, setInputEnabled, destroy };
}

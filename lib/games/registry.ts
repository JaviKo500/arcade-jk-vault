import { createAsteroidsGame } from "./asteroids/engine";
import { createBloqueBusterGame } from "./bloque-buster/engine";
import { createCaidaGame } from "./caida/engine";
import { createSerpentinaGame } from "./serpentina/engine";
import type { GameEngine } from "./types";

// Juegos con motor real. Si un gameId no está aquí, GamePlayer usa la
// simulación de puntuación. `touch` es el mapeo del mando virtual: cada botón
// envía el `KeyboardEvent.code` indicado; un botón ausente se ve apagado.
export const GAME_ENGINES: Partial<Record<string, GameEngine>> = {
  asteroids: {
    factory: createAsteroidsGame,
    skins: ["classic", "neon", "retro"],
    touch: {
      up: { code: "ArrowUp" },
      left: { code: "ArrowLeft" },
      right: { code: "ArrowRight" },
      a: { code: "Space", label: "FUEGO" },
    },
  },
  "bloque-buster": {
    factory: createBloqueBusterGame,
    skins: ["classic", "neon", "retro"],
    touch: {
      left: { code: "ArrowLeft" },
      right: { code: "ArrowRight" },
      a: { code: "Space", label: "INICIO" },
    },
  },
  caida: {
    factory: createCaidaGame,
    hasLives: false,
    skins: ["classic", "neon", "retro"],
    touch: {
      down: { code: "ArrowDown" },
      left: { code: "ArrowLeft" },
      right: { code: "ArrowRight" },
      a: { code: "Space", label: "CAER" },
      b: { code: "ArrowUp", label: "ROTAR" },
    },
  },
  serpentina: {
    factory: createSerpentinaGame,
    skins: ["classic", "neon", "retro"],
    touch: {
      up: { code: "ArrowUp" },
      down: { code: "ArrowDown" },
      left: { code: "ArrowLeft" },
      right: { code: "ArrowRight" },
      a: { code: "Space", label: "INICIO" },
    },
  },
};

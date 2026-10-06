import { createAsteroidsGame } from "./asteroids/engine";
import { createCaidaGame } from "./caida/engine";
import type { GameEngine } from "./types";

// Juegos con motor real. Si un gameId no está aquí, GamePlayer usa la
// simulación de puntuación.
export const GAME_ENGINES: Partial<Record<string, GameEngine>> = {
  asteroids: { factory: createAsteroidsGame },
  caida: { factory: createCaidaGame, hasLives: false },
};

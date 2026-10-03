import { createAsteroidsGame } from "./asteroids/engine";
import type { GameFactory } from "./types";

// Juegos con motor real. Si un gameId no está aquí, GamePlayer usa la
// simulación de puntuación.
export const GAME_ENGINES: Partial<Record<string, GameFactory>> = {
  asteroids: createAsteroidsGame,
};

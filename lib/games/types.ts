// Contrato común entre la plataforma y cualquier motor de juego.

export type GameCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  /** También se dispara con P/Esc y con `visibilitychange`. */
  onPauseChange: (paused: boolean) => void;
  onGameOver: (finalScore: number) => void;
};

export type GameInstance = {
  /** Arranca el loop y muestra la pantalla de inicio. */
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Nueva partida: score 0, 3 vidas, nivel 1, vuelve a la pantalla de inicio. */
  restart: () => void;
  /** Fuerza el fin de partida y dispara `onGameOver` con el score actual. */
  end: () => void;
  /** `false` mientras el modal de fin de partida está abierto. */
  setInputEnabled: (enabled: boolean) => void;
  /** Cancela `requestAnimationFrame` y quita todos los listeners. */
  destroy: () => void;
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameInstance;

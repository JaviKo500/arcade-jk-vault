// Contrato común entre la plataforma y cualquier motor de juego.

/**
 * Skins (paletas) que un motor puede ofrecer. `classic` es siempre la skin por
 * defecto y conserva la paleta original del juego.
 */
export type SkinId = "classic" | "neon" | "retro";

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
  /** Nueva partida con el estado inicial del juego. Vuelve a la pantalla de inicio. */
  restart: () => void;
  /** Fuerza el fin de partida y dispara `onGameOver` con el score actual. */
  end: () => void;
  /** `false` mientras el modal de fin de partida está abierto. */
  setInputEnabled: (enabled: boolean) => void;
  /** Cancela `requestAnimationFrame` y quita todos los listeners. */
  destroy: () => void;
  /**
   * Cambia la paleta activa en caliente: no reinicia la partida, no toca la
   * puntuación ni dispara callbacks. Solo en motores que declaran `skins`.
   */
  setSkin?: (skin: SkinId) => void;
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameInstance;

export type GameEngine = {
  factory: GameFactory;
  /** `false` en juegos sin vidas: el HUD oculta "Vidas" y el motor no llama a `onLives`. Por defecto, `true`. */
  hasLives?: boolean;
  /**
   * Skins que ofrece el motor, en el orden del selector (incluye `classic`).
   * Si se declara, `GamePlayer` muestra el selector y la instancia implementa
   * `setSkin`. Sin `skins`, no hay selector.
   */
  skins?: readonly SkinId[];
};

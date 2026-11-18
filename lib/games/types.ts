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

/** Botones del mando virtual. */
export type TouchButton = "up" | "down" | "left" | "right" | "a" | "b";

/** Lo que envía un botón: el `KeyboardEvent.code` que el motor ya escucha. */
export type TouchBinding = {
  /** P. ej. "ArrowLeft", "Space". */
  code: string;
  /** Rótulo corto bajo A/B (opcional), p. ej. "FUEGO", "ROTAR". */
  label?: string;
};

/** Botón ausente = se dibuja apagado y no envía nada. */
export type TouchLayout = Partial<Record<TouchButton, TouchBinding>>;

/** Opciones de creación del motor. */
export type GameOptions = {
  /** `true` en dispositivos táctiles: el motor dibuja "PULSA A" en lugar de "PULSA ESPACIO". */
  touch: boolean;
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  /** Opcional: sin él, `touch = false`. */
  options?: GameOptions,
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
  /**
   * Mapeo del mando virtual. Sin `touch`, no se muestra mando aunque el
   * dispositivo sea táctil. La entrada llega como `KeyboardEvent` sintético
   * en `window`, así que el motor no debe filtrar por `isTrusted`.
   */
  touch?: TouchLayout;
};

"use client";

import { useEffect, useRef } from "react";
import type {
  GameCallbacks,
  GameFactory,
  GameInstance,
} from "@/lib/games/types";

type GameCanvasProps = {
  factory: GameFactory;
  callbacks: GameCallbacks;
  /** Recibe la instancia al montarse y `null` al desmontarse. */
  onInstance: (instance: GameInstance | null) => void;
  /** Dispositivo táctil: el motor dibuja "PULSA A" en lugar de "PULSA ESPACIO". */
  touch: boolean;
};

export function GameCanvas({
  factory,
  callbacks,
  onInstance,
  touch,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Siempre las últimas versiones de las props, para que el motor no se
  // recree cada vez que el padre vuelve a renderizar.
  const callbacksRef = useRef(callbacks);
  const onInstanceRef = useRef(onInstance);
  useEffect(() => {
    callbacksRef.current = callbacks;
    onInstanceRef.current = onInstance;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const instance = factory(
      canvas,
      {
        onScore: (score) => callbacksRef.current.onScore(score),
        onLives: (lives) => callbacksRef.current.onLives(lives),
        onLevel: (level) => callbacksRef.current.onLevel(level),
        onPauseChange: (paused) => callbacksRef.current.onPauseChange(paused),
        onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
      },
      { touch },
    );
    onInstanceRef.current(instance);
    instance.start();

    // También cubre el doble montaje de StrictMode: la primera instancia se
    // destruye antes de crear la segunda. Si `touch` cambia al hidratar, el
    // motor se recrea (solo pasa en la pantalla de inicio).
    return () => {
      instance.destroy();
      onInstanceRef.current(null);
    };
  }, [factory, touch]);

  return (
    <canvas ref={canvasRef} className="game-canvas" width={800} height={600} />
  );
}

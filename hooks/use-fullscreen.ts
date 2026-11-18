"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";

// Safari en iPad solo expone la Fullscreen API con prefijo `webkit`
type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function fullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function supportsFullscreen(): boolean {
  const doc = document as WebkitDocument;
  return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

function exitFullscreen() {
  const doc = document as WebkitDocument;
  if (!fullscreenElement()) return;
  if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => {});
  else void doc.webkitExitFullscreen?.();
}

const noopSubscribe = () => () => {};

/**
 * Pantalla completa nativa (Fullscreen API) sobre `target`. `supported` es
 * `false` en el servidor y donde no hay API (iPhone Safari). Al desmontar el
 * player se sale de la pantalla completa.
 */
export function useFullscreen(target: RefObject<HTMLElement | null>): {
  active: boolean;
  supported: boolean;
  toggle: () => void;
} {
  const supported = useSyncExternalStore(
    noopSubscribe,
    supportsFullscreen,
    () => false,
  );
  const [active, setActive] = useState(false);

  // El usuario también puede salir con el gesto o la tecla del sistema
  useEffect(() => {
    const onChange = () => {
      const el = fullscreenElement();
      setActive(el !== null && el === target.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [target]);

  // Salir del player (SALIR, REGRESAR o cambio de ruta) deja la página normal
  useEffect(() => () => exitFullscreen(), []);

  const toggle = useCallback(() => {
    if (fullscreenElement()) {
      exitFullscreen();
      return;
    }
    const el = target.current as WebkitElement | null;
    if (!el) return;
    if (el.requestFullscreen) {
      // Si el navegador lo rechaza, se queda en modo normal
      void el.requestFullscreen().catch(() => {});
    } else {
      void el.webkitRequestFullscreen?.();
    }
  }, [target]);

  return { active, supported, toggle };
}

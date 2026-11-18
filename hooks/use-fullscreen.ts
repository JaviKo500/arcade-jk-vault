"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";

export type FullscreenMode = "native" | "immersive";

const IMMERSIVE_CLASS = "av-immersive";

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

function supportsNative(): boolean {
  const doc = document as WebkitDocument;
  return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

function exitNative() {
  const doc = document as WebkitDocument;
  if (!fullscreenElement()) return;
  if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => {});
  else void doc.webkitExitFullscreen?.();
}

function setImmersive(on: boolean) {
  document.documentElement.classList.toggle(IMMERSIVE_CLASS, on);
}

const noopSubscribe = () => () => {};

/**
 * Pantalla completa del player. `native` usa la Fullscreen API sobre
 * `target`; donde no existe (iPhone Safari), `immersive` añade `av-immersive`
 * a `<html>`, que oculta nav y footer. Al desmontar se sale de ambos modos.
 */
export function useFullscreen(target: RefObject<HTMLElement | null>): {
  active: boolean;
  mode: FullscreenMode;
  toggle: () => void;
} {
  const mode = useSyncExternalStore<FullscreenMode>(
    noopSubscribe,
    () => (supportsNative() ? "native" : "immersive"),
    () => "immersive",
  );
  const [nativeActive, setNativeActive] = useState(false);
  const [immersiveActive, setImmersiveActive] = useState(false);

  // El usuario también puede salir con el gesto o la tecla del sistema
  useEffect(() => {
    const onChange = () => {
      const el = fullscreenElement();
      setNativeActive(el !== null && el === target.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [target]);

  // `av-immersive` en <html> sigue al estado del modo inmersivo
  useEffect(() => {
    setImmersive(immersiveActive);
  }, [immersiveActive]);

  // Salir del player (SALIR o cambio de ruta) deja la página normal
  useEffect(
    () => () => {
      exitNative();
      setImmersive(false);
    },
    [],
  );

  const toggle = useCallback(() => {
    if (mode === "immersive") {
      setImmersiveActive((on) => !on);
      return;
    }
    if (fullscreenElement()) {
      exitNative();
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
  }, [mode, target]);

  return {
    active: mode === "native" ? nativeActive : immersiveActive,
    mode,
    toggle,
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { TouchButton, TouchLayout } from "@/lib/games/types";

const REPEAT_DELAY_MS = 180; // la cruceta empieza a repetir tras 180 ms pulsada
const REPEAT_INTERVAL_MS = 60; // y repite cada 60 ms (keydown con repeat: true)

const DPAD: readonly TouchButton[] = ["up", "left", "right", "down"];

const BUTTON_NAMES: Record<TouchButton, string> = {
  up: "Arriba",
  down: "Abajo",
  left: "Izquierda",
  right: "Derecha",
  a: "A",
  b: "B",
};

/** `KeyboardEvent.key` equivalente, por si algún motor lo lee además de `code`. */
function keyFor(code: string): string {
  if (code === "Space") return " ";
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  return code;
}

function sendKey(type: "keydown" | "keyup", code: string, repeat = false) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key: keyFor(code),
      repeat,
      bubbles: true,
      cancelable: true,
    }),
  );
}

type Held = {
  pointerId: number;
  code: string;
  timeout?: ReturnType<typeof setTimeout>;
  interval?: ReturnType<typeof setInterval>;
};

type TouchControlsProps = {
  layout: TouchLayout;
  /** `true` mientras el modal de fin de partida está abierto: no envía nada. */
  disabled: boolean;
};

/**
 * Mando virtual común: cruceta a la izquierda y pulsadores A/B a la derecha.
 * Cada botón envía `keydown`/`keyup` sintéticos a `window` con el `code` de
 * `layout`; los motores siguen escuchando el teclado como siempre.
 */
export function TouchControls({ layout, disabled }: TouchControlsProps) {
  const heldRef = useRef(new Map<TouchButton, Held>());
  const [pressed, setPressed] = useState<ReadonlySet<TouchButton>>(new Set());

  const syncPressed = () => setPressed(new Set(heldRef.current.keys()));

  const release = (button: TouchButton) => {
    const held = heldRef.current.get(button);
    if (!held) return;
    clearTimeout(held.timeout);
    clearInterval(held.interval);
    heldRef.current.delete(button);
    sendKey("keyup", held.code);
  };

  const releaseAll = () => {
    if (heldRef.current.size === 0) return;
    for (const button of [...heldRef.current.keys()]) release(button);
    syncPressed();
  };

  // Ref estable para los efectos: siempre la última versión de releaseAll
  const releaseAllRef = useRef(releaseAll);
  useEffect(() => {
    releaseAllRef.current = releaseAll;
  });

  // Al pasar a `disabled` o desmontarse no puede quedar ninguna tecla pulsada
  useEffect(() => {
    if (disabled) releaseAllRef.current();
  }, [disabled]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") releaseAllRef.current();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      releaseAllRef.current();
    };
  }, []);

  const press = (button: TouchButton, event: ReactPointerEvent) => {
    const binding = layout[button];
    if (disabled || !binding) return;
    event.preventDefault();
    // En táctil el puntero queda capturado por el botón: sin soltarlo,
    // `pointerleave` no llega al arrastrar el dedo fuera.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    // Un segundo dedo sobre un botón ya pulsado no hace nada
    if (heldRef.current.has(button)) return;

    const held: Held = { pointerId: event.pointerId, code: binding.code };
    sendKey("keydown", binding.code);
    if (DPAD.includes(button)) {
      held.timeout = setTimeout(() => {
        held.interval = setInterval(
          () => sendKey("keydown", binding.code, true),
          REPEAT_INTERVAL_MS,
        );
      }, REPEAT_DELAY_MS);
    }
    heldRef.current.set(button, held);
    syncPressed();
  };

  const lift = (button: TouchButton, event: ReactPointerEvent) => {
    const held = heldRef.current.get(button);
    if (!held || held.pointerId !== event.pointerId) return;
    release(button);
    syncPressed();
  };

  const handlers = (button: TouchButton) => ({
    onPointerDown: (event: ReactPointerEvent) => press(button, event),
    onPointerUp: (event: ReactPointerEvent) => lift(button, event),
    onPointerCancel: (event: ReactPointerEvent) => lift(button, event),
    onPointerLeave: (event: ReactPointerEvent) => lift(button, event),
  });

  const stateClass = (button: TouchButton) =>
    !layout[button] ? " off" : pressed.has(button) ? " on" : "";

  const lit = DPAD.find((button) => pressed.has(button));

  return (
    <div
      className={`touch-controls${disabled ? " disabled" : ""}`}
      role="group"
      aria-label="Mando virtual"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="tc-dpad" data-lit={lit}>
        {DPAD.map((button) => (
          <button
            key={button}
            type="button"
            tabIndex={-1}
            className={`tc-arm tc-${button}${stateClass(button)}`}
            aria-label={BUTTON_NAMES[button]}
            aria-disabled={!layout[button] || disabled}
            {...handlers(button)}
          >
            <span className="tc-chevron" aria-hidden="true" />
          </button>
        ))}
        <span className="tc-hub" aria-hidden="true" />
      </div>

      <div className="tc-face">
        {(["b", "a"] as const).map((button) => (
          <div key={button} className={`tc-cell tc-cell-${button}`}>
            <button
              type="button"
              tabIndex={-1}
              className={`tc-push tc-${button}${stateClass(button)}`}
              aria-label={
                layout[button]?.label
                  ? `${BUTTON_NAMES[button]}: ${layout[button]?.label}`
                  : BUTTON_NAMES[button]
              }
              aria-disabled={!layout[button] || disabled}
              {...handlers(button)}
            >
              <span className="tc-cap" aria-hidden="true">
                {BUTTON_NAMES[button]}
              </span>
            </button>
            <span className="tc-label" aria-hidden="true">
              {layout[button]?.label ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

# SPEC 10 — Controles táctiles y juego en móvil

> **Estado:** Approved · **Depende de:** SPEC 05 (`05-asteroids-game.md` — contrato `GameFactory`, `GameCanvas`, `GamePlayer`), SPEC 07 (`07-caida-game.md` — registro `GameEngine`), SPEC 08 (`08-bloque-buster-game.md`), SPEC 09 (`09-serpentina-game.md`) · **Fecha:** 2026-11-17
> **Objetivo:** Que los 4 juegos implementados se puedan jugar en una pantalla táctil con un mando virtual común (cruceta y botones A/B) bajo el canvas, en vertical y en horizontal, con pantalla completa y sin zoom accidental.

## Scope

**Incluye:**

- **Mando virtual** `components/touch-controls.tsx`, igual para los 4 juegos:
  - Cruceta de 4 direcciones a la izquierda y botones `A` y `B` a la derecha, con estética neón y diseño hecho con `/frontend-design`.
  - Cada botón envía un `KeyboardEvent` sintético (`keydown` al pulsar, `keyup` al soltar) a `window` con el `code` que el juego tiene asignado. Los motores siguen escuchando el teclado igual que ahora.
  - Se usan Pointer Events (`pointerdown`, `pointerup`, `pointercancel`, `pointerleave`), así que soltar el dedo fuera del botón también suelta la tecla.
  - La cruceta repite `keydown` (con `repeat: true`) mientras se mantiene pulsada. `A` y `B` no repiten.
  - Los botones sin uso en un juego se muestran apagados y no envían nada.
  - El mando se desactiva mientras el modal de fin de partida está abierto.
- **Mapeo por juego**, declarado en el registro (`GAME_ENGINES`) junto a cada motor:
  - `asteroids`: ← → para girar, ↑ para propulsar, `A` dispara (`Space`) y `B` apagado.
  - `caida`: ← → para mover, ↓ para bajar, ↑ apagado, `A` hace caída dura (`Space`) y `B` rota (`ArrowUp`).
  - `bloque-buster`: ← → para mover la pala, ↑ ↓ apagados, `A` empieza (`Space`) y `B` apagado.
  - `serpentina`: las 4 direcciones, `A` empieza (`Space`) y `B` apagado.
- **Detección táctil** con `matchMedia("(pointer: coarse)")`. El mando solo aparece si coincide. En escritorio el player queda exactamente como ahora.
- **Texto de inicio en táctil:** los 4 motores dibujan "PULSA A PARA EMPEZAR" en lugar de "PULSA ESPACIO PARA EMPEZAR" (o "PULSA A" en `caida`).
- **Layout del player en táctil:**
  - En vertical: nav, HUD compacto, el canvas a todo el ancho y el mando debajo.
  - En horizontal: HUD en una franja mínima arriba, la cruceta a la izquierda, el canvas en el centro ajustado a la altura disponible y A/B a la derecha.
  - El marco CRT decorativo y la franja "SEÑAL OK…" se ocultan en táctil.
  - El HUD conserva Jugador, Puntuación, Vidas, Nivel, Skin y los botones PAUSA, FIN y SALIR.
- **Pantalla completa:**
  - Botón "PANTALLA COMPLETA" en el HUD, solo en táctil.
  - Llama a `requestFullscreen()` sobre el contenedor del player si el navegador lo soporta.
  - Si no lo soporta (iPhone Safari), activa un modo inmersivo con CSS que oculta nav y footer.
  - El mismo botón sale de la pantalla completa o del modo inmersivo.
- **Bloqueo de zoom y gestos** en el área de juego (canvas y mando):
  - `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y sin resaltado al tocar.
  - El doble toque y el pellizco no hacen zoom ni scroll mientras se juega.
- **`next.config.ts`:** `allowedDevOrigins` se lee de la variable de entorno `DEV_ALLOWED_ORIGINS` (lista separada por comas) en lugar de la IP fija. La variable se documenta en `.env.local.example`.

**Fuera de alcance (para futuros specs):**

- Responsive del resto del sitio (nav, home, catálogo, detalle, leaderboard, about, auth). Va en la SPEC 11.
- Gestos nativos por juego: deslizar, arrastrar la pala o joystick analógico.
- Más de 2 botones de acción.
- Vibración (Vibration API) y sonido de los botones.
- Bloquear la orientación (`screen.orientation.lock`) y pedir girar el móvil.
- Mandos físicos (Gamepad API).
- Desactivar el zoom en todo el sitio (`user-scalable=no` en el viewport).
- Botón para mostrar u ocultar el mando a mano.
- Mando para los juegos sin motor, que usan la simulación de `GamePlayer`.
- Tests automatizados.

## Data model

No hay cambios en Supabase ni se guarda nada entre sesiones. Los cambios son de contrato en `lib/games/types.ts` y de configuración.

### Contrato táctil (`lib/games/types.ts`)

```ts
/** Botones del mando virtual. */
export type TouchButton = "up" | "down" | "left" | "right" | "a" | "b";

/** Lo que envía un botón: el `KeyboardEvent.code` que el motor ya escucha. */
export type TouchBinding = {
  code: string; // p. ej. "ArrowLeft", "Space"
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
  options?: GameOptions, // opcional: sin él, touch = false
) => GameInstance;

export type GameEngine = {
  factory: GameFactory;
  hasLives?: boolean;
  skins?: readonly SkinId[];
  /** Mapeo del mando virtual. Sin `touch`, no se muestra mando aunque el dispositivo sea táctil. */
  touch?: TouchLayout;
};
```

### Mapeo en `lib/games/registry.ts`

| Motor           | `up`      | `down`      | `left`      | `right`      | `a`              | `b`               |
| --------------- | --------- | ----------- | ----------- | ------------ | ---------------- | ----------------- |
| `asteroids`     | `ArrowUp` | —           | `ArrowLeft` | `ArrowRight` | `Space` "FUEGO"  | —                 |
| `caida`         | —         | `ArrowDown` | `ArrowLeft` | `ArrowRight` | `Space` "CAER"   | `ArrowUp` "ROTAR" |
| `bloque-buster` | —         | —           | `ArrowLeft` | `ArrowRight` | `Space` "INICIO" | —                 |
| `serpentina`    | `ArrowUp` | `ArrowDown` | `ArrowLeft` | `ArrowRight` | `Space` "INICIO" | —                 |

### Constantes del mando (`components/touch-controls.tsx`)

```ts
const REPEAT_DELAY_MS = 180; // la cruceta empieza a repetir tras 180 ms pulsada
const REPEAT_INTERVAL_MS = 60; // y repite cada 60 ms (keydown con repeat: true)
```

### Hooks nuevos

- `hooks/use-coarse-pointer.ts` → `useCoarsePointer(): boolean`. Usa `useSyncExternalStore` sobre `matchMedia("(pointer: coarse)")` y vale `false` en el servidor.
- `hooks/use-fullscreen.ts` → `useFullscreen(target)` y devuelve `{ active: boolean; mode: "native" | "immersive"; toggle: () => void }`.
  - `native`: Fullscreen API sobre `target`.
  - `immersive`: añade la clase `av-immersive` a `<html>`, que oculta nav y footer. Se quita al salir o al desmontar el player.

### Configuración

```bash
# .env.local.example
DEV_ALLOWED_ORIGINS=192.168.1.5,192.168.50.34   # orígenes LAN permitidos en `next dev` (opcional)
```

En `next.config.ts`, `allowedDevOrigins` es `DEV_ALLOWED_ORIGINS` partida por comas, sin espacios y sin entradas vacías. Si la variable no está, es `[]`.

## Implementation plan

1. **Variable `DEV_ALLOWED_ORIGINS`.** `next.config.ts` lee `allowedDevOrigins` de esa variable y deja de usar la IP fija. Se añade a `.env.local.example`. Antes, consultar `allowedDevOrigins` en `node_modules/next/dist/docs/`. Prueba manual: con la variable puesta, `npm run dev` abre desde el móvil en la LAN.
2. **Contrato.** En `lib/games/types.ts` se añaden `TouchButton`, `TouchBinding`, `TouchLayout`, `GameOptions`, el tercer parámetro opcional de `GameFactory` y `GameEngine.touch`. Los motores no cambian todavía, porque el parámetro es opcional. `npm run build` pasa.
3. **Hook `useCoarsePointer`** (`hooks/use-coarse-pointer.ts`). `GameCanvas` recibe la prop `touch` y la pasa al factory como `{ touch }`. El efecto depende de `[factory, touch]`, así que el motor se recrea si el valor cambia al hidratar. `GamePlayer` usa el hook y pasa el valor.
4. **Texto de inicio en los motores.** Los 4 factories leen `options?.touch` y dibujan "PULSA A PARA EMPEZAR" (en `caida`, "PULSA A") cuando es `true`. Prueba manual: con la emulación táctil de DevTools se ve el texto nuevo, y en escritorio el de siempre.
5. **Mapeo en el registro.** Se añade `touch` a las 4 entradas de `GAME_ENGINES` con la tabla del modelo de datos. Todavía no hay ningún cambio visible.
6. **Componente `TouchControls`** (`components/touch-controls.tsx`), diseñado con `/frontend-design`:
   - Cruceta, A/B, rótulos y botones apagados.
   - Teclas sintéticas con Pointer Events y repetición de la cruceta.
   - Al desmontarse o pasar a `disabled`, envía `keyup` de toda tecla que siga pulsada.
   - Props: `layout: TouchLayout` y `disabled: boolean`.
7. **Integración en `GamePlayer` en vertical.** Si `useCoarsePointer()` es `true` y el motor declara `touch`, se renderiza `TouchControls` bajo el canvas, con `disabled` mientras el modal está abierto. En táctil se ocultan el marco CRT y la franja "SEÑAL OK" y el HUD pasa a una versión compacta. Las clases nuevas van en `app/globals.css`. Prueba manual: `serpentina` jugable de principio a fin en emulación móvil vertical.
8. **Bloqueo de gestos.** `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y `-webkit-tap-highlight-color: transparent` en el canvas y el mando. Prueba manual: el doble toque y el pellizco sobre el área de juego no hacen zoom.
9. **Layout en horizontal.** Con `@media (orientation: landscape)` dentro del modo táctil: cruceta a la izquierda, canvas centrado ajustado a la altura disponible, A/B a la derecha y el HUD en una franja mínima arriba. Prueba manual: los 4 juegos en emulación horizontal sin scroll.
10. **Pantalla completa.** Hook `useFullscreen` (`hooks/use-fullscreen.ts`) con los modos `native` e `immersive`, la clase `av-immersive` en `globals.css` (oculta `.av-nav` y el footer) y el botón "PANTALLA COMPLETA" / "SALIR DE PANTALLA COMPLETA" en el HUD, solo en táctil. Al desmontar el player se sale de cualquiera de los dos modos.
11. **Verificación y cierre.**
    - Verificación visual con Playwright (emulación de móvil en vertical y horizontal), con capturas en `.playwright-screenshots/`.
    - `npm run lint` y `npm run build`.
    - Se actualiza `.claude/skills/add-game/platform-contract.md` con `GameOptions` y `GameEngine.touch`.
    - La spec pasa a `Implemented`.

## Acceptance criteria

**Mando y entrada**

- [ ] En un dispositivo con `pointer: coarse`, `/games/<id>/play` muestra el mando virtual (cruceta + A/B) en los 4 juegos: `asteroids`, `caida`, `bloque-buster` y `serpentina`.
- [ ] En escritorio (`pointer: fine`) el player se ve y funciona exactamente igual que antes de esta spec: sin mando, con marco CRT y con el texto "PULSA ESPACIO".
- [ ] En táctil, el canvas de los 4 juegos muestra "PULSA A PARA EMPEZAR" ("PULSA A" en `caida`), y pulsar `A` arranca la partida.
- [ ] Cada botón del mando produce en cada juego la acción de la tabla del modelo de datos. Por ejemplo, `B` rota la pieza en `caida` y `A` dispara en `asteroids`.
- [ ] Los botones sin binding se ven apagados y pulsarlos no tiene ningún efecto.
- [ ] Mantener pulsada ← en `caida` mueve la pieza varias columnas seguidas.
- [ ] Mantener ↑ en `asteroids` propulsa la nave de forma continua, y soltar para la propulsión.
- [ ] Arrastrar el dedo fuera de un botón pulsado suelta la tecla: la nave deja de girar y la pala deja de moverse.
- [ ] Con el modal "FIN DEL JUEGO" abierto, el mando no envía nada y el input de iniciales acepta el teclado del sistema con normalidad.
- [ ] PAUSA, FIN y SALIR del HUD funcionan en táctil igual que en escritorio.

**Layout y gestos**

- [ ] En vertical (p. ej. 412×915), nav, HUD compacto, canvas y mando caben sin scroll horizontal, y el mando queda bajo el canvas.
- [ ] En horizontal (p. ej. 915×412), la cruceta queda a la izquierda del canvas, A/B a la derecha y el conjunto no necesita scroll vertical para jugar.
- [ ] En táctil no se muestran el marco CRT decorativo ni la franja "SEÑAL OK".
- [ ] Un doble toque o un pellizco sobre el canvas o el mando no cambia el zoom de la página.
- [ ] Mantener pulsado un botón del mando no abre el menú contextual ni selecciona texto.

**Pantalla completa**

- [ ] En táctil, el HUD muestra el botón "PANTALLA COMPLETA". En escritorio no aparece.
- [ ] En Chrome Android, pulsarlo pone el player en pantalla completa nativa, y pulsar de nuevo ("SALIR DE PANTALLA COMPLETA") la quita.
- [ ] En un navegador sin Fullscreen API, pulsarlo oculta nav y footer (clase `av-immersive` en `<html>`), y pulsar de nuevo los muestra.
- [ ] Salir del player (SALIR o navegar a otra ruta) deja la página fuera de pantalla completa y sin `av-immersive`.

**Configuración y calidad**

- [ ] Con `DEV_ALLOWED_ORIGINS=192.168.x.y` en `.env.local`, `next dev` sirve la app desde esa IP sin bloquear los recursos de dev.
- [ ] Sin la variable, `next.config.ts` no falla y `allowedDevOrigins` es `[]`.
- [ ] `next.config.ts` ya no contiene ninguna IP fija.
- [ ] `.env.local.example` documenta `DEV_ALLOWED_ORIGINS`.
- [ ] `.claude/skills/add-game/platform-contract.md` documenta `GameOptions` y `GameEngine.touch`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Hay capturas de Playwright en vertical y horizontal en `.playwright-screenshots/`.

## Decisions

- **Sí:** mando virtual común con eventos de teclado sintéticos (`KeyboardEvent` en `window`). Los motores ya escuchan el teclado, así que la lógica de juego no cambia y cualquier juego futuro solo declara su `touch`.
- **No:** gestos nativos por juego (deslizar, arrastrar la pala, joystick). Serían 4 implementaciones distintas dentro de los motores y el mando dejaría de ser uniforme.
- **Sí:** dos botones de acción, `A` y `B`. Cubren todos los juegos actuales, y la mayoría de los arcade no necesita más.
- **No:** 4 botones en rombo, como en el boceto inicial. Sobran para los juegos actuales y ocupan espacio en vertical.
- **Sí:** los botones sin uso se muestran apagados. El mando es idéntico en todos los juegos y no salta de un layout a otro.
- **No:** ocultar los botones sin uso. El mando cambiaría de forma entre juegos.
- **Sí:** rótulos cortos bajo A/B ("FUEGO", "CAER", "ROTAR", "INICIO"), porque la acción de cada botón cambia según el juego.
- **Sí:** detección automática con `matchMedia("(pointer: coarse)")`. No requiere configuración y en escritorio no cambia nada.
- **No:** botón manual para mostrar u ocultar el mando ni preferencia en `localStorage`. Sería persistencia sin una necesidad real.
- **Sí:** `GameOptions.touch` como tercer parámetro opcional del factory, para que el motor cambie el texto de inicio. Es retrocompatible: sin opciones, `touch = false`.
- **No:** dejar el texto "PULSA ESPACIO" en táctil. Espacio no existe en un móvil.
- **Sí:** recrear el motor si `touch` cambia al hidratar (efecto con `[factory, touch]`). Solo ocurre en la pantalla de inicio, antes de jugar, así que no se pierde partida.
- **Sí:** repetición de la cruceta con 180 ms de retardo y 60 ms de intervalo. Imita la repetición del teclado del sistema, que `caida` necesita para mover la pieza varias columnas.
- **Sí:** pantalla completa con un botón y un modo inmersivo como alternativa. iPhone Safari no soporta la Fullscreen API en elementos, y ocultar nav y footer da la mayor parte del beneficio.
- **No:** pantalla completa automática al pulsar `A`. Es intrusivo y el navegador puede rechazarlo.
- **Sí:** bloquear zoom y gestos solo en el área de juego (`touch-action: none`).
- **No:** `user-scalable=no` en el viewport global. Rompe la accesibilidad del resto del sitio.
- **No:** bloquear la orientación (`screen.orientation.lock`). Se soportan las dos orientaciones con layouts propios.
- **Sí:** `allowedDevOrigins` desde `DEV_ALLOWED_ORIGINS`. La IP de la LAN cambia según la red y la máquina, y no debe quedar fija en el código versionado.
- **Sí:** separar el responsive del resto del sitio en la SPEC 11, porque son 7 páginas que no tienen que ver con el juego táctil.

## Risks

| Riesgo                                                                                           | Mitigación                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Un motor filtra eventos con `isTrusted` o deja de escuchar `window`                              | Ningún motor actual lo hace. `platform-contract.md` documenta que la entrada táctil llega como `KeyboardEvent` sintético en `window`.                        |
| Teclas "pegadas" si el dedo sale de la pantalla, llega una llamada o se oculta la pestaña        | `pointercancel`/`pointerleave` sueltan la tecla. Al desmontar o desactivar el mando se envía `keyup` de todas. Los motores ya pausan con `visibilitychange`. |
| Los dispositivos híbridos (portátil táctil con ratón) informan `pointer: fine` y no ven el mando | Se acepta: tienen teclado. El botón manual queda fuera de alcance.                                                                                           |
| Multitáctil: cruceta y A pulsados a la vez (girar y disparar en `asteroids`)                     | Pointer Events con un `pointerId` por botón, así que cada dedo se gestiona por separado. Se comprueba en un dispositivo real.                                |
| En horizontal, con poca altura, la barra del navegador reduce el canvas                          | Pantalla completa o modo inmersivo. Se usa `dvh` para la altura disponible.                                                                                  |
| `allowedDevOrigins` mal escrito en `.env.local` bloquea el acceso desde el móvil                 | Se filtran espacios y entradas vacías, y la variable se documenta con un ejemplo. Solo afecta a `next dev`.                                                  |

## What is **not** in this spec

- Responsive del resto del sitio (SPEC 11).
- Gestos nativos por juego, joystick analógico y más de 2 botones.
- Vibración y sonido de los botones.
- Bloqueo de orientación y Gamepad API.
- Desactivar el zoom en todo el sitio.
- Mando para los juegos sin motor.
- Tests automatizados.

Cada uno de estos puntos, si llega, va en su propia spec.

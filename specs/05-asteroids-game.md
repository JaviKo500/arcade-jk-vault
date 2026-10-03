# SPEC 05 — Juego Asteroids jugable en la plataforma

> **Estado:** Approved · **Depende de:** SPEC 01 (`01-mvp-visual-screens.md` — ruta `/games/[id]/play`, `GamePlayer`, modal de fin de partida), SPEC 02 (`02-home-landing-and-nav.md` — Home con `GAMES.slice(0, 6)`) · **Fecha:** 2026-10-03
> **Objetivo:** Portar el Asteroids de `references/02-asteroids/` a un motor TypeScript que se monta como un juego nuevo (`asteroids`) en `/games/asteroids/play` y envía puntuación, vidas, nivel y fin de partida al HUD y al modal de guardado de la plataforma.

## Scope

**Incluye:**

- Nueva entrada `asteroids` en `data/games.ts`, en la **primera posición** del array `GAMES`:
  - `title: "ASTEROIDS"`, `category: "SHOOTER"`, `accentColor: "cyan"`, `cover: "cover-asteroids"`.
  - `bestScore: 0`, `playCount: "NUEVO"`.
  - `shortDescription` y `longDescription` en español, escritas a partir de `references/02-asteroids/README.md`.
  - La entrada `rocas` (ROCAS) se mantiene sin cambios. Son juegos distintos.
- Portada CSS nueva `cover-asteroids` en `app/globals.css` (polígonos irregulares y nave triangular), visualmente distinta de `cover-rocas`.
- Motor del juego portado a TypeScript en `lib/games/asteroids/`:
  - Misma mecánica que `game.js`: física, rotación, empuje, envolvimiento toroidal, división de asteroides, puntos 20/50/100, 3 vidas con invencibilidad al reaparecer, niveles y power-up de disparo triple (`3x`).
  - Sin estado global ni listeners de `window` sueltos. Todo vive en una instancia creada con `createAsteroidsGame(canvas, callbacks)` y se limpia con `destroy()`.
  - API de control: `start`, `pause`, `resume`, `restart`, `end`, `destroy`.
  - Callbacks hacia la plataforma: `onScore`, `onLives`, `onLevel`, `onGameOver`.
- Paleta neón de la plataforma en el canvas: nave cyan, asteroides blancos/magenta, balas amarillas y fuente de la plataforma para el indicador `3x`. Solo cambian los colores; la mecánica es la misma.
- En el canvas ya no se dibujan el texto de score, nivel y vidas ni el overlay "GAME OVER". Solo queda el indicador temporal `3x N.Ns` del power-up.
- Pantalla de inicio en el canvas ("PULSA ESPACIO PARA EMPEZAR"). La partida no arranca hasta que se pulsa Espacio.
- Controles:
  - Flechas para rotar y propulsar, y Espacio para disparar.
  - `P` o `Esc` alternan la pausa.
  - Flechas y Espacio llaman a `preventDefault` para que la página no haga scroll.
  - El motor ignora el teclado mientras el modal de fin de partida está abierto.
- Pausa automática al ocultarse la pestaña (`visibilitychange`).
- Canvas con resolución lógica fija de 800×600, escalado por CSS al ancho del CRT con proporción 4:3.
- Integración en `GamePlayer` (`components/game-player.tsx`):
  - Registro simple `gameId → componente de motor`. `asteroids` usa el motor real.
  - El HUD React (Jugador / Puntuación / Vidas / Nivel) muestra los datos reales del motor.
  - **PAUSA/REANUDAR** controla el motor.
  - **FIN** termina la partida y abre el modal "FIN DEL JUEGO" con la puntuación actual.
  - **JUGAR DE NUEVO** reinicia el motor.
- Guardado de puntuación con `addSavedScore` (`localStorage`), igual que hoy.
- Los otros 8 juegos (incluido `rocas`) siguen con la simulación actual de `GamePlayer`, sin cambios de comportamiento.

**Fuera de alcance (para futuros specs):**

- Controles táctiles y juego en móvil.
- Hacer configurable por juego la etiqueta fija "TECLADO / TÁCTIL" de la página de detalle.
- Persistencia de puntuaciones en Supabase y leaderboard real. Las puntuaciones del detalle y de `/leaderboard` siguen siendo mock.
- Actualizar `bestScore`/`playCount` con datos reales.
- Sonido y música.
- Cambios de mecánica o de balance (nuevos power-ups, OVNIs, dificultad).
- Implementar los demás juegos del catálogo.
- Tests automatizados (no hay script de test configurado).

## Data model

Contrato común entre la plataforma y cualquier motor de juego:

```ts
// lib/games/types.ts
export type GameCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onPauseChange: (paused: boolean) => void; // también se dispara con P/Esc y visibilitychange
  onGameOver: (finalScore: number) => void;
};

export type GameInstance = {
  start: () => void; // arranca el loop y muestra la pantalla de inicio
  pause: () => void;
  resume: () => void;
  restart: () => void; // nueva partida: score 0, 3 vidas, nivel 1, vuelve a la pantalla de inicio
  end: () => void; // fuerza el fin de partida y dispara onGameOver con el score actual
  setInputEnabled: (enabled: boolean) => void; // false mientras el modal está abierto
  destroy: () => void; // cancela requestAnimationFrame y quita todos los listeners
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameInstance;
```

```ts
// lib/games/registry.ts
export const GAME_ENGINES: Partial<Record<string, GameFactory>> = {
  asteroids: createAsteroidsGame,
};
// Si un gameId no está en el registro, GamePlayer usa la simulación actual.
```

Estado interno del motor (privado a `lib/games/asteroids/engine.ts`, no se exporta):

```ts
type Phase = "ready" | "playing" | "dead" | "gameover";
// "ready": pantalla "PULSA ESPACIO PARA EMPEZAR"
// "dead": nave destruida, esperando 2 s para reaparecer
// "gameover": vidas agotadas o end(); ya se llamó a onGameOver

type EngineState = {
  phase: Phase;
  paused: boolean;
  score: number;
  lives: number; // empieza en 3
  level: number; // empieza en 1
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerUps: PowerUp[];
  deadTimer: number;
  powerUpSpawned: boolean;
  killsSinceSpawn: number;
};
```

Nueva entrada en `data/games.ts` (primera posición de `GAMES`):

```ts
{
  id: "asteroids",
  title: "ASTEROIDS",
  shortDescription: "...",  // en español, a partir del README
  longDescription: "...",
  category: "SHOOTER",
  cover: "cover-asteroids",
  accentColor: "cyan",
  bestScore: 0,
  playCount: "NUEVO",
}
```

Archivos del motor:

- `lib/games/asteroids/constants.ts`: `W`, `H`, `RADII`, `SPEEDS`, `POINTS`, constantes del power-up y la paleta (`COLORS`).
- `lib/games/asteroids/entities.ts`: clases `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle`. Reciben `ctx` y el estado de input como parámetros, sin globales.
- `lib/games/asteroids/engine.ts`: `createAsteroidsGame`, que contiene el loop, la entrada de teclado, las colisiones, los niveles y el dibujo.

Convenciones:

- Coordenadas con origen arriba a la izquierda, en un espacio lógico de 800×600 independiente del tamaño CSS del canvas.
- Velocidades en px/s y `dt` en segundos, con tope de 0,05 s, igual que el original.
- Los callbacks se llaman solo cuando el valor cambia, no en cada frame.
- La paleta se lee de constantes en `constants.ts`, no de variables CSS en tiempo de ejecución.
- El juego no crea nuevos datos persistentes: el guardado reutiliza `SavedScore` de `lib/saved-scores.ts` sin cambios.

## Implementation plan

1. Agregar la entrada `asteroids` en la primera posición de `GAMES` (`data/games.ts`) y la portada `cover-asteroids` en `app/globals.css`.
   - Prueba manual: Home y `/games` muestran ASTEROIDS con su portada.
   - `/games/asteroids` abre el detalle, y `/games/asteroids/play` sigue con la simulación actual.
   - ROCAS sigue igual.
2. Crear `lib/games/types.ts` (`GameCallbacks`, `GameInstance`, `GameFactory`) y `lib/games/asteroids/constants.ts` (dimensiones, tablas por tamaño, constantes del power-up y paleta neón `COLORS`). Todavía no se monta nada.
3. Portar las clases a `lib/games/asteroids/entities.ts` (`Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`).
   - Misma lógica que `game.js`.
   - `ctx`, el input y la paleta llegan como parámetros, sin globales.
   - Compila sin usarse todavía.
4. Crear `lib/games/asteroids/engine.ts` con `createAsteroidsGame(canvas, callbacks)`:
   - Estado `EngineState` y fases `ready → playing ⇄ dead → gameover`.
   - Loop con `requestAnimationFrame`, `dt` con tope de 0,05 s y colisiones, puntos, niveles y power-up iguales al original.
   - Dibujo con la paleta neón, solo el indicador `3x` como HUD en el canvas y la pantalla de inicio "PULSA ESPACIO PARA EMPEZAR".
   - Callbacks llamados solo cuando cambia el valor.
5. Completar el motor con la entrada y el ciclo de vida:
   - Listeners de `keydown`/`keyup` con `preventDefault` en flechas y Espacio, y `P`/`Esc` para alternar la pausa.
   - `visibilitychange` pausa el juego.
   - `setInputEnabled`, `pause`, `resume`, `restart` y `end`.
   - `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners.
6. Crear `lib/games/registry.ts` (`GAME_ENGINES` con `asteroids`) y `components/game-canvas.tsx`:
   - Componente cliente que renderiza un `<canvas width={800} height={600}>`.
   - Crea la instancia con la `GameFactory` en un `useEffect`, la entrega a su padre y llama a `destroy()` en el cleanup. Esto también cubre el doble montaje de StrictMode.
   - Agregar en `app/globals.css` el estilo que escala el canvas al ancho del CRT con `aspect-ratio: 4 / 3`.
   - Antes de escribirlo, consultar `node_modules/next/dist/docs/` sobre componentes cliente.
7. Integrar en `components/game-player.tsx` el HUD y el fin de partida:
   - Si `GAME_ENGINES[game.id]` existe, renderizar `GameCanvas` dentro de `crt-screen` en lugar de `game-arena`, y desactivar el `setInterval` de simulación.
   - `score`, `lives` y `level` pasan a ser estado alimentado por `onScore`, `onLives` y `onLevel`. Se elimina el `level` calculado y el `lives` fijo para los juegos con motor.
   - `onGameOver` abre el modal "FIN DEL JUEGO" y llama a `setInputEnabled(false)`.
   - Prueba manual: jugar, ver que el HUD se actualiza, perder las 3 vidas, ver el modal y guardar la puntuación.
8. Conectar los botones de `GamePlayer` al motor:
   - **PAUSA/REANUDAR** llama a `pause`/`resume`, y su etiqueta se sincroniza con `onPauseChange`, incluida la pausa por `P`/`Esc` o por ocultar la pestaña.
   - **FIN** llama a `end()`.
   - **JUGAR DE NUEVO** llama a `restart()` y a `setInputEnabled(true)` y resetea el estado del modal.
   - **SALIR** y **VOLVER AL VAULT** navegan, y el desmontaje llama a `destroy()`.
   - Los juegos sin motor siguen con el flujo de simulación actual.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

**Catálogo**

- [ ] `GAMES[0]` en `data/games.ts` es la entrada `asteroids` con `title: "ASTEROIDS"`, `category: "SHOOTER"`, `cover: "cover-asteroids"`, `bestScore: 0` y `playCount: "NUEVO"`.
- [ ] La entrada `rocas` no cambia respecto a `main`.
- [ ] Home muestra ASTEROIDS como primera tarjeta, con la portada `cover-asteroids` visible y distinta de la de ROCAS.
- [ ] `/leaderboard` abre por defecto la pestaña ASTEROIDS.
- [ ] `/games/asteroids` muestra el detalle, y **JUGAR AHORA** lleva a `/games/asteroids/play`.

**Motor**

- [ ] Al entrar en `/games/asteroids/play`, el canvas muestra "PULSA ESPACIO PARA EMPEZAR". No aparecen asteroides en movimiento ni se pierden vidas hasta pulsar Espacio.
- [ ] Las flechas izquierda y derecha rotan la nave, la flecha arriba la propulsa y Espacio dispara.
- [ ] Mientras el canvas está montado, ni las flechas ni Espacio hacen scroll de la página.
- [ ] Destruir un asteroide grande, mediano o pequeño suma exactamente 20, 50 o 100 puntos.
- [ ] Un asteroide grande se divide en dos medianos, y un mediano en dos pequeños. Los pequeños desaparecen sin dividirse.
- [ ] La nave, los asteroides, las balas y los power-ups que salen por un borde entran por el opuesto.
- [ ] Al chocar con un asteroide se pierde una vida, y la nave reaparece en el centro a los 2 s parpadeando durante su invencibilidad.
- [ ] Al destruir todos los asteroides de un nivel, el nivel sube en 1 y aparecen `3 + nivel` asteroides grandes.
- [ ] Recoger el power-up activa el disparo triple durante 5 s, y el canvas muestra el indicador `3x N.Ns`.
- [ ] El canvas no dibuja el texto de score, nivel y vidas ni ningún overlay "GAME OVER".
- [ ] La nave se dibuja en cyan, los asteroides en blanco/magenta y las balas en amarillo.
c
**Integración con la plataforma**

- [ ] Los valores de Puntuación, Vidas y Nivel del HUD React coinciden en todo momento con el estado del motor.
- [ ] Al perder la tercera vida se abre el modal "FIN DEL JUEGO" con la puntuación final del motor.
- [ ] Con el modal abierto, escribir en el input de iniciales no mueve la nave ni dispara.
- [ ] **GUARDAR PUNTUACIÓN** agrega a `localStorage` (`arcade-vault:saved-scores`) un registro con `gameId: "asteroids"` y la puntuación final.
- [ ] **JUGAR DE NUEVO** cierra el modal y vuelve a la pantalla de inicio con score 0, 3 vidas y nivel 1.
- [ ] **PAUSA** congela el juego, y **REANUDAR** lo continúa desde el mismo estado.
- [ ] `P` y `Esc` alternan la pausa, y la etiqueta del botón cambia en consecuencia.
- [ ] Cambiar de pestaña del navegador y volver deja el juego en pausa, con el botón mostrando **REANUDAR**.
- [ ] **FIN** abre el modal con la puntuación actual.
- [ ] Tras salir con **SALIR** y volver a entrar en `/games/asteroids/play`, solo corre un loop de juego: la nave no va al doble de velocidad y cada disparo sale una sola vez.
- [ ] En un viewport de 480 px de ancho, el canvas se escala manteniendo la proporción 4:3 y no hay overflow horizontal.

**No regresiones**

- [ ] `/games/rocas/play` y el resto de juegos sin motor siguen con la simulación actual de puntuación.
- [ ] `next dev` no muestra errores en consola en `/`, `/games`, `/games/asteroids`, `/games/asteroids/play` ni `/leaderboard`.
- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores en los archivos nuevos o modificados por esta spec.

## Decisions

- **Sí:** ASTEROIDS como entrada nueva (`asteroids`), distinta de ROCAS. Son juegos diferentes, y así lo pidió el usuario.
- **No:** reutilizar o renombrar la entrada `rocas`. Mezclaría dos juegos distintos en una misma URL y en el mismo historial de puntuaciones.
- **Sí:** ASTEROIDS en la primera posición de `GAMES`. Es el único juego jugable, así que debe aparecer en Home y como pestaña inicial de `/leaderboard`. El costo es que DUELO PIXEL sale del top 6 de Home.
- **Sí:** `bestScore: 0` y `playCount: "NUEVO"`. No se inventan datos para un juego que acaba de llegar.
- **Sí:** portar `game.js` a un motor TypeScript (`lib/games/asteroids/`) con la API `createAsteroidsGame(canvas, callbacks)`. Es la única forma de que la puntuación, las vidas, el nivel y el fin de partida lleguen a la plataforma.
- **No:** `<iframe>` con los archivos originales en `public/`. Aísla el juego y obliga a usar `postMessage` para compartir la puntuación, y el objetivo de la plataforma es competir por puntuación.
- **Sí:** contrato genérico `GameFactory`/`GameInstance` en `lib/games/types.ts` más un registro `GAME_ENGINES`. Los próximos juegos se agregan sin tocar `GamePlayer`.
- **Sí:** los juegos sin motor siguen con la simulación actual. No se rompe ninguna pantalla existente.
- **No:** pantalla "PRÓXIMAMENTE" para los juegos sin motor. Cambia la UX de 8 juegos fuera del objetivo de esta spec.
- **Sí:** el HUD y el fin de partida los gestiona la plataforma (HUD React y modal "FIN DEL JUEGO"), y se quitan del canvas. Así no hay información duplicada ni dos flujos de reinicio.
- **Sí:** mantener en el canvas solo el indicador `3x` del power-up. Es información propia de la mecánica del juego, sin equivalente en el HUD de la plataforma.
- **Sí:** mecánica idéntica al original, incluido el power-up de disparo triple. Esta spec es un port, no un rediseño.
- **Sí:** recolorear a la paleta neón de la plataforma. Es un cambio solo visual que integra el juego con la estética del sitio.
- **Sí:** pantalla de inicio "PULSA ESPACIO PARA EMPEZAR". Evita perder vidas mientras la página carga o el usuario aún no tiene el foco.
- **Sí:** pausa con `P`/`Esc` y pausa automática con `visibilitychange`, sincronizadas con el botón vía `onPauseChange`. La etiqueta del botón nunca queda desincronizada.
- **Sí:** `setInputEnabled(false)` mientras el modal está abierto. Escribir las iniciales no debe mover la nave.
- **Sí:** resolución lógica fija de 800×600, escalada por CSS con `aspect-ratio: 4 / 3`. Mantiene la física y las colisiones del original sin recalcular nada.
- **Sí:** guardar puntuaciones solo en `localStorage` mediante `addSavedScore`. La tabla de scores en Supabase ya está prevista como spec propia (ver SPEC 04).
- **No:** controles táctiles. Merecen su propio diseño (joystick virtual o botones en pantalla) y su propia spec.
- **No:** hacer configurable la etiqueta "TECLADO / TÁCTIL" del detalle. Es un ajuste de datos de todo el catálogo, ajeno al port.
- **Sí:** identificadores de código en inglés y textos visibles en español, mismo criterio que las specs 01 a 04.

## Risks

| Riesgo                                                                                                                                                                            | Mitigación                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta, desmonta y vuelve a montar `GameCanvas` en desarrollo. Si `destroy()` no limpia todo, quedan dos loops o listeners duplicados (nave más rápida, disparo doble). | `destroy()` cancela el `requestAnimationFrame` y quita cada listener que el motor registró. Hay un criterio de aceptación específico para salir y volver a entrar.            |
| Los listeners de teclado en `window` con `preventDefault` en flechas y Espacio pueden bloquear el scroll o la escritura en otros elementos de la página.                          | Los listeners viven solo mientras el canvas está montado. Con `setInputEnabled(false)` el motor no llama a `preventDefault`, y el input de iniciales funciona con normalidad. |
| La plataforma y el motor pueden quedar desincronizados (por ejemplo, el botón muestra PAUSA con el juego pausado por `Esc`).                                                      | El motor es la única fuente de verdad. La plataforma solo refleja su estado vía `onPauseChange`, `onScore`, `onLives` y `onLevel`, nunca lo deduce.                           |
| Llamar a callbacks que hacen `setState` en cada frame provocaría re-renders a 60 fps del HUD.                                                                                     | Los callbacks se disparan solo cuando el valor cambia (convención del data model).                                                                                            |
| Al pausar con `visibilitychange`, el primer `dt` tras reanudar puede ser enorme.                                                                                                  | Tope de `dt` en 0,05 s (igual que el original), y `lastTime` se reinicia al reanudar.                                                                                         |
| Las fuentes de la plataforma pueden no estar cargadas cuando el canvas dibuja el indicador `3x` o la pantalla de inicio.                                                          | Fallback a `monospace` en la declaración de `ctx.font`. El texto se redibuja en cada frame, así que en cuanto la fuente carga se usa sola.                                    |
| La API de componentes cliente de Next 16 o la forma de pasar `ref` en React 19 difieren de lo recordado.                                                                          | Consultar `node_modules/next/dist/docs/` antes de escribir `game-canvas.tsx`, como indican `AGENTS.md` y `CLAUDE.md`.                                                         |

## What is **not** in this spec

- Controles táctiles y juego en móvil.
- Etiqueta "TECLADO / TÁCTIL" configurable por juego.
- Persistencia de puntuaciones en Supabase y leaderboard real.
- `bestScore`/`playCount` con datos reales.
- Sonido y música.
- Cambios de mecánica o de balance.
- Implementación de los demás juegos del catálogo.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

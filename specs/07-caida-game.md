# SPEC 07 — Juego CAÍDA (Tetris) jugable con leaderboard

> **Estado:** Approved · **Depende de:** SPEC 05 (`05-asteroids-game.md` — contrato `GameFactory`, `GameCanvas`, `GamePlayer`), SPEC 06 (`06-games-and-leaderboard-supabase.md` — tablas `games` y `scores`, leaderboard) · **Fecha:** 2026-10-05
> **Objetivo:** Portar el Tetris de `references/03-tetris/` a un motor TypeScript que da vida al juego existente `caida` en `/games/caida/play`, envía puntuación, nivel y fin de partida al HUD y al leaderboard de la plataforma, y amplía el registro de motores con `hasLives` para que los juegos sin vidas oculten "Vidas" en el HUD.

## Scope

**Incluye:**

- Catálogo: se reutiliza la fila existente `caida` de `public.games` **sin migración**. El `id`, el título CAÍDA, las descripciones, la categoría `PUZZLE`, el acento `magenta`, la portada `cover-tetro` y el `sort_order = 3` no cambian.
- Portada: `cover-tetro` en `app/globals.css` se mantiene sin cambios.
- Ampliación retrocompatible del registro de motores:
  - Nuevo tipo `GameEngine = { factory: GameFactory; hasLives?: boolean }` en `lib/games/types.ts`. `hasLives` vale `true` por defecto.
  - `GAME_ENGINES` en `lib/games/registry.ts` pasa a `Partial<Record<string, GameEngine>>`. ASTEROIDS se registra como `{ factory: createAsteroidsGame }`.
  - `components/game-player.tsx` lee `GAME_ENGINES[game.id]?.factory` y oculta el bloque "Vidas" del HUD si `hasLives === false`.
  - El comentario de `restart()` en `GameInstance` deja de afirmar "3 vidas" y pasa a decir "estado inicial del juego".
- Motor portado a TypeScript en `lib/games/caida/` con `createCaidaGame(canvas, callbacks)`:
  - Mecánica idéntica a `references/03-tetris/game.js`:
    - Tablero de 10×20 celdas de 30 px y las **8 piezas**: I, O, T, S, Z, J, L y la tuerca `N`, un anillo 3×3 con el centro hueco. Las 8 tienen la misma probabilidad.
    - Rotación horaria con wall kicks `[0, −1, 1, −2, 2]`, pieza fantasma, vista previa de la pieza siguiente y limpieza de líneas.
    - Puntuación `[0, 100, 300, 500, 800] × nivel` por líneas, +2 por celda en el hard drop y +1 por fila en el soft drop.
    - Nivel = `floor(líneas / 10) + 1` e intervalo de caída `max(100, 1000 − (nivel − 1) × 90)` ms.
    - Fin de partida cuando la pieza nueva colisiona al aparecer.
  - Puntuación limitada a 10.000.000 dentro del motor, para que siempre quepa en `scores.score`.
  - Sin estado global ni listeners sueltos. API `start`, `pause`, `resume`, `restart`, `end`, `setInputEnabled` y `destroy`.
  - Callbacks `onScore`, `onLevel`, `onPauseChange` y `onGameOver`, solo cuando cambia el valor. `onLives` no se llama nunca.
- Un único canvas lógico de 800×600 (sin tocar `GameCanvas` ni `.game-canvas`):
  - Tablero centrado (x 250–550, alto completo) con rejilla tenue.
  - Panel izquierdo con CONTROLES.
  - Panel derecho con SIGUIENTE (pieza siguiente) y LÍNEAS.
  - Ni la puntuación, ni el nivel ni el overlay "GAME OVER" o "PAUSA" se dibujan en el canvas. Se ven en el HUD y en el modal de la plataforma.
- Pantalla de inicio en el canvas, "PULSA ESPACIO PARA EMPEZAR". La partida no arranca hasta pulsar Espacio, y esa pulsación no provoca un hard drop.
- Controles:
  - `←`/`→` mueven la pieza, `↑`/`X` la rotan, `↓` hace soft drop y `Espacio` hard drop.
  - `P` o `Esc` alternan la pausa.
  - `preventDefault` en las flechas, Espacio y `X`.
  - Se mantiene la autorrepetición de teclas del sistema operativo, como en el original.
  - El motor ignora el teclado mientras el modal está abierto.
- Pausa automática al ocultarse la pestaña (`visibilitychange`).
- Paleta neón en `lib/games/caida/constants.ts`:
  - I cyan `#00f5ff`, O amarillo `#f5ff00`, T violeta `#aa00ff`, S verde `#00ff88`.
  - Z magenta `#ff006e`, J azul `#3d7bff`, L naranja `#ff7700` y tuerca gris metálico `#8a8fb5`.
  - Fondo `#0a0a0f`.
- Se eliminan del port: el HUD y el overlay del DOM, el botón Reiniciar, la pausa propia, el tema claro/oscuro con `localStorage('tetris-theme')` y la lectura de `--grid-line` desde CSS.
- Registro `caida: { factory: createCaidaGame, hasLives: false }` en `GAME_ENGINES`.
- Leaderboard: las puntuaciones guardadas desde el modal aparecen en `/leaderboard?game=caida` y en el top de `/games/caida`, sin cambios en `scores`, `game_stats` ni `leaderboard`.

**Fuera de alcance (para futuros specs):**

- Controles táctiles y juego en móvil.
- Sonido y música.
- Cambios de mecánica o de balance: quitar la tuerca, DAS/ARR propios, hold, 7-bag, T-spins, combos o rotación SRS.
- Mostrar las líneas en el HUD React (callback `onLines`).
- Cambiar textos o portada de `caida` en el catálogo.
- Antitrampas y validación de puntuación en el servidor.
- Implementar otros juegos del catálogo.
- Tests automatizados (no hay script de test configurado).

## Data model

### Catálogo (sin cambios)

La fila existente de `public.games` se reutiliza tal cual. No hay migración, y `npm run db:types` no se ejecuta.

```sql
-- Fila actual, sin cambios (sembrada por 20261003140948_games_and_scores.sql)
-- id = 'caida', title = 'CAÍDA', category = 'PUZZLE', cover = 'cover-tetro',
-- accent_color = 'magenta', sort_order = 3
```

### Ampliación del contrato (retrocompatible)

```ts
// lib/games/types.ts — se añade
export type GameEngine = {
  factory: GameFactory;
  /** `false` en juegos sin vidas: el HUD oculta "Vidas" y el motor no llama a `onLives`. Por defecto, `true`. */
  hasLives?: boolean;
};

// GameInstance.restart — solo cambia el comentario:
/** Nueva partida con el estado inicial del juego. Vuelve a la pantalla de inicio. */
```

```ts
// lib/games/registry.ts
export const GAME_ENGINES: Partial<Record<string, GameEngine>> = {
  asteroids: { factory: createAsteroidsGame },
  caida: { factory: createCaidaGame, hasLives: false },
};
```

```ts
// components/game-player.tsx — lectura del registro
const engine = GAME_ENGINES[game.id];
const engineFactory = engine?.factory;
const showLives = engine?.hasLives !== false; // la simulación y ASTEROIDS siguen mostrando "Vidas"
```

`GameCallbacks`, `GameFactory` y `GameCanvas` no cambian.

### Estado interno del motor (privado de `lib/games/caida/engine.ts`)

```ts
type Phase = "ready" | "playing" | "gameover";
// "ready": pantalla "PULSA ESPACIO PARA EMPEZAR", con el tablero vacío
// "playing": partida en curso (la pausa es un flag aparte, como en ASTEROIDS)
// "gameover": la pieza nueva colisionó al aparecer, o se llamó a end(). Ya se llamó a onGameOver

type Piece = {
  type: PieceType; // 1..8 (8 = tuerca)
  shape: number[][]; // matriz cuadrada; cada celda vale 0 o el índice de color
  x: number; // columna de la esquina superior izquierda
  y: number; // fila de la esquina superior izquierda
};

type EngineState = {
  phase: Phase; // "ready"
  paused: boolean; // false
  inputEnabled: boolean; // true
  board: number[][]; // ROWS × COLS; 0 = vacía, 1..8 = índice de color
  current: Piece;
  next: Piece;
  score: number; // 0, limitado a MAX_SCORE
  lines: number; // 0
  level: number; // 1
  dropAccum: number; // 0, en segundos
  dropInterval: number; // 1.0 s = max(0.1, 1 − (level − 1) × 0.09)
};
```

### Archivos del motor

- `lib/games/caida/constants.ts`:
  - Medidas: `W = 800`, `H = 600`, `COLS = 10`, `ROWS = 20`, `BLOCK = 30`, `BOARD_X = 250`, `BOARD_Y = 0`.
  - Tablas: `PIECES` (las 8 matrices del original, en el mismo orden), `LINE_SCORES = [0, 100, 300, 500, 800]` y `KICKS = [0, -1, 1, -2, 2]`.
  - Límites: `MAX_SCORE = 10_000_000` y `MAX_DT = 0.05`.
  - Paleta `COLORS`: `background`, `grid`, `text`, `textDim` y `pieces`, indexado de 1 a 8.
- `lib/games/caida/entities.ts`: funciones puras sin globales. Reciben el tablero o el `ctx` como parámetros.
  - `createBoard`, `randomPiece`, `collide(board, shape, x, y)` y `rotateCW`.
  - `merge`, `clearFullRows`, que devuelve el número de líneas limpiadas, y `ghostY`.
  - `drawBlock(ctx, px, py, colorIndex, size, alpha)`.
- `lib/games/caida/engine.ts`:
  - `createCaidaGame: GameFactory`.
  - Loop, entrada de teclado y fases.
  - Reglas de puntuación, nivel y fin de partida.
  - Dibujo del tablero, la pieza fantasma, los paneles y la pantalla de inicio.
  - `sync()` para disparar los callbacks.

### Puntuación y tope

| Acción                | Puntos                        |
| --------------------- | ----------------------------- |
| 1 / 2 / 3 / 4 líneas  | 100 / 300 / 500 / 800 × nivel |
| Soft drop (`↓`)       | +1 por fila bajada            |
| Hard drop (`Espacio`) | +2 por celda recorrida        |

El nivel se calcula con el total de líneas **después** de sumar los puntos de la jugada, igual que el original. La puntuación se limita con `Math.min(score, MAX_SCORE)` en un único punto (`addScore`). En una partida normal ese tope no se alcanza.

### Convenciones

- Coordenadas con origen arriba a la izquierda en el espacio lógico de 800×600. El tablero se dibuja con un desplazamiento `BOARD_X`, y la lógica trabaja en celdas.
- `dt` en segundos, con tope de 0,05 s. El original acumula milisegundos. El port acumula segundos y, como el original, pone `dropAccum` a 0 al bajar una fila (no resta el intervalo).
- Callbacks solo cuando el valor cambia, vía `sync()` y la caché `reported`.
- La paleta sale de `constants.ts`, nunca de variables CSS.
- El juego no crea datos persistentes. El guardado es el de `GamePlayer` (`insertScore`).

## Implementation plan

1. **Registro de motores con `hasLives`.** Antes de tocar el componente, consultar en `node_modules/next/dist/docs/01-app/` lo relativo a componentes cliente.
   - `lib/games/types.ts`: añadir `GameEngine` y actualizar el comentario de `restart()`.
   - `lib/games/registry.ts`: cambiar el tipo a `Partial<Record<string, GameEngine>>` y registrar `asteroids: { factory: createAsteroidsGame }`.
   - `components/game-player.tsx`: leer `engine?.factory`. Si `hasLives === false`, no renderizar el bloque `hud-stat lives`.
   - Prueba manual: ASTEROIDS juega, pausa y guarda igual que antes, con "Vidas" visible. `/games/caida/play` sigue con la simulación y "Vidas" visible.
2. **Constantes.** Crear `lib/games/caida/constants.ts` con las medidas, `PIECES` (las 8 del original), `LINE_SCORES`, `KICKS`, `MAX_SCORE`, `MAX_DT` y la paleta `COLORS`. Compila sin usarse.
3. **Entidades.** Crear `lib/games/caida/entities.ts` con `createBoard`, `randomPiece`, `collide`, `rotateCW`, `merge`, `clearFullRows`, `ghostY` y `drawBlock`.
   - Misma lógica que `game.js`, con el tablero y el `ctx` como parámetros.
   - Compila sin usarse.
4. **Núcleo del motor.** Crear `lib/games/caida/engine.ts` con `createCaidaGame(canvas, callbacks)`:
   - `EngineState`, fases `ready → playing → gameover` y `paused` como flag.
   - Loop con `requestAnimationFrame`, `dt` con tope de `MAX_DT` y caída automática por `dropAccum`/`dropInterval`.
   - `spawn`, `lockPiece`, `softDrop`, `hardDrop` y `tryRotate` con wall kicks.
   - Puntuación con `addScore` y tope `MAX_SCORE`, más el cálculo de nivel e intervalo tras limpiar líneas.
   - Fin de partida cuando la pieza nueva colisiona al aparecer, con fase `gameover` y `onGameOver(score)`.
   - `sync()` con la caché `reported` para `onScore`, `onLevel` y `onPauseChange`, y comprobación de `destroyed` tras `sync()`.
   - Sin registrar todavía. Compila sin usarse.
5. **Dibujo.** Diseñar con `/frontend-design` la distribución del canvas: paneles, tipografía y pantalla de inicio. Implementarla en `engine.ts`:
   - Fondo `#0a0a0f`, rejilla tenue y tablero en x 250–550 con las piezas en la paleta neón.
   - Pieza fantasma con `globalAlpha = 0.2`.
   - Panel izquierdo CONTROLES y panel derecho SIGUIENTE (pieza centrada en una caja de 4×4 celdas) y LÍNEAS.
   - Pantalla `ready` con "PULSA ESPACIO PARA EMPEZAR".
   - Fuente `--font-press-start-2p` con fallback `monospace`.
   - Sin puntuación, nivel ni overlays de pausa o fin de partida.
6. **Entrada y ciclo de vida.** En `engine.ts`:
   - `keydown` en `window` con handler con nombre. Si `inputEnabled` es `false`, sale antes del `preventDefault`.
   - `preventDefault` en las flechas, Espacio y `X`. `P`/`Esc` alternan la pausa.
   - En `ready`, Espacio arranca la partida sin hacer hard drop. En `playing` y sin pausa, las teclas mueven, rotan o dejan caer la pieza.
   - `visibilitychange` pausa el juego.
   - `pause`, `resume` (reinicia `lastTime`), `restart` (tablero vacío, score 0, líneas 0, nivel 1, fase `ready`), `end`, `setInputEnabled` y `destroy` (cancela el `requestAnimationFrame` y quita los dos listeners).
7. **Registro e integración.** Añadir `caida: { factory: createCaidaGame, hasLives: false }` a `GAME_ENGINES`.
   - Prueba manual: `/games/caida/play` muestra el motor real sin "Vidas" en el HUD.
   - Jugar una partida, ver la Puntuación y el Nivel actualizados, perder, ver el modal y guardar.
8. **Leaderboard.** Guardar una puntuación de CAÍDA y verla en `/leaderboard?game=caida` y en el top de `/games/caida`. Si los pasos anteriores son correctos, no requiere cambios de código.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

**Catálogo**

- [ ] `public.games` mantiene la fila `caida` sin cambios (`title`, descripciones, `category = 'PUZZLE'`, `cover = 'cover-tetro'`, `accent_color = 'magenta'`, `sort_order = 3`), y no hay migración nueva en `supabase/migrations/`.
- [ ] `/games` y Home muestran CAÍDA con la portada `cover-tetro`, igual que antes.
- [ ] `/games/caida` muestra el detalle, y **JUGAR AHORA** lleva a `/games/caida/play`.

**Contrato**

- [ ] `lib/games/types.ts` exporta `GameEngine`, y `GAME_ENGINES` es `Partial<Record<string, GameEngine>>`.
- [ ] En `/games/caida/play` el HUD no muestra el bloque "Vidas".
- [ ] En `/games/asteroids/play` y en los juegos con simulación, el HUD sigue mostrando "Vidas".

**Motor**

- [ ] Al entrar en `/games/caida/play`, el canvas muestra "PULSA ESPACIO PARA EMPEZAR" y no cae ninguna pieza hasta pulsar Espacio.
- [ ] La pulsación de Espacio que arranca la partida no hace hard drop de la primera pieza.
- [ ] `←`/`→` mueven la pieza una columna, `↑` y `X` la rotan en sentido horario, `↓` la baja una fila y Espacio la deja caer hasta el fondo.
- [ ] Una pieza pegada a la pared rota si alguno de los desplazamientos `0, −1, +1, −2, +2` la deja sin colisión. Si ninguno lo consigue, la pieza no cambia.
- [ ] Aparecen las 8 piezas del original, incluida la tuerca (anillo 3×3 gris con el centro hueco).
- [ ] La pieza fantasma se dibuja translúcida en la posición donde aterrizaría la pieza actual.
- [ ] El panel derecho muestra la pieza SIGUIENTE, y coincide con la que aparece en el tablero tras fijar la actual.
- [ ] Limpiar 1, 2, 3 o 4 líneas suma exactamente 100, 300, 500 u 800 × nivel. El soft drop suma 1 por fila y el hard drop 2 por celda recorrida.
- [ ] El panel derecho muestra LÍNEAS con el total de líneas limpiadas.
- [ ] Al llegar a 10 líneas el nivel pasa a 2 y la caída automática es visiblemente más rápida.
- [ ] La partida termina cuando la pieza nueva colisiona al aparecer.
- [ ] La puntuación nunca supera 10.000.000.
- [ ] Mientras el canvas está montado, ni las flechas, ni Espacio, ni `X` hacen scroll de la página.
- [ ] El canvas no dibuja puntuación, nivel ni ningún overlay de "GAME OVER" o "PAUSA".
- [ ] Las piezas usan la paleta neón acordada sobre el fondo `#0a0a0f`.
- [ ] `lib/games/caida/` no usa `localStorage`, no lee variables CSS de color y no tiene estado mutable a nivel de módulo.

**Integración con la plataforma**

- [ ] Puntuación y Nivel del HUD coinciden en todo momento con el estado del motor.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final del motor.
- [ ] Con el modal abierto, escribir las iniciales (incluidas `X` y Espacio) no mueve ni rota ninguna pieza.
- [ ] **PAUSA** congela la caída y **REANUDAR** la continúa desde el mismo estado. `P` y `Esc` alternan la pausa, y la etiqueta del botón cambia.
- [ ] Con el juego en pausa, las flechas y Espacio no mueven la pieza.
- [ ] Cambiar de pestaña y volver deja el juego en pausa, con el botón en **REANUDAR**.
- [ ] Al reanudar tras una pausa larga, la pieza no da un salto de varias filas.
- [ ] **FIN** abre el modal con la puntuación actual.
- [ ] **JUGAR DE NUEVO** vuelve a la pantalla de inicio con el tablero vacío, Puntuación 0, Nivel 01 y LÍNEAS 0.
- [ ] Tras **SALIR** y volver a entrar, solo corre un loop: la caída va a la velocidad normal y cada pulsación mueve la pieza una sola vez.
- [ ] En un viewport de 480 px de ancho, el canvas se escala manteniendo la proporción 4:3, sin overflow horizontal.

**Leaderboard**

- [ ] **GUARDAR PUNTUACIÓN** inserta una fila en `scores` con `game_id = 'caida'`, el nombre normalizado y la puntuación final.
- [ ] La puntuación aparece en `/leaderboard?game=caida` y en el top de `/games/caida`.
- [ ] Recargar `/games` refleja el nuevo `playCount` de CAÍDA y, si la supera, el nuevo `bestScore`.
- [ ] Con sesión iniciada, la fila "TU MEJOR MARCA" de `/leaderboard?game=caida` muestra la marca del jugador.

**No regresiones**

- [ ] ASTEROIDS (motor, HUD con Vidas, pausa, modal y guardado) funciona igual que antes.
- [ ] Los juegos sin motor siguen con la simulación.
- [ ] `/leaderboard` sin parámetros sigue abriendo la pestaña ASTEROIDS.
- [ ] `next dev` no muestra errores en consola en `/`, `/games`, `/games/caida`, `/games/caida/play`, `/games/asteroids/play` ni `/leaderboard?game=caida`.
- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores en los archivos nuevos o modificados.

## Decisions

- **Sí:** dar motor al juego existente `caida`. Es el mismo juego (PUZZLE, `cover-tetro`), conserva su `id`, su URL y su posición en Home, y en Supabase tenía 0 puntuaciones, así que no hereda datos de la simulación.
- **No:** crear una entrada nueva `tetris`. Habría dos juegos equivalentes en el catálogo y CAÍDA seguiría siendo una simulación.
- **Sí:** mantener sin cambios el título, las descripciones y la portada `cover-tetro`. Los textos describen correctamente el port, la portada ya es distinta de las demás y así no hace falta migración.
- **No:** reescribir la descripción larga ni crear una portada `cover-caida`. Obligaría a una migración `update` sin aportar nada al objetivo.
- **Sí:** port con mecánica idéntica a `game.js`, **incluida la tuerca** como 8.ª pieza equiprobable, aunque deja huecos imposibles de rellenar. Esta spec es un port, no un rediseño.
- **No:** quitar la tuerca, o añadir 7-bag, hold, SRS o DAS/ARR propios. Son cambios de mecánica o de balance y quedan fuera de alcance.
- **Sí:** motor TypeScript bajo `GameFactory` en `lib/games/caida/`. Es el patrón de la SPEC 05 y lo único que lleva la puntuación al HUD y al leaderboard.
- **No:** `<iframe>` con los archivos originales. Ya se descartó en la SPEC 05: aísla el juego y obliga a usar `postMessage`.
- **Sí:** ampliar el contrato con `GameEngine = { factory, hasLives? }` en el registro, con `hasLives: true` por defecto. Son metadatos estáticos que se conocen antes de montar el canvas, y ASTEROIDS solo cambia la forma de su entrada.
- **No:** reportar siempre 1 vida (`♥`). Engaña al jugador.
- **No:** un set aparte `ENGINES_WITHOUT_LIVES`. Repartiría los metadatos del motor en dos sitios.
- **Sí:** ampliar el contrato dentro de esta spec, no en una spec propia. Son unas 15 líneas retrocompatibles en 3 archivos, aisladas en el paso 1 y con criterio de no regresión de ASTEROIDS.
- **Sí:** un único canvas de 800×600, con el tablero centrado (x 250–550), panel izquierdo de CONTROLES y panel derecho de SIGUIENTE y LÍNEAS. Encaja en `GameCanvas` y en `.game-canvas` sin cambios, y la altura del tablero coincide exactamente con 600.
- **No:** medidas por motor (`{ factory, width, height }`) ni un segundo canvas para la pieza siguiente. Supondría otro cambio de contrato y más DOM propio del juego.
- **Sí:** mostrar LÍNEAS en el panel lateral del canvas, como indicador propio de la mecánica.
- **No:** callback `onLines` y un hueco nuevo en el HUD React. Sería un cambio de contrato para una sola métrica.
- **Sí:** limitar la puntuación a 10.000.000 dentro del motor. Garantiza que el `insert` nunca falle por el `check` de `scores.score`, y no afecta a ninguna partida realista.
- **Sí:** recolorear a una paleta neón de 8 colores. Amplía la de ASTEROIDS con violeta, azul, naranja y gris metálico para la tuerca. Solo cambian los colores.
- **No:** mantener los colores pastel del original. No encajan con la estética de la plataforma.
- **Sí:** pantalla de inicio "PULSA ESPACIO PARA EMPEZAR", como en ASTEROIDS, donde la pulsación de arranque no hace hard drop.
- **No:** arrancar con Enter. Rompe la coherencia con ASTEROIDS, y el problema de la doble acción se resuelve por fases.
- **Sí:** mantener la autorrepetición de teclas del sistema operativo y el reinicio de `dropAccum` a 0, igual que el original.
- **Sí:** eliminar el HUD y el overlay del DOM, el botón Reiniciar, la pausa propia, el tema claro/oscuro y `localStorage('tetris-theme')`. La plataforma ya gestiona HUD, pausa, reinicio y guardado.
- **Sí:** el leaderboard no se reimplementa ni se tocan `scores`, `game_stats` ni `leaderboard`. Las vistas ya funcionan por `game_id`.
- **Sí:** `sort_order = 3` sin cambios. CAÍDA sigue en el top 6 de Home, y la pestaña inicial de `/leaderboard` sigue siendo ASTEROIDS.
- **Sí:** sonido fuera de alcance. El original no tiene sonido.
- **Sí:** identificadores de código en inglés y textos visibles en español, mismo criterio que las specs 01 a 06.

## Risks

| Riesgo                                                                                                                                          | Mitigación                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta dos veces `GameCanvas` y quedan dos loops o listeners duplicados (caída al doble de velocidad, cada tecla mueve dos columnas). | `destroy()` cancela el `requestAnimationFrame` y quita los listeners de `keydown` y `visibilitychange`. Hay un criterio de salir y volver a entrar. |
| Cambiar la forma de `GAME_ENGINES` rompe ASTEROIDS o la simulación.                                                                             | Cambio retrocompatible (`hasLives` opcional, `true` por defecto) en un paso propio (paso 1), con prueba manual y criterio de no regresión.          |
| La clave `caida` de `GAME_ENGINES` no coincide con `games.id` y el juego cae en la simulación.                                                  | Criterio de aceptación de jugar en `/games/caida/play` con el motor real y sin "Vidas" en el HUD.                                                   |
| La pulsación de Espacio que arranca la partida también hace hard drop de la primera pieza.                                                      | El handler resuelve por fase y sale tras arrancar. Hay un criterio de aceptación específico.                                                        |
| Teclas como `X` o Espacio mueven piezas mientras se escriben las iniciales en el modal.                                                         | `setInputEnabled(false)` hace salir al handler antes del `preventDefault`. Hay un criterio de aceptación específico.                                |
| Tras una pausa o un cambio de pestaña, el primer `dt` es enorme y la pieza salta varias filas.                                                  | Tope `MAX_DT = 0.05` y reinicio de `lastTime` al reanudar.                                                                                          |
| Callbacks con `setState` en cada frame provocan re-renders del HUD a 60 fps.                                                                    | `sync()` solo dispara cuando cambia el valor.                                                                                                       |
| La tuerca genera huecos imposibles y puede parecer un bug al jugador.                                                                           | Es el comportamiento del original y queda documentado en Decisions. Quitarla sería un cambio de mecánica en otra spec.                              |
| El tablero centrado deja paneles estrechos (250 px) y el texto de CONTROLES no cabe con Press Start 2P.                                         | Se diseña con `/frontend-design` en el paso 5, con tamaños de fuente pequeños y etiquetas cortas. Se comprueba a 480 px de ancho.                   |
| Las fuentes no están cargadas al dibujar la pantalla de inicio y los paneles.                                                                   | Fallback a `monospace`. El texto se redibuja en cada frame.                                                                                         |
| Las APIs de Next 16 o React 19 difieren de lo recordado al tocar `game-player.tsx`.                                                             | Consultar `node_modules/next/dist/docs/01-app/` antes del paso 1.                                                                                   |

## What is **not** in this spec

- Controles táctiles y juego en móvil.
- Sonido y música.
- Cambios de mecánica o de balance: quitar la tuerca, DAS/ARR propios, hold, 7-bag, T-spins, combos o rotación SRS.
- Mostrar las líneas en el HUD React (callback `onLines`).
- Cambiar textos o portada de `caida` en el catálogo.
- Antitrampas y validación de puntuación en el servidor.
- Implementación de los demás juegos del catálogo.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

# SPEC GJ ranaria-01 — Juego RANARIA: cruce de tráfico y río hasta llenar 5 nidos

> **Estado:** Draft · **Depende de:** SPEC 05 (`05-asteroids-game.md` — contrato `GameFactory`, `GameCanvas`, `GamePlayer`), SPEC 06 (`06-games-and-leaderboard-supabase.md` — tablas `games` y `scores`, leaderboard), SPEC 07 (`07-caida-game.md` — registro `GameEngine` con `hasLives`), SPEC 09 (`09-serpentina-game.md` — patrón de placeholder reutilizado con migración `update`) · **Fecha:** 2026-11-16
> **Objetivo:** Crear un juego original de cruce de carriles como motor TypeScript que da vida al juego existente `ranaria` en `/games/ranaria/play`: una rana de neón cruza 5 carriles de tráfico y 5 de río hasta llenar 5 nidos con 30 s por ronda y 3 vidas, y envía puntuación, vidas, nivel y fin de partida al HUD y al leaderboard de Supabase.

## Scope

**Incluye:**

- Catálogo: se reutiliza la fila existente `ranaria` de `public.games`. El `id`, el título RANARIA, la categoría `ARCADE`, el acento `green` y el `sort_order = 8` no cambian.
  - Migración `supabase/migrations/<timestamp>_ranaria_engine.sql` con un `update` de `short_description`, `long_description` y `cover`, que pasa de `cover-rana` a `cover-ranaria`.
- Portada nueva `.cover-ranaria` en `app/globals.css`, diseñada con `/frontend-design`: franjas de río cyan arriba, carriles de asfalto con líneas discontinuas abajo, cinco nidos en la orilla superior y la rana verde con brillo. Sustituye a `.cover-rana`, que se elimina porque ninguna otra fila la usa.
- Motor original en `lib/games/ranaria/` con `createRanariaGame(canvas, callbacks)`:
  - Rejilla de 20 columnas × 15 filas de 40 px sobre el canvas lógico de 800×600. De arriba abajo: fila 0 decorativa, fila 1 de nidos, filas 2–6 de río, fila 7 mediana segura, filas 8–12 de carretera, fila 13 de salida y fila 14 con la barra de tiempo.
  - La rana salta una casilla (40 px) por pulsación en cualquiera de las 4 direcciones, sin autorrepetición.
  - Carretera: 5 carriles de vehículos de luz (moto, coche, buggy, bólido y camión) con largo, velocidad y sentido fijos, que reaparecen por el lado opuesto. Tocar un vehículo cuesta una vida.
  - Río: 5 carriles de balsas de neón de 3 largos. Sobre una balsa, la rana se desplaza con ella. Caer al agua o ser arrastrada fuera del canvas cuesta una vida.
  - 5 nidos en la fila 1, centrados en x = 80, 240, 400, 560 y 720. Entrar en un nido vacío lo llena. Chocar con el seto entre nidos o entrar en un nido lleno cuesta una vida.
  - 30 s por ronda (cada intento de la rana desde la salida). Agotar el tiempo cuesta una vida.
  - Puntuación: +10 por cada fila nueva alcanzada en la ronda, +50 + 10 × segundos restantes por nido, y +1.000 al llenar los 5 nidos.
  - Al llenar los 5 nidos sube el nivel: los nidos se vacían y todos los carriles van más rápido (×1,15 por nivel, tope ×2,05 en el nivel 8).
  - 3 vidas. La partida termina al perder la última.
  - Sin estado global ni listeners sueltos. API `start`, `pause`, `resume`, `restart`, `end`, `setInputEnabled` y `destroy`.
  - Callbacks `onScore`, `onLives`, `onLevel`, `onPauseChange` y `onGameOver`, solo cuando cambia el valor.
- Pantalla de inicio en el canvas, "PULSA ESPACIO PARA EMPEZAR", con el tablero, el tráfico en movimiento y la rana en la salida. La rana no salta ni corre el tiempo hasta pulsar Espacio.
- Controles:
  - Flechas y WASD saltan una casilla. Se ignoran las pulsaciones con `event.repeat`.
  - `P` o `Esc` alternan la pausa.
  - `preventDefault` en las flechas y en Espacio.
  - El motor ignora el teclado mientras el modal está abierto.
- Pausa automática al ocultarse la pestaña (`visibilitychange`).
- Gráficos con primitivas de canvas y la paleta neón de `lib/games/ranaria/constants.ts`, sin imágenes:
  - Río azul profundo con ondas cyan, asfalto oscuro con líneas discontinuas, mediana y salida en verde oscuro, seto superior con brillo.
  - Rana verde `#00ff88` con brillo y animación de salto de 0,1 s. Parpadeo magenta al morir.
  - Barra de TIEMPO en la fila 14 que cambia de verde a amarillo (< 10 s) y a magenta (< 5 s), como indicador propio de la mecánica.
  - Diseño visual con `/frontend-design`.
- Registro `ranaria: { factory: createRanariaGame }` en `GAME_ENGINES` (`hasLives` por defecto, `true`: el HUD muestra "Vidas").
- Leaderboard: las puntuaciones guardadas desde el modal aparecen en `/leaderboard?game=ranaria` y en el top de `/games/ranaria`, sin cambios en `scores`, `game_stats` ni `leaderboard`.

**Fuera de alcance (para futuros specs):**

- Niveles diseñados a mano en `lib/games/ranaria/levels.ts`, tiempo por ronda distinto por nivel y bucle de niveles (SPEC GJ ranaria-02).
- Peligros nuevos: medusas que se sumergen, dron centinela en la mediana y nidos sellados (SPEC GJ ranaria-02).
- Bonus de luciérnaga, cría que se rescata, racha de nidos y vida extra (SPEC GJ ranaria-03).
- Sonido y música (SPEC GJ ranaria-03).
- Controles táctiles y juego en móvil.
- Purgar puntuaciones antiguas de la simulación guardadas con `game_id = 'ranaria'`.
- Actualizar `.claude/skills/add-game/platform-contract.md`.
- Antitrampas y validación de puntuación en el servidor.
- Implementar otros juegos del catálogo.
- Tests automatizados (no hay script de test configurado).

## Data model

### Catálogo (`update` de textos y portada)

La fila `ranaria` se reutiliza. Solo cambian datos, no el esquema, así que `npm run db:types` no se ejecuta.

```sql
-- supabase/migrations/<timestamp>_ranaria_engine.sql
-- Fila actual: id = 'ranaria', title = 'RANARIA', category = 'ARCADE', cover = 'cover-rana',
-- accent_color = 'green', sort_order = 8
update public.games
set short_description = 'Cruza el tráfico y el río de neón hasta llenar los 5 nidos.',
    long_description  = 'Una rana de neón debe cruzar cinco carriles de vehículos de luz y un río de balsas a la deriva para refugiarse en los cinco nidos de la orilla alta. Cada salto hacia delante suma puntos, y cuanto antes llegues al nido, mayor es el bonus. Tienes 30 segundos por ronda y 3 vidas: un atropello, una caída al agua o quedarte sin tiempo te cuestan una. Llena los cinco nidos para subir de nivel, con el tráfico cada vez más rápido.',
    cover             = 'cover-ranaria'
where id = 'ranaria';
-- sort_order = 8 se mantiene: no entra en el top 6 de Home ni cambia la pestaña inicial de /leaderboard.
```

### Contrato (sin cambios)

`GameCallbacks`, `GameInstance`, `GameFactory`, `GameEngine`, `GameCanvas` y `GamePlayer` no cambian. Solo se añade una entrada al registro:

```ts
// lib/games/registry.ts
export const GAME_ENGINES: Partial<Record<string, GameEngine>> = {
  asteroids: { factory: createAsteroidsGame },
  "bloque-buster": { factory: createBloqueBusterGame },
  caida: { factory: createCaidaGame, hasLives: false },
  serpentina: { factory: createSerpentinaGame },
  ranaria: { factory: createRanariaGame }, // hasLives por defecto: el HUD muestra "Vidas"
};
```

### Estado interno del motor (privado de `lib/games/ranaria/engine.ts`)

```ts
type Phase = "ready" | "playing" | "dead" | "levelclear" | "gameover";
// "ready": "PULSA ESPACIO PARA EMPEZAR"; el tráfico se mueve, la rana espera en la salida y el tiempo no corre
// "playing": la rana salta y el tiempo de la ronda corre (la pausa es un flag aparte)
// "dead": 1 s de parpadeo magenta; la vida ya se restó; el tráfico sigue moviéndose
// "levelclear": 1,5 s con los 5 nidos destellando; después sube el nivel y vuelve a "playing"
// "gameover": sin vidas o llamada a end(). Ya se llamó a onGameOver

type Direction = "up" | "down" | "left" | "right";
type LaneKind = "road" | "river";
type MoverKind = "bike" | "car" | "buggy" | "racer" | "truck" | "raft";
type DeathCause = "road" | "water" | "edge" | "hedge" | "time";

type Mover = { x: number }; // borde izquierdo en px; el ancho es lane.length
type Lane = {
  row: number; // 2–6 río, 8–12 carretera
  kind: LaneKind;
  mover: MoverKind;
  length: number; // px
  speed: number; // px/s con signo (+ hacia la derecha), ya multiplicada por el nivel
  period: number; // count × spacing; ≥ W + length
  movers: Mover[]; // count elementos, x inicial = i × spacing
};

type Frog = {
  x: number; // centro en px; 400 en la salida
  row: number; // 13 en la salida
  facing: Direction; // "up"
  hopTimer: number; // segundos restantes de la animación de salto; 0
};

type EngineState = {
  phase: Phase; // "ready"
  paused: boolean; // false
  inputEnabled: boolean; // true
  lanes: Lane[]; // buildLanes(1)
  frog: Frog; // spawnFrog()
  nests: boolean[]; // [false, false, false, false, false]
  roundTime: number; // 30 (segundos restantes de la ronda)
  bestRow: number; // 13; fila más alta alcanzada en la ronda (menor = más arriba)
  deadTimer: number; // 0
  deathCause: DeathCause | null; // null; solo para elegir el dibujo de la muerte
  clearTimer: number; // 0
  score: number; // 0
  lives: number; // 3
  level: number; // 1
};
```

### Reglas derivadas

- Filas: el centro vertical de la fila `r` es `r × TILE + TILE / 2`. La rana solo existe en las filas 1–13.
- Multiplicador de velocidad: `speedMultiplier(level) = min(1 + 0.15 × (level − 1), 2.05)`. `buildLanes(level)` crea los carriles de `LANES` con `speed = baseSpeed × speedMultiplier(level)`.
- Movimiento de carriles: cada `Mover` avanza `speed × dt`. Si `speed > 0` y `x ≥ period − length`, `x −= period`. Si `speed < 0` y `x < −length`, `x += period`. Así cada objeto reaparece por el lado opuesto sin saltos visibles.
- Salto (solo en `playing`, sin pausa, sin `event.repeat`):
  - `up`/`down` cambian `row` en ±1; `left`/`right` cambian `x` en ±40.
  - Se ignora el salto si deja `x` fuera de `[20, 780]` o `row` por debajo de 13.
  - `facing` toma la dirección y `hopTimer = HOP_DURATION`.
  - Si `row < bestRow` y `row ≥ 2`: `bestRow = row` y `+10` puntos.
  - Si `row` pasa a 1, se resuelve el nido (ver abajo).
- Carretera (filas 8–12): muerte `"road"` si el intervalo `[frog.x − 14, frog.x + 14]` se solapa con `[m.x + 4, m.x + length − 4]` de algún vehículo del carril de la rana. Se comprueba cada frame, tras mover los carriles.
- Río (filas 2–6): si `frog.x` cae dentro de `[m.x, m.x + length]` de alguna balsa del carril, `frog.x += lane.speed × dt`. Si no hay balsa debajo, muerte `"water"`. Si `frog.x < 0` o `frog.x > 800`, muerte `"edge"`.
- Nido: al llegar a la fila 1 se busca el nido con `|frog.x − NEST_XS[i]| ≤ NEST_TOLERANCE`.
  - Nido vacío: `nests[i] = true` y `+(50 + 10 × floor(roundTime))` puntos. Si es el quinto, `+1.000` y fase `levelclear`. Si no, nueva ronda (rana en la salida, `roundTime = 30`, `bestRow = 13`).
  - Sin nido o nido lleno: muerte `"hedge"`.
- Tiempo: en `playing` y sin pausa, `roundTime −= dt`. Al llegar a 0, muerte `"time"`.
- Muerte: `lives −= 1`. Con vidas, fase `dead` durante `DEAD_DURATION = 1` s y después nueva ronda en `playing`. Sin vidas, fase `gameover` y `onGameOver(score)`. Los nidos llenos, la puntuación y el nivel se conservan.
- Nivel completado: tras `LEVEL_CLEAR_DURATION = 1.5` s, `level += 1`, nidos vacíos, `lanes = buildLanes(level)`, nueva ronda y fase `playing`.
- Toda suma de puntos pasa por `addScore(points)`, que aplica `score = min(score + points, MAX_SCORE)`.

### Carriles (`LANES`, nivel 1)

| Fila | Tipo      | `mover` | Largo (px) | Velocidad base (px/s) | Cantidad | Separación (px) | `period` |
| ---- | --------- | ------- | ---------- | --------------------- | -------- | --------------- | -------- |
| 12   | Carretera | `bike`  | 40         | −60                   | 4        | 240             | 960      |
| 11   | Carretera | `car`   | 60         | +90                   | 3        | 320             | 960      |
| 10   | Carretera | `buggy` | 50         | −120                  | 4        | 230             | 920      |
| 9    | Carretera | `racer` | 50         | +180                  | 2        | 450             | 900      |
| 8    | Carretera | `truck` | 120        | −70                   | 3        | 340             | 1020     |
| 6    | Río       | `raft`  | 120        | +50                   | 3        | 320             | 960      |
| 5    | Río       | `raft`  | 240        | −70                   | 3        | 400             | 1200     |
| 4    | Río       | `raft`  | 160        | +90                   | 3        | 360             | 1080     |
| 3    | Río       | `raft`  | 120        | −60                   | 4        | 280             | 1120     |
| 2    | Río       | `raft`  | 240        | +80                   | 3        | 380             | 1140     |

Todas cumplen `period ≥ 800 + length`. En el río, el hueco entre balsas (`spacing − length`) va de 140 a 200 px: siempre hay que esperar a que la balsa siguiente se alinee.

### Archivos del motor

- `lib/games/ranaria/constants.ts`:
  - Medidas: `W = 800`, `H = 600`, `TILE = 40`, `COLS = 20`, `ROWS = 15`, `NEST_ROW = 1`, `RIVER_ROWS = [2, 3, 4, 5, 6]`, `MEDIAN_ROW = 7`, `ROAD_ROWS = [8, 9, 10, 11, 12]`, `START_ROW = 13`, `TIMEBAR_ROW = 14`, `START_X = 400`, `FROG_MIN_X = 20`, `FROG_MAX_X = 780`, `FROG_HALF = 14`, `VEHICLE_INSET = 4`.
  - Nidos: `NEST_XS = [80, 240, 400, 560, 720]`, `NEST_W = 64`, `NEST_TOLERANCE = 24`.
  - Reglas: `INITIAL_LIVES = 3`, `ROUND_TIME = 30`, `STEP_POINTS = 10`, `NEST_POINTS = 50`, `TIME_BONUS_PER_SECOND = 10`, `LEVEL_CLEAR_BONUS = 1000`, `SPEED_STEP = 0.15`, `MAX_SPEED_MULTIPLIER = 2.05`, `HOP_DURATION = 0.1`, `DEAD_DURATION = 1`, `LEVEL_CLEAR_DURATION = 1.5`, `TIME_WARN = 10`, `TIME_LOW = 5`, `MAX_SCORE = 10_000_000`, `MAX_DT = 0.05`.
  - `LANES: readonly LaneDef[]`, con `LaneDef = { row; kind; mover; length; baseSpeed; count; spacing }`: los 10 carriles de la tabla anterior.
  - Paleta `COLORS`: `background` `#0a0a0f`, `road` `#12121c`, `laneLine` `rgba(138,143,181,0.25)`, `river` `#001f2a`, `riverRipple` `rgba(0,245,255,0.18)`, `safe` `#0d1f17`, `hedge` `#003a2a`, `hedgeEdge` `#00ff88`, `nest` `#00ff88`, `frog` `#00ff88`, `frogEye` `#0a0a0f`, `dead` `#ff006e`, `raft` `#00f5ff`, `raftFill` `rgba(0,245,255,0.18)`, `vehicles` (`bike` `#00f5ff`, `car` `#ff006e`, `buggy` `#f5ff00`, `racer` `#ff7700`, `truck` `#aa00ff`), `timeOk` `#00ff88`, `timeWarn` `#f5ff00`, `timeLow` `#ff006e`, `text` `#e6e9ff` y `textDim` `#8a8fb5`.
- `lib/games/ranaria/entities.ts`: funciones puras que reciben el estado o el `ctx` como parámetros:
  - `speedMultiplier(level)`, `buildLanes(level)`, `updateLanes(lanes, dt)`, `spawnFrog()`, `rowCenterY(row)`, `hitsVehicle(frog, lane)`, `raftUnder(frog, lane)` y `nestIndexAt(x)` (devuelve `-1` si no hay nido).
  - `drawBackground(ctx)`, `drawLane(ctx, lane)`, `drawVehicle(ctx, kind, x, y, length, facingRight)`, `drawRaft(ctx, x, y, length)`, `drawNests(ctx, nests, flash)`, `drawFrog(ctx, frog, color)` y `drawTimeBar(ctx, ratio, color)`.
- `lib/games/ranaria/engine.ts`:
  - `createRanariaGame: GameFactory`.
  - Loop con `requestAnimationFrame`, entrada de teclado y fases.
  - Reglas de salto, colisiones, nidos, tiempo, puntuación, vidas, nivel y fin de partida.
  - Dibujo y pantalla de inicio.
  - `sync()` para disparar los callbacks.

### Assets

Ninguno. Todo se dibuja con primitivas de canvas.

### Puntuación y tope

| Acción                                    | Puntos                        |
| ----------------------------------------- | ----------------------------- |
| Salto a una fila nueva de la ronda (2–12) | +10 (máx. 11 por ronda)       |
| Llenar un nido                            | +50 + 10 × segundos restantes |
| Llenar los 5 nidos                        | +1.000                        |

| Nivel | Multiplicador de velocidad | Máximo teórico del nivel |
| ----- | -------------------------- | ------------------------ |
| 1     | ×1,00                      | 3.250                    |
| 2     | ×1,15                      | 3.250                    |
| 5     | ×1,60                      | 3.250                    |
| 8+    | ×2,05 (tope)               | 3.250                    |

Máximo por nivel: 5 rondas × (110 + 50 + 10 × 29) + 1.000 = 3.250, porque `floor(roundTime)` es como mucho 29 al llegar al nido. Los niveles no tienen fin, así que en teoría la puntuación no tiene techo. Por eso el motor limita la puntuación a `MAX_SCORE = 10_000_000`, el `check` de `scores.score`. Harían falta más de 3.000 niveles para tocarlo.

### Convenciones

- Coordenadas con origen arriba a la izquierda en el espacio lógico de 800×600. La rana tiene `x` continua (por las balsas) y `row` discreta.
- Velocidades en px/s y `dt` en segundos con tope de 0,05 s.
- Callbacks solo cuando el valor cambia, vía `sync()` y la caché `reported`.
- La paleta sale de `constants.ts`, nunca de variables CSS.
- Sin aleatoriedad: los carriles son fijos y la partida es determinista, lo que hace comparables las puntuaciones.
- El juego no crea datos persistentes. El guardado es el de `GamePlayer` (`insertScore`).

## Implementation plan

1. **Catálogo.** Comprobar con el MCP de Supabase cuántas filas hay en `scores` con `game_id = 'ranaria'` y anotarlo en el PR (no se borran). Crear la migración con `npx supabase migration new ranaria_engine`, con el `update` del Data model, y aplicarla con `npm run db:push`. No se ejecuta `npm run db:types`.
   - Prueba manual: `/games/ranaria` muestra la nueva descripción larga. La portada aún no se ve (la clase `cover-ranaria` no existe todavía). `/games/ranaria/play` sigue con la simulación.
2. **Portada.** Antes de tocar CSS, consultar en `node_modules/next/dist/docs/01-app/` lo relativo a estilos globales. Diseñar con `/frontend-design` la clase `.cover-ranaria` en `app/globals.css`, junto a las demás portadas, y eliminar `.cover-rana`.
   - Prueba manual: `/games` y `/games/ranaria` muestran la nueva portada, distinta de `cover-snake` y de las demás.
3. **Constantes.** Crear `lib/games/ranaria/constants.ts` con medidas, nidos, reglas, `LANES` y `COLORS`. Compila sin usarse.
4. **Entidades: lógica.** Crear `lib/games/ranaria/entities.ts` con `speedMultiplier`, `buildLanes`, `updateLanes`, `spawnFrog`, `rowCenterY`, `hitsVehicle`, `raftUnder` y `nestIndexAt`, sin globales. Compila sin usarse.
5. **Entidades: dibujo.** Diseñar con `/frontend-design` el aspecto en el canvas (zonas, vehículos de luz, balsas, nidos, rana y barra de tiempo) y añadir a `entities.ts` `drawBackground`, `drawLane`, `drawVehicle`, `drawRaft`, `drawNests`, `drawFrog` y `drawTimeBar`. Fuente `--font-press-start-2p` con fallback `monospace`. Compila sin usarse.
6. **Núcleo del motor.** Crear `lib/games/ranaria/engine.ts` con `createRanariaGame(canvas, callbacks)`:
   - `EngineState` y fases `ready → playing ⇄ dead`, `playing → levelclear → playing` y `→ gameover`, con `paused` como flag.
   - Loop con `requestAnimationFrame` y `dt` con tope de `MAX_DT`. Los carriles se mueven en todas las fases salvo en pausa y en `gameover`.
   - En `playing`: arrastre de la balsa, comprobación de agua, borde y vehículos, y cuenta atrás de `roundTime`.
   - `addScore` con `MAX_SCORE`, resolución de nidos, muertes, `levelclear` y `onGameOver(score)` al entrar en `gameover`.
   - `sync()` con la caché `reported` para `onScore`, `onLives`, `onLevel` y `onPauseChange`, y comprobación de `destroyed` tras `sync()`.
   - Dibujo de cada frame con las funciones de `entities.ts`: fondo, carriles, nidos (destellando en `levelclear`), rana (magenta parpadeando en `dead`) y barra de tiempo. Pantalla `ready` con "PULSA ESPACIO PARA EMPEZAR". Sin puntuación, vidas, nivel ni overlays de pausa o fin de partida.
   - Sin registrar todavía. Compila sin usarse.
7. **Entrada y ciclo de vida.** En `engine.ts`:
   - `keydown` en `window` con un handler con nombre. Si `inputEnabled` es `false`, sale antes del `preventDefault`.
   - `preventDefault` en las flechas y en Espacio. `P`/`Esc` alternan la pausa en `playing`, `dead` y `levelclear`.
   - En `ready`, Espacio pasa a `playing`. En `playing` y sin pausa, flechas y WASD saltan; se ignora `event.repeat`.
   - `visibilitychange` pausa el juego.
   - El resto de la API: `pause`, `resume` (reinicia `lastTime`), `restart` (carriles del nivel 1, rana en la salida, nidos vacíos, score 0, 3 vidas, nivel 1, `roundTime = 30`, fase `ready`), `end`, `setInputEnabled` y `destroy` (cancela el `requestAnimationFrame` y quita `keydown` y `visibilitychange`).
8. **Registro e integración.** Añadir `ranaria: { factory: createRanariaGame }` a `GAME_ENGINES`.
   - Prueba manual: `/games/ranaria/play` muestra el motor real con "Vidas" en el HUD. Jugar: llenar un nido, morir atropellado, ahogado y por tiempo, ver el HUD actualizado, perder las 3 vidas, ver el modal y guardar.
9. **Leaderboard.** Guardar una puntuación de RANARIA y verla en `/leaderboard?game=ranaria` y en el top de `/games/ranaria`. Si los pasos anteriores son correctos, no requiere cambios de código.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

**Catálogo**

- [ ] `public.games` mantiene la fila `ranaria` con el mismo `id`, `title = 'RANARIA'`, `category = 'ARCADE'`, `accent_color = 'green'` y `sort_order = 8`, con `cover = 'cover-ranaria'` y las descripciones del Data model.
- [ ] Existe `supabase/migrations/*_ranaria_engine.sql`, solo con el `update`, y `npx supabase migration list` la muestra aplicada en el remoto.
- [ ] `lib/supabase/database.types.ts` no cambia.
- [ ] `/games` muestra RANARIA con la portada `cover-ranaria`, distinta de las demás, y `.cover-rana` ya no existe en `app/globals.css`.
- [ ] `/games/ranaria` muestra la nueva descripción larga, y **JUGAR AHORA** lleva a `/games/ranaria/play`.

**Motor**

- [ ] Al entrar en `/games/ranaria/play`, el canvas muestra "PULSA ESPACIO PARA EMPEZAR" con el tráfico y las balsas en movimiento y la rana en la salida. La rana no responde y la barra de tiempo no baja hasta pulsar Espacio.
- [ ] Cada pulsación de flecha o WASD mueve la rana exactamente una casilla (40 px). Mantener la tecla pulsada no encadena saltos.
- [ ] La rana no puede salir por los lados saltando ni bajar por debajo de la fila de salida.
- [ ] Cada salto a una fila nueva de la ronda suma exactamente 10 puntos. Volver a una fila ya alcanzada en la ronda no suma.
- [ ] Tocar un vehículo resta una vida: la rana parpadea en magenta 1 s y reaparece en la salida con la barra de tiempo llena.
- [ ] Sobre una balsa, la rana se desplaza con ella. Saltar al agua sin balsa debajo resta una vida.
- [ ] Si una balsa arrastra a la rana fuera del canvas, se resta una vida.
- [ ] Entrar en un nido vacío lo marca como lleno y suma exactamente 50 + 10 × segundos restantes (enteros), y la rana vuelve a la salida con 30 s.
- [ ] Saltar a la fila de nidos fuera de un nido, o a un nido ya lleno, resta una vida.
- [ ] Agotar los 30 s de la ronda resta una vida. La barra de tiempo pasa a amarillo por debajo de 10 s y a magenta por debajo de 5 s.
- [ ] Llenar el quinto nido suma además 1.000 puntos, los nidos destellan 1,5 s, el Nivel del HUD sube en 1, los nidos se vacían y el tráfico es visiblemente más rápido.
- [ ] A partir del nivel 8 la velocidad deja de subir.
- [ ] La partida termina al perder la tercera vida. Los nidos llenos, la puntuación y el nivel se conservan entre vidas.
- [ ] Dos partidas jugadas con las mismas pulsaciones al mismo ritmo producen el mismo tráfico (sin aleatoriedad).
- [ ] Mientras el canvas está montado, ni las flechas ni Espacio hacen scroll de la página.
- [ ] El canvas no dibuja puntuación, vidas, nivel ni ningún overlay de "GAME OVER" o "PAUSA". Solo la barra de TIEMPO como indicador de la mecánica.
- [ ] `lib/games/ranaria/` no usa `localStorage`, no lee variables CSS de color y no tiene estado mutable a nivel de módulo.
- [ ] La suma de puntos usa `Math.min(…, MAX_SCORE)` con `MAX_SCORE = 10_000_000`.

**Integración con la plataforma**

- [ ] Puntuación, Vidas y Nivel del HUD coinciden en todo momento con el estado del motor, y "Vidas" empieza en ♥ ♥ ♥.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final del motor.
- [ ] Con el modal abierto, escribir las iniciales (incluidos Espacio, W, A, S y D) no afecta al juego, y el input recibe esas letras.
- [ ] **PAUSA** congela el tráfico, las balsas y el tiempo, y **REANUDAR** continúa desde el mismo estado. `P` y `Esc` alternan la pausa y la etiqueta del botón cambia.
- [ ] Con el juego en pausa, las flechas y WASD no mueven la rana.
- [ ] Cambiar de pestaña y volver deja el juego en pausa, con el botón en **REANUDAR**, y la barra de tiempo no ha bajado.
- [ ] Al reanudar tras una pausa larga, los vehículos no dan un salto ni atraviesan a la rana.
- [ ] **FIN** abre el modal con la puntuación actual.
- [ ] **JUGAR DE NUEVO** vuelve a la pantalla de inicio con los nidos vacíos, Puntuación 0, Vidas ♥ ♥ ♥ y Nivel 01.
- [ ] Tras **SALIR** y volver a entrar, solo corre un loop: el tráfico va a la velocidad normal y cada pulsación salta una sola casilla.
- [ ] En un viewport de 480 px de ancho, el canvas se escala manteniendo la proporción 4:3, sin overflow horizontal.

**Leaderboard**

- [ ] **GUARDAR PUNTUACIÓN** inserta una fila en `scores` con `game_id = 'ranaria'`, el nombre normalizado y la puntuación final.
- [ ] La puntuación aparece en `/leaderboard?game=ranaria` y en el top de `/games/ranaria`.
- [ ] Recargar `/games` refleja el nuevo `playCount` de RANARIA y, si la supera, el nuevo `bestScore`.
- [ ] Con sesión iniciada, la fila "TU MEJOR MARCA" de `/leaderboard?game=ranaria` muestra la marca del jugador.

**No regresiones**

- [ ] ASTEROIDS, BLOQUE BUSTER y SERPENTINA (motor, HUD con Vidas, pausa, modal y guardado) funcionan igual que antes.
- [ ] CAÍDA (motor, HUD sin Vidas, pausa, modal y guardado) funciona igual que antes.
- [ ] Los juegos sin motor (GLOTÓN, INVASORES, ROCAS, DUELO PIXEL) siguen con la simulación.
- [ ] Home sigue mostrando los mismos 6 primeros juegos y `/leaderboard` sin parámetros sigue abriendo la pestaña ASTEROIDS.
- [ ] `next dev` no muestra errores en consola en `/`, `/games`, `/games/ranaria`, `/games/ranaria/play` ni `/leaderboard?game=ranaria`.
- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores en los archivos nuevos o modificados.

## Decisions

- **Sí:** juego pedido por el usuario: "Anfibio neón cruza carriles de tráfico y un río con plataformas hasta llenar 5 nidos, con tiempo por ronda", con `id` sugerido `ranaria`. Los 5 nidos, el tráfico, el río con plataformas y el tiempo por ronda vienen del prompt.
- **Sí:** diseño original del género "cruzar carriles". Nombre, estética neón, vehículos de luz, balsas, carriles, velocidades y puntuación son propios. El usuario pidió explícitamente no recrear ningún juego comercial.
- **No:** copiar nombres, personajes, sprites, música, distribución de carriles o tabla de puntos de ningún juego comercial del género.
- **Sí:** dar motor al placeholder existente `ranaria` (ARCADE, `green`, "Cruza la autopista de pixeles"). Conserva `id`, URL y `sort_order`. **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** crear una entrada nueva. Habría dos juegos equivalentes en el catálogo y RANARIA seguiría siendo una simulación.
- **Sí:** conservar las puntuaciones que la simulación haya guardado con `game_id = 'ranaria'`. Las reglas prohíben tocar `scores`; el paso 1 solo cuenta cuántas hay. **Supuesto del game-jam — revisar antes de aprobar.**
- **Sí:** `sort_order = 8` sin cambios. Es un placeholder reutilizado, así que no se usa "máximo + 1"; no entra en el top 6 de Home ni cambia la pestaña inicial de `/leaderboard`. **Supuesto del game-jam — revisar antes de aprobar.**
- **Sí:** categoría `ARCADE` y acento `green` de la fila existente, dentro de los `check` actuales. **Supuesto del game-jam — revisar antes de aprobar.**
- **Sí:** portada nueva `cover-ranaria` con `/frontend-design`, y `update` de `cover`. La actual `cover-rana` es solo franjas y un círculo, y el proceso del game-jam pide una portada `cover-<id>`. **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** conservar `cover-rana`. Se elimina para no dejar CSS muerto, porque ninguna otra fila la usa.
- **Sí:** `update` de las descripciones. La actual habla de "coches", "troncos" y "nenúfares", y no menciona nidos, tiempo ni vidas.
- **Sí:** motor TypeScript bajo `GameFactory` en `lib/games/ranaria/`. Es el patrón de las SPEC 05, 07, 08 y 09.
- **No:** `<iframe>` con un juego independiente. Ya se descartó en la SPEC 05.
- **Sí:** rejilla de 20×15 casillas de 40 px en el canvas de 800×600, con 5 carriles de carretera, 5 de río, mediana, salida, fila de nidos y fila de tiempo. Encaja exacta en el contrato sin tocar `GameCanvas` ni el `aspect-ratio`. **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** casillas de 50 px (16×12). Deja solo 3 carriles por zona.
- **Sí:** `x` continua y `row` discreta para la rana. Las balsas la arrastran de forma suave y los nidos usan una tolerancia de ±24 px.
- **Sí:** "ronda" = cada intento de la rana desde la salida hasta un nido o una muerte, con 30 s. Es la lectura más natural de "tiempo por ronda". **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** un único reloj por nivel. Castigaría el último nido de forma desigual.
- **Sí:** 3 vidas (`hasLives` por defecto, `true`) y muerte por atropello, agua, borde, seto, nido lleno o tiempo. **Supuesto del game-jam — revisar antes de aprobar.**
- **Sí:** puntuación +10 por fila nueva de la ronda, +50 + 10 × segundos restantes por nido y +1.000 por nivel. Premia avanzar y llegar rápido. Contar solo filas nuevas evita sumar puntos subiendo y bajando. **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** puntos multiplicados por nivel. El nivel ya se refleja en la dificultad y en el bonus acumulado.
- **Sí:** niveles infinitos con velocidad ×(1 + 0,15 × (nivel − 1)) y tope ×2,05 en el nivel 8. Da sentido al Nivel del HUD sin diseñar niveles a mano, que llegan en la SPEC GJ ranaria-02.
- **Sí:** tope `MAX_SCORE = 10_000_000` en el motor, porque los niveles no terminan. No afecta a partidas reales (3.250 puntos por nivel como máximo).
- **Sí:** sin aleatoriedad. Los carriles son fijos y la partida es determinista, así que el ranking compara habilidad.
- **Sí:** flechas y WASD, Espacio para empezar y sin autorrepetición (`event.repeat` se ignora). Un salto por pulsación es esencial en el género y evita muertes por teclas mantenidas.
- **Sí:** tras morir, la rana reaparece en `playing` sin fase de espera. La fila de salida es segura y el tiempo ya es la presión de la ronda.
- **Sí:** barra de TIEMPO dibujada en la fila 14 como indicador propio de la mecánica, igual que el `3x` de ASTEROIDS o LÍNEAS de CAÍDA.
- **No:** callback nuevo `onTime` para mostrar el tiempo en el HUD React. Sería un cambio de contrato para una sola métrica.
- **Sí:** paleta neón con la rana en `#00ff88` (acento `green`), vehículos en cyan, magenta, amarillo, naranja y violeta, balsas cyan y río azul profundo. Reutiliza los colores de CAÍDA y BLOQUE BUSTER. **Supuesto del game-jam — revisar antes de aprobar.**
- **Sí:** gráficos con primitivas de canvas, sin assets. No hay nada que cargar antes de jugar.
- **Sí:** sonido fuera de alcance en esta spec; llega en la SPEC GJ ranaria-03. **Supuesto del game-jam — revisar antes de aprobar.**
- **Sí:** sin cambios de contrato. El leaderboard no se reimplementa ni se tocan `scores`, `game_stats` ni `leaderboard`.
- **Sí:** identificadores de código en inglés y textos visibles en español.
- **Nota:** `.claude/skills/add-game/platform-contract.md` aún describe el registro anterior a la SPEC 07 (sin `GameEngine`). Esta spec se basa en el código actual.

## Risks

| Riesgo                                                                                                               | Mitigación                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta dos veces `GameCanvas` y quedan dos loops o listeners duplicados (tráfico al doble, saltos dobles). | `destroy()` cancela el `requestAnimationFrame` y quita `keydown` y `visibilitychange`. Hay un criterio de salir y volver a entrar.                         |
| La clave `ranaria` de `GAME_ENGINES` no coincide con `games.id` y el juego cae en la simulación.                     | Copiar el `id` de la migración semilla. Hay un criterio de jugar en `/games/ranaria/play` con el motor real.                                               |
| Tras una pausa larga, el primer `dt` es enorme y un vehículo atraviesa a la rana o la balsa la lanza fuera.          | Tope `MAX_DT = 0.05` y reinicio de `lastTime` al reanudar. A ×2,05 el vehículo más rápido avanza ~18 px por frame, menos que la hitbox de la rana (28 px). |
| Un objeto aparece o desaparece de golpe en el borde del canvas al envolver.                                          | `period ≥ 800 + length` en todos los carriles y envolvimiento solo cuando el objeto está fuera de la vista. Se comprueba en la tabla de carriles.          |
| La rana muere al saltar a una balsa por un error de redondeo en el borde.                                            | `raftUnder` usa el centro de la rana con intervalo cerrado `[x, x + length]`.                                                                              |
| Mantener una flecha pulsada encadena saltos y lleva a la rana al tráfico.                                            | Se ignora `event.repeat`. Hay un criterio específico.                                                                                                      |
| Las puntuaciones de la simulación ya guardadas en `ranaria` contaminan el ranking.                                   | El paso 1 las cuenta y se dejan intactas (no se toca `scores`). Purgarlas va en otra spec si el usuario lo decide.                                         |
| El `update` de `cover` deja la portada en blanco si la clase no existe aún.                                          | El paso 2 crea `.cover-ranaria` justo después de la migración. Hay un criterio de catálogo.                                                                |
| W, A, S, D o Espacio mueven la rana mientras se escriben las iniciales.                                              | `setInputEnabled(false)` hace salir al handler antes del `preventDefault`. Hay un criterio específico.                                                     |
| Callbacks con `setState` en cada frame provocan re-renders del HUD a 60 fps.                                         | `sync()` solo dispara cuando cambia el valor. El tiempo no se envía al HUD.                                                                                |
| Las fuentes no están cargadas al dibujar la pantalla de inicio.                                                      | Fallback a `monospace`. El texto se redibuja en cada frame.                                                                                                |
| Las APIs de Next 16 o React 19 difieren de lo recordado.                                                             | Consultar `node_modules/next/dist/docs/01-app/` en el paso 2, antes de tocar CSS o el registro.                                                            |

## What is **not** in this spec

- Niveles diseñados a mano en `lib/games/ranaria/levels.ts`, tiempo por ronda distinto por nivel y bucle de niveles (SPEC GJ ranaria-02).
- Peligros nuevos: medusas que se sumergen, dron centinela en la mediana y nidos sellados (SPEC GJ ranaria-02).
- Bonus de luciérnaga, cría que se rescata, racha de nidos y vida extra (SPEC GJ ranaria-03).
- Sonido y música (SPEC GJ ranaria-03).
- Controles táctiles y juego en móvil.
- Purgar puntuaciones antiguas de la simulación guardadas con `game_id = 'ranaria'`.
- Actualizar `.claude/skills/add-game/platform-contract.md`.
- Antitrampas y validación de puntuación en el servidor.
- Implementación de los demás juegos del catálogo.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

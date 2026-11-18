# SPEC GJ ranaria-02 — Juego RANARIA: 5 tramos diseñados, medusas, dron centinela y nidos sellados

> **Estado:** Draft · **Depende de:** SPEC 05 (`05-asteroids-game.md` — contrato `GameFactory`, `GameCanvas`, `GamePlayer`), SPEC 06 (`06-games-and-leaderboard-supabase.md` — tablas `games` y `scores`, leaderboard), SPEC 07 (`07-caida-game.md` — registro `GameEngine` con `hasLives`), SPEC 08 (`08-bloque-buster-game.md` — niveles en `levels.ts`), `specs/game-jam/ranaria/01-ranaria-game.md` (motor base de RANARIA) · **Fecha:** 2026-11-16
> **Objetivo:** Sustituir el tráfico único con multiplicador de velocidad de `/games/ranaria/play` por 5 tramos diseñados a mano en `lib/games/ranaria/levels.ts`, que se repiten en vueltas más rápidas, con tiempo por ronda propio de cada tramo y tres peligros nuevos (medusas que se sumergen, dron centinela en la mediana y nidos sellados), sin cambiar lo que se envía al HUD y al leaderboard (puntuación, vidas, nivel y fin de partida).

## Scope

**Incluye:**

- Catálogo: sin cambios y sin migración. La fila `ranaria` y la portada `cover-ranaria` de la SPEC GJ ranaria-01 se mantienen.
- Nuevo `lib/games/ranaria/levels.ts` con `LEVELS`, 5 tramos con nombre propio: ORILLA, CORRIENTE, AUTOPISTA, TORMENTA y ABISMO.
  - Cada tramo define sus 10 carriles, su tiempo por ronda (30, 30, 28, 26 y 24 s) y qué peligros activa.
  - El tramo ORILLA es exactamente el `LANES` de la SPEC 01, que se elimina de `constants.ts`.
- Niveles: el nivel `n` juega el tramo `LEVELS[(n − 1) % 5]`. Cada 5 niveles empieza una vuelta nueva, con todas las velocidades multiplicadas por `min(1 + 0.2 × vuelta, 1.8)`. Sustituye al multiplicador `min(1 + 0.15 × (nivel − 1), 2.05)` de la SPEC 01.
- Peligro 1, **medusas de plasma** (carriles de río con `mover: "jelly"`): grupos de 2 o 3 medusas de 40 px que flotan 3 s, parpadean 1 s de aviso y se sumergen 1,5 s. Una rana sobre una medusa sumergida cae al agua. Cada grupo del carril va desfasado 1,8 s respecto al anterior.
- Peligro 2, **dron centinela** (tramos AUTOPISTA, TORMENTA y ABISMO): patrulla la mediana (fila 7) de x = 40 a x = 760 y vuelta, a 80 px/s por el multiplicador de vuelta. Tocarlo cuesta una vida.
- Peligro 3, **nidos sellados** (tramos TORMENTA y ABISMO): cada 8 s una chispa sella el siguiente nido vacío, en orden circular, durante 4 s, con 1 s de aviso previo. Entrar en un nido sellado cuesta una vida.
- El nombre del tramo se dibuja en la fila 0 (decorativa) como indicador de la mecánica, sin número de nivel.
- Las muertes por medusa y por nido sellado usan la animación de agua y de seto de la SPEC 01. La muerte por dron tiene su propio destello cyan antes del parpadeo magenta.
- Dibujo de medusas, dron, aviso y sello de nidos diseñado con `/frontend-design`, con la paleta de `constants.ts`.
- `restart()` vuelve al tramo ORILLA, vuelta 0, con los peligros reiniciados.
- Leaderboard: sin cambios de código. Las puntuaciones siguen llegando a `/leaderboard?game=ranaria` por `onGameOver`.

**Fuera de alcance (para futuros specs):**

- Bonus de luciérnaga, cría que se rescata, racha de nidos y vida extra (SPEC GJ ranaria-03).
- Sonido y música (SPEC GJ ranaria-03).
- Editor de tramos, tramos aleatorios o generados por semilla.
- Elegir tramo o nivel inicial.
- Cambiar la tabla de puntos de la SPEC 01.
- Cambiar textos o portada de `ranaria` en el catálogo.
- Controles táctiles y juego en móvil.
- Antitrampas y validación de puntuación en el servidor.
- Tests automatizados (no hay script de test configurado).

## Data model

### Catálogo (sin cambios)

No hay migración. La fila `ranaria` queda como la dejó la SPEC GJ ranaria-01 (`cover = 'cover-ranaria'`, `sort_order = 8`). Su descripción larga ("con el tráfico cada vez más rápido") sigue siendo cierta.

### Contrato (sin cambios)

`GameCallbacks`, `GameInstance`, `GameFactory`, `GameEngine`, `GameCanvas`, `GamePlayer` y la entrada `ranaria: { factory: createRanariaGame }` de `GAME_ENGINES` no cambian.

### Tipos nuevos (`lib/games/ranaria/levels.ts`)

```ts
type MoverKind =
  "bike" | "car" | "buggy" | "racer" | "truck" | "raft" | "jelly"; // + "jelly"

type LaneDef = {
  row: number;
  kind: "road" | "river";
  mover: MoverKind; // "jelly" solo en carriles "river"
  length: number; // px; en "jelly", 40 × número de medusas del grupo
  baseSpeed: number; // px/s con signo
  count: number;
  spacing: number; // count × spacing ≥ 800 + length
};

type LevelDef = {
  name: string; // texto visible: "ORILLA", "CORRIENTE", ...
  roundTime: number; // segundos por ronda
  drone: boolean;
  sealedNests: boolean;
  lanes: readonly LaneDef[]; // 10 carriles: filas 12–8 y 6–2
};

export const LEVELS: readonly LevelDef[]; // 5 tramos
```

### Estado interno del motor (cambios en `lib/games/ranaria/engine.ts`)

```ts
type DeathCause = "road" | "water" | "edge" | "hedge" | "time" | "drone"; // + "drone"

type Mover = {
  x: number;
  jellyTime: number; // solo "jelly": segundos dentro del ciclo de 5,5 s; inicial = (i × 1.8) % 5.5
};

type Drone = { x: number; dir: 1 | -1 }; // { x: 40, dir: 1 } al empezar cada nivel

type NestSeal = {
  timer: number; // 0; avanza en "playing", "dead" y "levelclear"
  cursor: number; // 0; siguiente índice de nido a revisar en orden circular
  nest: number; // −1 sin nido afectado
  state: "idle" | "warn" | "sealed"; // "idle"
};

type EngineState = {
  // ...todo lo de la SPEC 01, más:
  levelDef: LevelDef; // LEVELS[0]
  lap: number; // 0 = floor((level − 1) / 5)
  roundTimeMax: number; // levelDef.roundTime; la barra de tiempo se dibuja como roundTime / roundTimeMax
  drone: Drone | null; // null si !levelDef.drone
  seal: NestSeal; // estado inicial de arriba
};
```

### Reglas derivadas

- Tramo y vuelta: `levelDef = LEVELS[(level − 1) % 5]`, `lap = floor((level − 1) / 5)` y `lapMultiplier = min(1 + 0.2 × lap, 1.8)`. `buildLanes(levelDef, lapMultiplier)` aplica `speed = baseSpeed × lapMultiplier`.
- Tiempo: cada ronda empieza con `roundTime = levelDef.roundTime`. El bonus de nido sigue siendo `50 + 10 × floor(roundTime)`.
- Medusas: el ciclo de cada grupo dura `JELLY_CYCLE = 5.5` s: `[0, 3)` a flote, `[3, 4)` aviso (parpadeo, aún sostiene), `[4, 5.5)` sumergido (no sostiene). `jellyTime` avanza con `dt` y se reduce módulo 5,5.
  - `raftUnder` solo cuenta un grupo `jelly` si `jellyTime < 4`.
  - Si la rana está sobre un grupo que se sumerge, en ese frame muere por `"water"`.
- Dron: en las fases `playing`, `dead` y `levelclear` (sin pausa), `x += dir × 80 × lapMultiplier × dt`; al pasar de 760 o bajar de 40 se recoloca en el límite y cambia `dir`. Muerte `"drone"` si la rana está en la fila 7 y `|frog.x − drone.x| < FROG_HALF + DRONE_HALF` (14 + 16).
- Nidos sellados (solo si `levelDef.sealedNests`):
  - `idle`: cuando `timer ≥ SEAL_INTERVAL − SEAL_WARN` (7 s), se busca desde `cursor` el siguiente nido vacío. Si existe, `nest = ese índice`, `cursor = nest + 1` (módulo 5) y estado `warn`. Si no, se sigue en `idle`.
  - `warn` (1 s): el nido parpadea en magenta y aún se puede entrar.
  - `sealed` (4 s): entrar en ese nido es muerte `"hedge"`.
  - Al acabar `sealed`: `state = "idle"`, `nest = −1`, `timer = 0`.
- Al subir de nivel: se recalculan `levelDef`, `lap`, `lanes`, `drone` y `seal` (estado inicial). Los peligros se reinician también al llamar a `restart()`.

### Tramos (`LEVELS`)

Velocidades base de la vuelta 0 en px/s (+ hacia la derecha). Formato de cada celda: `mover largo · velocidad · cantidad × separación`. Todas cumplen `count × spacing ≥ 800 + length`.

| Fila | 1 ORILLA (30 s)         | 2 CORRIENTE (30 s)      | 3 AUTOPISTA (28 s) · dron | 4 TORMENTA (26 s) · dron · sello | 5 ABISMO (24 s) · dron · sello |
| ---- | ----------------------- | ----------------------- | ------------------------- | -------------------------------- | ------------------------------ |
| 2    | raft 240 · +80 · 3×380  | raft 240 · +90 · 3×380  | raft 160 · +100 · 3×360   | raft 160 · +110 · 3×360          | jelly 120 · +100 · 4×280       |
| 3    | raft 120 · −60 · 4×280  | raft 120 · −70 · 4×280  | raft 120 · −80 · 4×280    | jelly 80 · −80 · 5×200           | raft 120 · −100 · 4×280        |
| 4    | raft 160 · +90 · 3×360  | raft 160 · +100 · 3×360 | raft 160 · +100 · 3×360   | raft 120 · +110 · 4×280          | jelly 120 · +110 · 4×280       |
| 5    | raft 240 · −70 · 3×400  | jelly 120 · −70 · 4×280 | jelly 120 · −80 · 4×280   | jelly 120 · −90 · 4×280          | raft 80 · −100 · 5×200         |
| 6    | raft 120 · +50 · 3×320  | raft 120 · +60 · 3×320  | raft 120 · +60 · 3×320    | raft 80 · +70 · 4×240            | jelly 80 · +80 · 5×200         |
| 8    | truck 120 · −70 · 3×340 | truck 120 · −80 · 3×340 | truck 120 · −90 · 3×340   | truck 120 · −100 · 3×340         | truck 120 · −110 · 3×340       |
| 9    | racer 50 · +180 · 2×450 | racer 50 · +200 · 2×450 | racer 50 · +240 · 2×450   | racer 50 · +260 · 2×450          | racer 50 · +300 · 2×450        |
| 10   | buggy 50 · −120 · 4×230 | buggy 50 · −130 · 4×230 | buggy 50 · −150 · 4×230   | buggy 50 · −160 · 4×230          | truck 120 · −90 · 3×340        |
| 11   | car 60 · +90 · 3×320    | car 60 · +100 · 3×320   | truck 120 · +70 · 3×340   | car 60 · +120 · 4×240            | car 60 · +140 · 4×240          |
| 12   | bike 40 · −60 · 4×240   | bike 40 · −70 · 4×240   | bike 40 · −80 · 4×240     | bike 40 · −90 · 5×200            | bike 40 · −100 · 5×200         |

Velocidad máxima posible: 300 × 1,8 = 540 px/s, 27 px por frame con `MAX_DT`, menos que la hitbox de la rana (28 px) más la del bólido (42 px).

### Archivos

- `lib/games/ranaria/levels.ts` (nuevo): `MoverKind`, `LaneDef`, `LevelDef` y `LEVELS`, sin globales mutables.
- `lib/games/ranaria/constants.ts`:
  - Se eliminan `LANES`, `SPEED_STEP`, `MAX_SPEED_MULTIPLIER` y `ROUND_TIME`.
  - Se añaden `LAP_SPEED_STEP = 0.2`, `MAX_LAP_MULTIPLIER = 1.8`, `JELLY_CYCLE = 5.5`, `JELLY_WARN_AT = 3`, `JELLY_DIVE_AT = 4`, `JELLY_PHASE_OFFSET = 1.8`, `JELLY_SIZE = 40`, `DRONE_ROW = 7`, `DRONE_MIN_X = 40`, `DRONE_MAX_X = 760`, `DRONE_SPEED = 80`, `DRONE_HALF = 16`, `SEAL_INTERVAL = 8`, `SEAL_WARN = 1` y `SEAL_DURATION = 4`.
  - `COLORS` añade `jelly` `#ff006e`, `jellyGlow` `rgba(255,0,110,0.35)`, `jellyDive` `rgba(255,0,110,0.12)`, `drone` `#00f5ff`, `droneEye` `#ff006e`, `seal` `#ff006e` y `levelName` `#8a8fb5`.
- `lib/games/ranaria/entities.ts`:
  - `buildLanes(levelDef, lapMultiplier)` sustituye a `buildLanes(level)` y a `speedMultiplier(level)`; inicializa `jellyTime`.
  - `updateLanes` avanza también `jellyTime`.
  - `raftUnder` ignora grupos `jelly` sumergidos.
  - Nuevas: `jellySubmerged(mover)`, `updateDrone(drone, dt, lapMultiplier)`, `hitsDrone(frog, drone)`, `updateSeal(seal, nests, dt)`.
  - Dibujo nuevo: `drawJellyGroup(ctx, x, y, length, jellyTime)`, `drawDrone(ctx, drone)`, `drawNests(ctx, nests, flash, seal)` (con aviso y sello) y `drawLevelName(ctx, name)` en la fila 0.
- `lib/games/ranaria/engine.ts`: usa `levelDef`, `lap`, `drone` y `seal`; resuelve las muertes nuevas y el nido sellado.

### Puntuación y tope

La tabla de puntos de la SPEC 01 no cambia. Solo cambia el tiempo por ronda, y con él el bonus máximo por nido:

| Tramo     | Tiempo por ronda | Máx. por nido (50 + 10 × (t − 1)) | Máximo teórico del nivel (5 × (110 + nido) + 1.000) |
| --------- | ---------------- | --------------------------------- | --------------------------------------------------- |
| ORILLA    | 30 s             | 340                               | 3.250                                               |
| CORRIENTE | 30 s             | 340                               | 3.250                                               |
| AUTOPISTA | 28 s             | 320                               | 3.150                                               |
| TORMENTA  | 26 s             | 300                               | 3.050                                               |
| ABISMO    | 24 s             | 280                               | 2.950                                               |

Una vuelta completa vale como mucho 15.650 puntos. Los niveles siguen sin fin, así que se mantiene `MAX_SCORE = 10_000_000`.

### Convenciones

- Las de la SPEC GJ ranaria-01: origen arriba a la izquierda en 800×600, `dt` en segundos con tope de 0,05 s, callbacks solo al cambiar vía `sync()`, paleta desde `constants.ts` y sin datos persistentes propios.
- Todo sigue siendo determinista: ciclos de medusas, dron y sellos dependen solo del tiempo de juego, sin `Math.random`.
- Los temporizadores de peligros no avanzan en pausa, en `ready` ni en `gameover`.

## Implementation plan

1. **Documentación.** Antes de tocar código, consultar `node_modules/next/dist/docs/01-app/` por si el registro o los imports de cliente han cambiado en Next 16. Esta spec no toca componentes, páginas ni `public/`.
2. **Tramos.** Crear `lib/games/ranaria/levels.ts` con los tipos y `LEVELS` de la tabla. Comprobar a mano `count × spacing ≥ 800 + length` en los 50 carriles. Compila sin usarse.
3. **Constantes.** En `constants.ts`, eliminar `LANES`, `SPEED_STEP`, `MAX_SPEED_MULTIPLIER` y `ROUND_TIME`, y añadir las constantes y colores nuevos. Adaptar `entities.ts` y `engine.ts` para que `buildLanes(LEVELS[0], 1)` reproduzca el nivel 1 actual.
   - Prueba manual: `/games/ranaria/play` juega igual que tras la SPEC 01 en el nivel 1.
4. **Niveles y vueltas.** En `engine.ts`, añadir `levelDef`, `lap` y `roundTimeMax`, y al subir de nivel recalcular tramo, vuelta y carriles. El tiempo por ronda sale de `levelDef.roundTime` y la barra usa `roundTime / roundTimeMax`.
   - Prueba manual: al completar ORILLA se juega CORRIENTE con 30 s por ronda. Hasta el paso 6, los grupos `jelly` se comportan y se dibujan como balsas normales.
5. **Medusas: lógica.** En `entities.ts`, `jellyTime` en `buildLanes` y `updateLanes`, `jellySubmerged` y el filtro en `raftUnder`. En `engine.ts`, muerte por `"water"` al sumergirse la medusa bajo la rana.
6. **Medusas: dibujo.** Diseñar con `/frontend-design` la medusa de plasma a flote, en aviso (parpadeo) y sumergida (contorno tenue), e implementar `drawJellyGroup`.
   - Prueba manual: en CORRIENTE, el carril 5 muestra grupos de 3 medusas que se sumergen por turnos; quedarse encima al sumergirse cuesta una vida.
7. **Dron centinela.** `updateDrone`, `hitsDrone` y `drawDrone` (diseño con `/frontend-design`). En `engine.ts`, crear el dron si `levelDef.drone`, moverlo y resolver la muerte `"drone"` con su destello cyan.
   - Prueba manual: en AUTOPISTA el dron patrulla la mediana; tocarlo cuesta una vida.
8. **Nidos sellados.** `updateSeal` y el aviso y sello en `drawNests` (diseño con `/frontend-design`). En `engine.ts`, avanzar `seal` si `levelDef.sealedNests` y tratar la entrada en un nido sellado como muerte `"hedge"`.
   - Prueba manual: en TORMENTA, cada 8 s un nido vacío parpadea 1 s y queda sellado 4 s; entrar en él cuesta una vida.
9. **Nombre del tramo y reinicio.** `drawLevelName` en la fila 0. `restart()` vuelve a ORILLA, vuelta 0, sin dron y con `seal` inicial.
   - Prueba manual: **JUGAR DE NUEVO** tras llegar a AUTOPISTA vuelve a ORILLA sin dron.
10. **Integración y leaderboard.** Jugar una partida hasta TORMENTA, terminarla, guardar y ver la puntuación en `/leaderboard?game=ranaria`. Sin cambios de código en la plataforma.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

**Catálogo**

- [ ] No hay migración nueva en `supabase/migrations/` y la fila `ranaria` no cambia respecto a la SPEC GJ ranaria-01.
- [ ] `/games` sigue mostrando RANARIA con la portada `cover-ranaria`.

**Motor**

- [ ] `lib/games/ranaria/levels.ts` exporta `LEVELS` con 5 tramos, y `constants.ts` ya no exporta `LANES`.
- [ ] El nivel 1 (ORILLA) se juega exactamente igual que en la SPEC GJ ranaria-01: mismos carriles, velocidades y 30 s por ronda.
- [ ] Los niveles 1 a 5 juegan, en orden, ORILLA, CORRIENTE, AUTOPISTA, TORMENTA y ABISMO, y el nombre del tramo se ve en la franja superior del canvas, sin número de nivel.
- [ ] El tiempo por ronda es de 30, 30, 28, 26 y 24 s según el tramo, y la barra de tiempo empieza llena en cada ronda.
- [ ] El nivel 6 vuelve a ORILLA con todo el tráfico visiblemente más rápido (×1,2), y a partir del nivel 21 la velocidad deja de subir (×1,8).
- [ ] Las medusas flotan 3 s, parpadean 1 s y se sumergen 1,5 s. Durante el parpadeo aún sostienen a la rana; sumergidas, no.
- [ ] Quedarse sobre una medusa cuando se sumerge resta una vida con la animación de agua.
- [ ] En un mismo carril, los grupos de medusas no se sumergen todos a la vez.
- [ ] En AUTOPISTA, TORMENTA y ABISMO un dron patrulla la mediana de borde a borde. Tocarlo resta una vida. En ORILLA y CORRIENTE no hay dron.
- [ ] En TORMENTA y ABISMO, cada 8 s un nido vacío parpadea en magenta 1 s y después queda sellado 4 s. Entrar en él sellado resta una vida; durante el parpadeo aún se puede llenar.
- [ ] Los nidos se sellan en orden circular y nunca se sella un nido lleno.
- [ ] La puntuación sigue las reglas de la SPEC GJ ranaria-01: +10 por fila nueva, +50 + 10 × segundos restantes por nido y +1.000 por nivel.
- [ ] Dos partidas con las mismas pulsaciones al mismo ritmo producen el mismo tráfico, las mismas medusas, el mismo dron y los mismos sellos.
- [ ] En pausa no avanzan las medusas, el dron ni el sello de nidos.
- [ ] El canvas sigue sin dibujar puntuación, vidas, nivel ni overlays de "GAME OVER" o "PAUSA".
- [ ] `lib/games/ranaria/` no usa `localStorage`, `Math.random` ni estado mutable a nivel de módulo.

**Integración con la plataforma**

- [ ] Puntuación, Vidas y Nivel del HUD coinciden en todo momento con el estado del motor, incluido el paso de ABISMO (nivel 05) a la segunda vuelta (nivel 06).
- [ ] **PAUSA**, `P`, `Esc` y el cambio de pestaña pausan también medusas, dron y sellos, y **REANUDAR** los continúa desde el mismo punto.
- [ ] **FIN** abre el modal con la puntuación actual, y **JUGAR DE NUEVO** vuelve a ORILLA con Puntuación 0, Vidas ♥ ♥ ♥ y Nivel 01, sin dron.
- [ ] Tras **SALIR** y volver a entrar, solo corre un loop: medusas y dron van a su velocidad normal.

**Leaderboard**

- [ ] **GUARDAR PUNTUACIÓN** inserta una fila en `scores` con `game_id = 'ranaria'` y la puntuación final, que aparece en `/leaderboard?game=ranaria` y en el top de `/games/ranaria`.

**No regresiones**

- [ ] ASTEROIDS, BLOQUE BUSTER, SERPENTINA y CAÍDA funcionan igual que antes.
- [ ] Los juegos sin motor siguen con la simulación.
- [ ] `next dev` no muestra errores en consola en `/games/ranaria/play` ni en `/leaderboard?game=ranaria`.
- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores en los archivos nuevos o modificados.

## Decisions

- **Sí:** ampliación con valor jugable propio sobre la SPEC GJ ranaria-01: tramos con identidad y tres peligros que cambian cómo se cruza el río, la mediana y los nidos. La SPEC 01 ya era un juego completo con un único trazado.
- **Sí:** 5 tramos diseñados a mano en `levels.ts`, como los niveles de BLOQUE BUSTER. Nombres, trazados y velocidades son propios. **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** tramos generados por semilla o aleatorios. Romperían la comparabilidad del ranking.
- **Sí:** bucle de tramos con vueltas a ×(1 + 0,2 × vuelta) y tope ×1,8. Mantiene el juego infinito de la SPEC 01 sin pantalla de victoria. **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** terminar la partida al completar ABISMO. En un juego de supervivencia el ranking pierde recorrido si hay techo.
- **Sí:** sustituir el multiplicador `1 + 0,15 × (nivel − 1)` de la SPEC 01. Con tramos cada vez más difíciles, sumar ambos multiplicadores llevaría la velocidad máxima a ~1.100 px/s, por encima del tope seguro de colisiones con `MAX_DT`.
- **Sí:** tiempo por ronda decreciente por tramo (30 → 24 s). Endurece el bonus de nido sin cambiar la tabla de puntos. **Supuesto del game-jam — revisar antes de aprobar.**
- **Sí:** medusas que se sumergen con aviso de 1 s y desfase de 1,8 s entre grupos. Obliga a leer el río sin hacerlo injusto. **Supuesto del game-jam — revisar antes de aprobar.**
- **Sí:** dron centinela en la mediana desde AUTOPISTA. La mediana deja de ser un refugio seguro sin añadir otra fila.
- **Sí:** nidos sellados en orden circular desde TORMENTA. Rompe la estrategia de llenar siempre el nido más cercano. El orden circular es determinista.
- **No:** sellar un nido elegido al azar o el más cercano a la rana. El primero no es determinista y el segundo castiga demasiado.
- **No:** cambiar la tabla de puntos. Los peligros endurecen el juego, pero los puntos de la SPEC 01 ya premian avanzar y llegar rápido. Bonus nuevos van en la SPEC GJ ranaria-03.
- **Sí:** nombre del tramo en la fila 0 como indicador propio de la mecánica, sin número de nivel. El nivel ya lo muestra el HUD.
- **No:** un rótulo grande "NIVEL N" en el canvas al cambiar de nivel. Sería un overlay que duplica el HUD.
- **Sí:** sin migración. La descripción del catálogo sigue siendo correcta.
- **Sí:** sin cambios de contrato, de `GamePlayer` ni de `GameCanvas`. No se tocan `scores`, `game_stats` ni `leaderboard`.
- **Sí:** sonido fuera de alcance; llega en la SPEC GJ ranaria-03.
- **Sí:** identificadores de código en inglés y textos visibles (nombres de tramo) en español.

## Risks

| Riesgo                                                                                         | Mitigación                                                                                                                                           |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Algún tramo es imposible de cruzar (medusas de dos carriles seguidos sumergidas a la vez).     | Desfase de 1,8 s entre grupos y aviso de 1 s. Se juega cada tramo en el paso de prueba manual y se ajustan velocidades en `levels.ts` si hace falta. |
| Un carril con `count × spacing < 800 + length` hace aparecer objetos de golpe.                 | Comprobación de los 50 carriles en el paso 2. La tabla ya cumple la regla.                                                                           |
| Con la vuelta ×1,8 un vehículo atraviesa a la rana entre dos frames.                           | Velocidad máxima 540 px/s → 27 px por frame con `MAX_DT`, menos que la suma de hitboxes. Se documenta en el Data model.                              |
| El sello cae sobre el último nido vacío y la rana pierde la ronda por tiempo esperando.        | El sello dura 4 s y el tiempo mínimo por ronda es 24 s. El aviso de 1 s permite cambiar de plan.                                                     |
| Los temporizadores de peligros siguen corriendo en pausa y al reanudar todo ha cambiado.       | Solo avanzan con `dt` dentro del loop, que no avanza en pausa. Hay un criterio específico.                                                           |
| Quitar `LANES` de `constants.ts` rompe la compilación a mitad de spec.                         | El paso 3 elimina y adapta en el mismo paso, y comprueba que el nivel 1 no cambia.                                                                   |
| `restart()` no reinicia dron o sellos y la segunda partida empieza con peligros de otro tramo. | `restart()` recalcula todo desde `LEVELS[0]`. Hay un criterio específico.                                                                            |
| Las APIs de Next 16 difieren de lo recordado.                                                  | Paso 1: consultar `node_modules/next/dist/docs/01-app/` antes de tocar código.                                                                       |

## What is **not** in this spec

- Bonus de luciérnaga, cría que se rescata, racha de nidos y vida extra (SPEC GJ ranaria-03).
- Sonido y música (SPEC GJ ranaria-03).
- Editor de tramos, tramos aleatorios o generados por semilla.
- Elegir tramo o nivel inicial.
- Cambiar la tabla de puntos de la SPEC 01.
- Cambiar textos o portada de `ranaria` en el catálogo.
- Controles táctiles y juego en móvil.
- Antitrampas y validación de puntuación en el servidor.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

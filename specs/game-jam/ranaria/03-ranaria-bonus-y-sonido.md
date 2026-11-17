# SPEC GJ ranaria-03 — Juego RANARIA: luciérnagas, crías, racha de nidos, vida extra y sonido

> **Estado:** Draft · **Depende de:** SPEC 05 (`05-asteroids-game.md` — contrato `GameFactory`, `GameCanvas`, `GamePlayer`), SPEC 06 (`06-games-and-leaderboard-supabase.md` — tablas `games` y `scores`, leaderboard), SPEC 07 (`07-caida-game.md` — registro `GameEngine` con `hasLives`), SPEC 08 (`08-bloque-buster-game.md` — sonido sin autoplay y cortado al pausar), `specs/game-jam/ranaria/01-ranaria-game.md` (motor base), `specs/game-jam/ranaria/02-ranaria-niveles-y-peligros.md` (tramos, medusas, dron y nidos sellados) · **Fecha:** 2026-11-16
> **Objetivo:** Añadir a `/games/ranaria/play` decisiones de riesgo y recompensa (luciérnagas en los nidos, crías que se rescatan del río y un multiplicador de racha de hasta ×3), una vida extra a los 10.000 puntos y efectos de sonido sintetizados, enviando la nueva puntuación y la vida extra al HUD y al leaderboard por los callbacks existentes.

## Scope

**Incluye:**

- Catálogo: sin cambios y sin migración.
- **Luciérnaga** (bonus de nido): cada 10 s, una luciérnaga se posa 5 s en un nido vacío y no sellado, elegido en orden circular. Llenar ese nido mientras la luciérnaga está posada suma +200.
- **Cría perdida** (bonus de rescate): cada 15 s, si no hay ninguna activa, aparece una cría sobre una plataforma del carril de río de la fila 4.
  - Si la rana cae sobre la plataforma donde está la cría, la recoge y la lleva a cuestas.
  - Entregarla en un nido suma +200.
  - Se pierde, sin penalización, si la rana muere con ella, si su plataforma sale del canvas o si es una medusa que se sumerge.
- **Racha de nidos**: cada nido llenado sin perder una vida desde el anterior sube la racha. Los puntos del nido (50 + 10 × segundos restantes) se multiplican por `min(racha, 3)`. Morir pone la racha a 0. La racha se conserva al cambiar de nivel.
  - Indicador "RACHA ×2" / "RACHA ×3" en la fila 0, a la derecha, como indicador propio de la mecánica.
- **Vida extra**: al alcanzar 10.000 puntos por primera vez en la partida, +1 vida (máximo 4). Una sola vez por partida.
- **Sonido sintetizado** con Web Audio, sin archivos: salto, atropello, chapuzón, nido, bonus, nivel completado y vida extra.
  - El `AudioContext` se crea con la pulsación de Espacio que arranca la partida.
  - Volumen fijo, sin control para silenciar.
  - `pause()` suspende el contexto, `resume()` lo reanuda, `end()` lo suspende y `destroy()` lo cierra.
- Dibujo de luciérnaga, cría (posada y a cuestas) y el indicador de racha, diseñado con `/frontend-design`.
- `restart()` reinicia racha, luciérnaga, cría y vida extra.
- Leaderboard: sin cambios de código.

**Fuera de alcance (para futuros specs):**

- Música de fondo, control de volumen y tecla o botón para silenciar.
- Archivos de audio en `public/games/ranaria/`.
- Más de una vida extra o vidas extra periódicas.
- Mostrar la racha en el HUD React (callback nuevo).
- Power-ups que cambien el control de la rana (salto doble, escudo, ralentizar el tiempo).
- Cambiar los tramos o los peligros de la SPEC GJ ranaria-02.
- Cambiar textos o portada de `ranaria` en el catálogo.
- Controles táctiles y juego en móvil.
- Antitrampas y validación de puntuación en el servidor.
- Tests automatizados (no hay script de test configurado).

## Data model

### Catálogo (sin cambios)

No hay migración. La fila `ranaria` queda como la dejó la SPEC GJ ranaria-01.

### Contrato (sin cambios)

`GameCallbacks`, `GameInstance`, `GameFactory`, `GameEngine`, `GameCanvas`, `GamePlayer` y la entrada `ranaria` de `GAME_ENGINES` no cambian. La vida extra se comunica con `onLives` y el HUD ya pinta cualquier número de `♥`.

### Estado interno del motor (cambios en `lib/games/ranaria/engine.ts`)

```ts
type Firefly = {
  timer: number; // 0; ciclo de 10 s: [0, 5) oculta, [5, 10) posada
  cursor: number; // (level − 1) % 5 al empezar cada nivel
  nest: number; // −1 si está oculta
};

type Hatchling = {
  state: "none" | "riding" | "carried"; // "none"
  timer: number; // 0; segundos desde que quedó "none"
  cursor: number; // 0; índice de plataforma de la fila 4 donde aparecerá la siguiente
  moverIndex: number; // −1; plataforma en la que va, solo en "riding"
};

type EngineState = {
  // ...todo lo de las SPEC GJ ranaria-01 y -02, más:
  streak: number; // 0
  extraLifeGiven: boolean; // false
  firefly: Firefly;
  hatchling: Hatchling;
};

// Fuera de EngineState, también privado de la instancia:
type Sound = {
  ctx: AudioContext | null; // null hasta la primera pulsación de Espacio
  master: GainNode | null; // ganancia 0,15
};
type SoundName =
  "hop" | "crash" | "splash" | "nest" | "bonus" | "levelclear" | "extralife";
```

### Reglas derivadas

- Luciérnaga (avanza en `playing`, `dead` y `levelclear`, sin pausa):
  - Al cruzar `timer = 5`, se busca desde `cursor` el siguiente nido vacío que no esté en `warn` ni `sealed`. Si existe, `nest = ese índice` y `cursor = nest + 1` (módulo 5). Si no, sigue oculta en ese ciclo.
  - Al llegar a `timer = 10`, `nest = −1` y `timer = 0`.
  - Si el nido donde está se sella, la luciérnaga se va (`nest = −1`) sin esperar al final del ciclo.
- Cría:
  - En `"none"`, `timer` avanza. Al llegar a `HATCHLING_INTERVAL = 15` s, pasa a `"riding"` en la plataforma `cursor % count` del carril de la fila 4, y `cursor += 1`.
  - En `"riding"`, se dibuja en el centro de su plataforma. Si la plataforma envuelve (sale del canvas) o es una medusa sumergida, vuelve a `"none"` con `timer = 0`.
  - Si la rana está en la fila 4 sobre esa misma plataforma, pasa a `"carried"`.
  - En `"carried"`, si la rana muere, vuelve a `"none"`. Si la rana llena un nido, suma `HATCHLING_POINTS` y vuelve a `"none"`.
- Nido llenado (sustituye la regla de la SPEC 01):
  1. `streak += 1`.
  2. `addScore((NEST_POINTS + TIME_BONUS_PER_SECOND × floor(roundTime)) × min(streak, MAX_STREAK_MULTIPLIER))`.
  3. Si `firefly.nest` es ese nido: `addScore(FIREFLY_POINTS)` y `firefly.nest = −1`.
  4. Si la cría está en `"carried"`: `addScore(HATCHLING_POINTS)`.
  5. Si es el quinto nido: `addScore(LEVEL_CLEAR_BONUS)` sin multiplicar.
- Muerte (cualquier causa): `streak = 0`, además de lo de las SPEC 01 y 02.
- Vida extra: tras cada `addScore`, si `!extraLifeGiven` y `score ≥ EXTRA_LIFE_SCORE`, `lives = min(lives + 1, MAX_LIVES)`, `extraLifeGiven = true` y suena `"extralife"`.
- Sonido: `playSound(name)` no hace nada si `ctx` es `null` o está suspendido. Cada efecto crea un `OscillatorNode` (y un `GainNode` con envolvente) conectado a `master`, y lo para con `stop(t + duración)`.

| `SoundName`  | Cuándo                          | Síntesis                                           |
| ------------ | ------------------------------- | -------------------------------------------------- |
| `hop`        | Cada salto                      | `square`, 440 → 660 Hz, 0,05 s                     |
| `crash`      | Muerte por vehículo o dron      | `sawtooth`, 160 → 60 Hz, 0,25 s                    |
| `splash`     | Muerte por agua, borde o medusa | `triangle`, 600 → 120 Hz, 0,3 s                    |
| `nest`       | Nido llenado (sin quinto)       | `square`, 523 · 659 · 784 Hz, 0,06 s cada nota     |
| `bonus`      | Luciérnaga o cría entregada     | `sine`, 1046 → 1568 Hz, 0,12 s                     |
| `levelclear` | Quinto nido                     | `square`, 523 · 659 · 784 · 1046 · 1318 Hz, 0,08 s |
| `extralife`  | Vida extra                      | `sine`, 784 · 1046 Hz, 0,15 s cada nota            |

La muerte por tiempo y por seto o nido sellado usa `crash`.

### Archivos

- `lib/games/ranaria/constants.ts` añade:
  - `FIREFLY_INTERVAL = 10`, `FIREFLY_VISIBLE_AT = 5`, `FIREFLY_POINTS = 200`.
  - `HATCHLING_ROW = 4`, `HATCHLING_INTERVAL = 15`, `HATCHLING_POINTS = 200`.
  - `MAX_STREAK_MULTIPLIER = 3`, `EXTRA_LIFE_SCORE = 10_000`, `MAX_LIVES = 4`.
  - `MASTER_VOLUME = 0.15` y `SOUNDS: Record<SoundName, { wave: OscillatorType; freqs: readonly number[]; duration: number; slide: boolean }>` con la tabla anterior.
  - `COLORS` añade `firefly` `#f5ff00`, `fireflyGlow` `rgba(245,255,0,0.35)`, `hatchling` `#7dffc4` y `streak` `#f5ff00`.
- `lib/games/ranaria/entities.ts` añade:
  - `updateFirefly(firefly, nests, seal, dt)`, `updateHatchling(hatchling, lane, frog, dt)` y `streakMultiplier(streak)`.
  - `drawFirefly(ctx, nestIndex, time)`, `drawHatchling(ctx, x, y)` y `drawStreak(ctx, streak)` (solo si `streak ≥ 2`).
- `lib/games/ranaria/sound.ts` (nuevo): `createSound()` devuelve `{ unlock, play, suspend, resume, close }`, sin globales. `unlock()` crea el `AudioContext` y `master` la primera vez.
- `lib/games/ranaria/engine.ts`: integra racha, luciérnaga, cría, vida extra y las llamadas a `sound.play`, `sound.suspend`, `sound.resume` y `sound.close`.

### Assets

Ninguno. Los efectos se sintetizan con Web Audio.

### Puntuación y tope

| Acción                             | Puntos                                         |
| ---------------------------------- | ---------------------------------------------- |
| Salto a una fila nueva de la ronda | +10                                            |
| Llenar un nido                     | (50 + 10 × segundos restantes) × min(racha, 3) |
| Luciérnaga en el nido llenado      | +200                                           |
| Entregar una cría                  | +200                                           |
| Llenar los 5 nidos                 | +1.000                                         |

Máximo teórico por nivel (ORILLA, 30 s, racha ≥ 3 en los 5 nidos, luciérnaga y cría en cada nido): 5 × (110 + 340 × 3 + 200 + 200) + 1.000 = **8.650**. En la práctica la luciérnaga y la cría no coinciden en cada nido. Los niveles siguen sin fin, así que se mantiene `MAX_SCORE = 10_000_000`.

### Convenciones

- Las de la SPEC GJ ranaria-01, más:
- Sigue sin haber `Math.random`: luciérnaga y cría usan cursores circulares y temporizadores de juego, y el ranking sigue siendo comparable.
- El sonido no afecta a la lógica: si el navegador bloquea Web Audio, el juego funciona igual.

## Implementation plan

1. **Documentación.** Consultar `node_modules/next/dist/docs/01-app/` antes de tocar código (no se tocan componentes, páginas ni `public/`), y la documentación de Web Audio de MDN para `AudioContext.suspend/resume/close`.
2. **Constantes.** Añadir a `constants.ts` las constantes, `SOUNDS` y colores nuevos. Compila sin usarse.
3. **Racha.** En `engine.ts`, `streak` y la nueva regla de nido con `streakMultiplier`; `streak = 0` al morir. `drawStreak` en la fila 0 (diseño con `/frontend-design`).
   - Prueba manual: dos nidos seguidos sin morir muestran "RACHA ×2" y el segundo suma el doble; morir lo borra.
4. **Vida extra.** En `addScore`, la comprobación de `EXTRA_LIFE_SCORE`. `sync()` ya envía `onLives`.
   - Prueba manual: con `EXTRA_LIFE_SCORE` bajado temporalmente a 300, el HUD pasa a ♥ ♥ ♥ ♥ una sola vez. Restaurar el valor.
5. **Luciérnaga.** `updateFirefly` y `drawFirefly` (diseño con `/frontend-design`). En `engine.ts`, avanzarla y sumar `FIREFLY_POINTS` al llenar su nido.
   - Prueba manual: cada 10 s una luciérnaga amarilla se posa 5 s en un nido vacío; llenarlo suma +200 extra.
6. **Cría: lógica.** `updateHatchling` con los estados `none → riding → carried → none` y sus pérdidas. En `engine.ts`, perderla al morir y sumar `HATCHLING_POINTS` al entregarla.
7. **Cría: dibujo.** Diseñar con `/frontend-design` la cría posada y a cuestas, e implementar `drawHatchling`.
   - Prueba manual: a los 15 s aparece una cría en la fila 4; recogerla y llegar a un nido suma +200 extra; morir con ella la pierde.
8. **Sonido.** Crear `lib/games/ranaria/sound.ts` con `createSound()`. En `engine.ts`: `unlock()` al pulsar Espacio en `ready`, `play` en cada evento de la tabla, `suspend` en `pause()` y `end()`, `resume` en `resume()` y `close` en `destroy()`.
   - Prueba manual: no suena nada en `ready`; tras Espacio suenan los saltos; al pausar se corta; tras **SALIR** no suena nada.
9. **Reinicio.** `restart()` pone `streak = 0`, `extraLifeGiven = false`, `firefly` y `hatchling` iniciales. El `AudioContext` se conserva.
10. **Integración y leaderboard.** Jugar una partida que supere 10.000 puntos, terminarla, guardar y ver la puntuación en `/leaderboard?game=ranaria`. Sin cambios de código en la plataforma.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

**Catálogo**

- [ ] No hay migración nueva y la fila `ranaria` no cambia.

**Motor**

- [ ] Llenar un nido con racha 1 suma 50 + 10 × segundos restantes; con racha 2, el doble; con racha 3 o más, el triple.
- [ ] "RACHA ×2" o "RACHA ×3" se ve en la franja superior del canvas desde el segundo nido seguido, y desaparece al perder una vida.
- [ ] La racha se conserva al pasar de nivel y el bonus de +1.000 por nivel no se multiplica.
- [ ] Cada 10 s una luciérnaga se posa 5 s en un nido vacío y no sellado, en orden circular. Llenar ese nido mientras está posada suma +200 además de los puntos del nido.
- [ ] Si el nido de la luciérnaga se sella, la luciérnaga desaparece.
- [ ] Cada 15 s sin cría activa aparece una cría sobre una plataforma de la fila 4. Saltar a esa plataforma la recoge y se dibuja a cuestas de la rana.
- [ ] Entregar la cría en un nido suma +200 además de los puntos del nido.
- [ ] La cría se pierde sin penalización si la rana muere con ella, si su plataforma sale del canvas o si su medusa se sumerge.
- [ ] Al alcanzar 10.000 puntos el HUD pasa de las vidas actuales a una más (máximo 4), una sola vez por partida.
- [ ] Dos partidas con las mismas pulsaciones al mismo ritmo producen las mismas luciérnagas y crías.
- [ ] El canvas sigue sin dibujar puntuación, vidas, nivel ni overlays de "GAME OVER" o "PAUSA".
- [ ] `lib/games/ranaria/` no usa `localStorage`, `Math.random` ni estado mutable a nivel de módulo.

**Sonido**

- [ ] Suenan efectos distintos al saltar, al ser atropellada, al caer al agua, al llenar un nido, al cobrar un bonus, al completar un nivel y al ganar la vida extra.
- [ ] En la pantalla de inicio no suena nada hasta pulsar Espacio, y la consola no muestra avisos de autoplay.
- [ ] Al pausar (botón, `P`, `Esc` o cambio de pestaña) se corta el sonido, y al reanudar vuelve.
- [ ] Tras **FIN** o **SALIR** no sigue sonando nada, y al volver a entrar cada salto suena una sola vez.
- [ ] Con el modal abierto, escribir las iniciales no produce sonidos.

**Integración con la plataforma**

- [ ] Puntuación, Vidas (incluida la vida extra) y Nivel del HUD coinciden en todo momento con el estado del motor.
- [ ] **JUGAR DE NUEVO** vuelve a la pantalla de inicio con Vidas ♥ ♥ ♥, sin racha, sin cría y con la vida extra disponible otra vez.
- [ ] **PAUSA** congela también la luciérnaga y la cría.

**Leaderboard**

- [ ] **GUARDAR PUNTUACIÓN** inserta una fila en `scores` con `game_id = 'ranaria'` y la puntuación final (incluidos bonus y racha), que aparece en `/leaderboard?game=ranaria` y en el top de `/games/ranaria`.

**No regresiones**

- [ ] Los tramos, medusas, dron y nidos sellados de la SPEC GJ ranaria-02 funcionan igual.
- [ ] ASTEROIDS, BLOQUE BUSTER (con su sonido), SERPENTINA y CAÍDA funcionan igual que antes.
- [ ] Los juegos sin motor siguen con la simulación.
- [ ] `next dev` no muestra errores en consola en `/games/ranaria/play` ni en `/leaderboard?game=ranaria`.
- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores en los archivos nuevos o modificados.

## Decisions

- **Sí:** ampliación centrada en riesgo y recompensa: luciérnaga, cría y racha cambian qué nido elegir y cuándo arriesgarse, no solo el aspecto.
- **Sí:** luciérnaga de +200 cada 10 s en nidos vacíos en orden circular. Premia desviarse del nido más cómodo. **Supuesto del game-jam — revisar antes de aprobar.**
- **Sí:** cría en la fila 4 cada 15 s, +200 al entregarla y perdida sin penalización. Obliga a una parada extra en el río. **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** penalizar perder la cría. Ya se pierde el bonus y la ronda.
- **Sí:** racha con multiplicador `min(racha, 3)` solo sobre los puntos del nido. Premia la constancia sin disparar la puntuación. **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** multiplicar también los saltos, bonus o el +1.000 por nivel. Haría la racha dominante sobre todo lo demás.
- **Sí:** racha dibujada en la fila 0 como indicador propio de la mecánica.
- **No:** callback `onStreak` y hueco en el HUD React. Sería un cambio de contrato para una métrica.
- **Sí:** una vida extra a los 10.000 puntos, máximo 4 vidas. Da un objetivo intermedio sin alargar las partidas indefinidamente. **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** vidas extra periódicas. Con niveles infinitos alargarían las partidas sin límite.
- **Sí:** sin `Math.random`: cursores circulares y temporizadores. Mantiene el ranking comparable, como en la SPEC GJ ranaria-02.
- **Sí:** sonido sintetizado con Web Audio en `lib/games/ranaria/sound.ts`, sin archivos. No hay assets de sonido para este juego en `references/` y así no hay nada que cargar. **Supuesto del game-jam — revisar antes de aprobar.**
- **No:** reutilizar los MP3 de `bloque-buster`. No están pensados para este juego.
- **No:** música de fondo, control de volumen ni tecla para silenciar. Sin UI propia en el canvas, como en BLOQUE BUSTER.
- **Sí:** el `AudioContext` se crea con la pulsación de Espacio, se suspende al pausar y al terminar, y se cierra en `destroy()`. Evita los avisos de autoplay y que suene tras salir.
- **Sí:** sin migración, sin cambios de contrato y sin tocar `scores`, `game_stats` ni `leaderboard`.
- **Sí:** identificadores de código en inglés y textos visibles ("RACHA ×2") en español.

## Risks

| Riesgo                                                                               | Mitigación                                                                                                                    |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| El navegador bloquea el `AudioContext` y la consola muestra avisos de autoplay.      | Se crea dentro del handler de Espacio, que cuenta como interacción. `play` no hace nada si `ctx` es `null` o está suspendido. |
| StrictMode o **SALIR** dejan un `AudioContext` abierto y sonidos duplicados.         | `destroy()` llama a `close()`. Hay un criterio de salir, volver y oír cada salto una sola vez.                                |
| Se acumulan nodos de audio sin liberar en partidas largas.                           | Cada efecto crea nodos de vida corta con `stop(t + duración)`; el navegador los libera al terminar.                           |
| La luciérnaga se posa en un nido que se sella y el jugador entra a por ella y muere. | Solo se posa en nidos que no estén en `warn` ni `sealed`, y se va si su nido se sella. Hay un criterio específico.            |
| La cría queda "flotando" si su plataforma envuelve o se sumerge.                     | En ambos casos vuelve a `"none"`. Hay un criterio específico.                                                                 |
| La racha ×3 desequilibra el ranking frente a jugadores prudentes.                    | El multiplicador solo afecta a los puntos de nido y se pierde con cualquier muerte. Tope en ×3.                               |
| La vida extra se concede varias veces al rondar los 10.000 puntos.                   | Flag `extraLifeGiven` por partida, reiniciado solo en `restart()`.                                                            |
| Escribir las iniciales en el modal produce sonidos.                                  | `setInputEnabled(false)` hace salir al handler antes de cualquier `play`, y `end()` suspende el contexto.                     |
| Las APIs de Next 16 difieren de lo recordado.                                        | Paso 1: consultar `node_modules/next/dist/docs/01-app/` antes de tocar código.                                                |

## What is **not** in this spec

- Música de fondo, control de volumen y tecla o botón para silenciar.
- Archivos de audio en `public/games/ranaria/`.
- Más de una vida extra o vidas extra periódicas.
- Mostrar la racha en el HUD React (callback nuevo).
- Power-ups que cambien el control de la rana (salto doble, escudo, ralentizar el tiempo).
- Cambiar los tramos o los peligros de la SPEC GJ ranaria-02.
- Cambiar textos o portada de `ranaria` en el catálogo.
- Controles táctiles y juego en móvil.
- Antitrampas y validación de puntuación en el servidor.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

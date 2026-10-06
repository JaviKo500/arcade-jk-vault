# SPEC 08 — Juego BLOQUE BUSTER (Arkanoid) jugable con leaderboard

> **Estado:** Implemented · **Depende de:** SPEC 05 (`05-asteroids-game.md` — contrato `GameFactory`, `GameCanvas`, `GamePlayer`), SPEC 06 (`06-games-and-leaderboard-supabase.md` — tablas `games` y `scores`, leaderboard), SPEC 07 (`07-caida-game.md` — registro `GameEngine` con `hasLives`) · **Fecha:** 2026-10-05
> **Objetivo:** Portar el Arkanoid de `references/04-arkanoid/` a un motor TypeScript que da vida al juego existente `bloque-buster` en `/games/bloque-buster/play`, con sonido, y que envía puntuación, vidas, nivel y fin de partida al HUD y al leaderboard de la plataforma.

## Scope

**Incluye:**

- Catálogo: se reutiliza la fila existente `bloque-buster` de `public.games` **sin migración**. El `id`, el título BLOQUE BUSTER, las descripciones, la categoría `ARCADE`, el acento `cyan`, la portada `cover-bricks` y el `sort_order = 2` no cambian.
- Portada: `cover-bricks` en `app/globals.css` se mantiene sin cambios.
- Motor portado a TypeScript en `lib/games/bloque-buster/` con `createBloqueBusterGame(canvas, callbacks)`:
  - Mecánica idéntica a `references/04-arkanoid/game.js` y `levels.js`:
    - Pala de 81×14 px en `y = 560`, movida a 400 px/s con el teclado y siguiendo al ratón.
    - Pelota de 16×16 px con velocidad base (200, −300) px/s multiplicada por la velocidad del nivel.
    - Rebote en las paredes izquierda, derecha y superior. En la pala solo se invierte `vy`, con una tolerancia de 8 px.
    - Bloques de 64×24 px en una rejilla de 10×6, con origen en (80, 80). Se rompe como máximo un bloque por frame, que invierte `vy` y suma +10 puntos.
    - Los 5 niveles del original: parrilla completa, pirámide, tablero de ajedrez, filas con huecos y marco con cruz. Velocidades ×1,00, ×1,10, ×1,21, ×1,33 y ×1,46.
    - Al vaciar un nivel se carga el siguiente y la pelota se recoloca sobre la pala. La puntuación se acumula entre niveles.
    - 3 vidas. Al caer la pelota por debajo del canvas se resta una vida y la pelota se relanza al instante desde la pala.
    - La partida termina al perder la última vida o al completar el nivel 5.
  - Sin estado global ni listeners sueltos. API `start`, `pause`, `resume`, `restart`, `end`, `setInputEnabled` y `destroy`.
  - Callbacks `onScore`, `onLives`, `onLevel`, `onPauseChange` y `onGameOver`, solo cuando cambia el valor.
- Pantalla de inicio en el canvas, "PULSA ESPACIO PARA EMPEZAR", con el nivel 1, la pala y la pelota dibujados. La partida no arranca hasta pulsar Espacio.
- Controles:
  - `←`/`→` y el ratón mueven la pala. `P` o `Esc` alternan la pausa.
  - `preventDefault` en las flechas y en Espacio.
  - El ratón se escucha con `mousemove` en el canvas, convertido a coordenadas lógicas con `getBoundingClientRect`. Se ignora en pausa y con el modal abierto.
  - El motor ignora el teclado mientras el modal está abierto.
- Pausa automática al ocultarse la pestaña (`visibilitychange`).
- Gráficos con primitivas de canvas y la paleta neón de `lib/games/bloque-buster/constants.ts`, sin spritesheet:
  - Pala, pelota y bloques en 7 colores neón.
  - La explosión del original (4 frames en 150 ms) se dibuja como una animación procedural de 4 fases.
- Sonido:
  - `ball-bounce.mp3` (rebote en las paredes y en la pala) y `break-sound.mp3` (rotura de bloque), copiados a `public/games/bloque-buster/sounds/`.
  - Volumen fijo y sin control para silenciar.
  - Nunca suena antes de la primera pulsación de Espacio ni durante la pausa.
- Se eliminan del port:
  - El HUD dibujado en el canvas (Score, Nivel y las pelotas de vidas).
  - Los overlays de "GAME OVER", de victoria y de pausa.
  - El selector de nivel del menú de pausa y su listener de `click`.
  - El spritesheet y `assets/spritesheet.js`.
- Registro `"bloque-buster": { factory: createBloqueBusterGame }` en `GAME_ENGINES` (`hasLives` por defecto, `true`).
- Leaderboard: las puntuaciones guardadas desde el modal aparecen en `/leaderboard?game=bloque-buster` y en el top de `/games/bloque-buster`, sin cambios en `scores`, `game_stats` ni `leaderboard`.

**Fuera de alcance (para futuros specs):**

- Controles táctiles y juego en móvil.
- Música, control de volumen y botón o tecla para silenciar.
- Cambios de mecánica o de balance:
  - Ángulo de rebote según el punto de impacto en la pala.
  - Pelota pegada a la pala hasta pulsar una tecla.
  - Bucle de niveles tras el 5.
  - Power-ups.
- Selector de nivel o saltar de nivel.
- Cambiar textos o portada de `bloque-buster` en el catálogo.
- Antitrampas y validación de puntuación en el servidor.
- Implementar otros juegos del catálogo.
- Tests automatizados (no hay script de test configurado).

## Data model

### Catálogo (sin cambios)

La fila existente de `public.games` se reutiliza tal cual. No hay migración, y `npm run db:types` no se ejecuta.

```sql
-- Fila actual, sin cambios (sembrada por 20261003140948_games_and_scores.sql)
-- id = 'bloque-buster', title = 'BLOQUE BUSTER', category = 'ARCADE', cover = 'cover-bricks',
-- accent_color = 'cyan', sort_order = 2   (0 puntuaciones guardadas al redactar esta spec)
```

### Contrato (sin cambios)

`GameCallbacks`, `GameInstance`, `GameFactory`, `GameEngine`, `GameCanvas` y `GamePlayer` no cambian. Solo se añade una entrada al registro:

```ts
// lib/games/registry.ts
export const GAME_ENGINES: Partial<Record<string, GameEngine>> = {
  asteroids: { factory: createAsteroidsGame },
  "bloque-buster": { factory: createBloqueBusterGame }, // hasLives por defecto: el HUD muestra "Vidas"
  caida: { factory: createCaidaGame, hasLives: false },
};
```

### Estado interno del motor (privado de `lib/games/bloque-buster/engine.ts`)

```ts
type Phase = "ready" | "playing" | "gameover";
// "ready": pantalla "PULSA ESPACIO PARA EMPEZAR", con el nivel 1, la pala centrada y la pelota encima
// "playing": partida en curso (la pausa es un flag aparte, como en ASTEROIDS y CAÍDA)
// "gameover": sin vidas, nivel 5 completado o llamada a end(). Ya se llamó a onGameOver

type Rect = { x: number; y: number; w: number; h: number };
type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";

type Block = Rect & { color: BlockColor; alive: boolean };
type Ball = Rect & { vx: number; vy: number }; // px/s
type Explosion = Rect & { color: BlockColor; elapsed: number }; // elapsed en segundos

type EngineState = {
  phase: Phase; // "ready"
  paused: boolean; // false
  inputEnabled: boolean; // true
  keys: { left: boolean; right: boolean }; // false, false; se ponen a false al pausar
  paddle: Rect; // { x: (800 − 81) / 2, y: 560, w: 81, h: 14 }
  ball: Ball; // centrada sobre la pala, velocidad base × velocidad del nivel 1
  blocks: Block[]; // los del nivel 1
  explosions: Explosion[]; // []
  score: number; // 0
  lives: number; // 3
  level: number; // 1 (de 1 a 5)
};
```

### Archivos del motor

- `lib/games/bloque-buster/constants.ts`:
  - Medidas: `W = 800`, `H = 600`, `PADDLE_W = 81`, `PADDLE_H = 14`, `PADDLE_Y = 560`, `PADDLE_SPEED = 400`, `BALL_SIZE = 16`, `PADDLE_TOLERANCE = 8`.
  - Bloques: `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, `BLOCKS_ORIGIN_X = 80` y `BLOCKS_ORIGIN_Y = 80`.
  - Física y reglas: `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`, `POINTS_PER_BLOCK = 10`, `INITIAL_LIVES = 3`, `EXPLOSION_DURATION = 0.15`, `MAX_DT = 0.05`.
  - Sonidos: `SOUNDS = { bounce: "/games/bloque-buster/sounds/ball-bounce.mp3", break: "/games/bloque-buster/sounds/break-sound.mp3" }`.
  - Paleta `COLORS`:
    - `background` `#0a0a0f`, `paddle` cyan `#00f5ff`, `ball` `#e6e9ff`, `text` `#e6e9ff` y `textDim` `#8a8fb5`.
    - `blocks`, indexado por `BlockColor`: red → naranja `#ff7700`, yellow → `#f5ff00`, cyan → `#00f5ff`, magenta → violeta `#aa00ff`, hotpink → `#ff006e`, green → `#00ff88` y gray → `#8a8fb5`.
- `lib/games/bloque-buster/levels.ts`: `LEVELS: readonly Level[]`, con `Level = { speed: number; blocks: { col: number; row: number; color: BlockColor }[] }`. Contiene los mismos 5 patrones y velocidades que `levels.js`, generados sin globales.
- `lib/games/bloque-buster/entities.ts`: funciones puras que reciben el estado o el `ctx` como parámetros:
  - `buildBlocks(level)`, `resetBall(ball, paddle, speed)` y `collideAABB(a, b)`.
  - `drawPaddle`, `drawBall`, `drawBlock` y `drawExplosion(ctx, explosion, color)`.
- `lib/games/bloque-buster/engine.ts`:
  - `createBloqueBusterGame: GameFactory`.
  - Loop, entrada de teclado y ratón, y fases.
  - Física y colisiones, reglas de puntuación, vidas, nivel y fin de partida.
  - Sonido, dibujo y pantalla de inicio.
  - `sync()` para disparar los callbacks.

### Assets

- `public/games/bloque-buster/sounds/ball-bounce.mp3` y `public/games/bloque-buster/sounds/break-sound.mp3`, copiados sin cambios de `references/04-arkanoid/assets/sounds/`.
- Los `Audio` base se crean dentro de la factory. Cada sonido se reproduce con un clon (`cloneNode`), y el rechazo de `play()` se captura y se ignora.
- Los clones activos se guardan en un `Set` de la instancia y se quitan con el evento `ended`. `pause()`, `end()` y `destroy()` paran los que quedan.
- El spritesheet **no** se copia.

### Puntuación y tope

| Nivel | Patrón                 | Bloques | Puntos máx. | Velocidad |
| ----- | ---------------------- | ------- | ----------- | --------- |
| 1     | Parrilla completa 10×6 | 60      | 600         | ×1,00     |
| 2     | Pirámide centrada      | 40      | 400         | ×1,10     |
| 3     | Tablero de ajedrez     | 30      | 300         | ×1,21     |
| 4     | Filas con huecos       | 39      | 390         | ×1,33     |
| 5     | Marco + cruz central   | 39      | 390         | ×1,46     |

La puntuación máxima posible es **2.080**: +10 por bloque, sin multiplicadores, y cada nivel se juega una sola vez. Cabe sobradamente en `score between 0 and 10000000`, así que no hace falta tope en el motor.

### Convenciones

- Coordenadas con origen arriba a la izquierda en el espacio lógico de 800×600, el mismo que el original.
- Velocidades en px/s y `dt` en segundos con tope de 0,05 s. El original no limita `dt`.
- Callbacks solo cuando el valor cambia, vía `sync()` y la caché `reported`.
- La paleta sale de `constants.ts`, nunca de variables CSS.
- El juego no crea datos persistentes. El guardado es el de `GamePlayer` (`insertScore`).

## Implementation plan

1. **Assets, constantes y niveles.** Antes de nada, consultar en `node_modules/next/dist/docs/01-app/` cómo sirve Next 16 la carpeta `public/` (rutas absolutas desde `/`).
   - Copiar `ball-bounce.mp3` y `break-sound.mp3` de `references/04-arkanoid/assets/sounds/` a `public/games/bloque-buster/sounds/`.
   - Crear `lib/games/bloque-buster/constants.ts` con las medidas, la física, `SOUNDS` y la paleta `COLORS`.
   - Crear `lib/games/bloque-buster/levels.ts` con `LEVELS` (los 5 patrones y velocidades de `levels.js`) y el tipo `BlockColor`.
   - Prueba manual: `http://localhost:3000/games/bloque-buster/sounds/ball-bounce.mp3` se reproduce en el navegador. Compila sin usarse.
2. **Entidades.** Crear `lib/games/bloque-buster/entities.ts` con `buildBlocks`, `resetBall`, `collideAABB` y las funciones de dibujo (`drawPaddle`, `drawBall`, `drawBlock` y `drawExplosion`).
   - Misma geometría que `game.js`, con el `ctx` y el estado como parámetros.
   - Compila sin usarse.
3. **Núcleo del motor.** Crear `lib/games/bloque-buster/engine.ts` con `createBloqueBusterGame(canvas, callbacks)`:
   - `EngineState`, fases `ready → playing → gameover` y `paused` como flag.
   - Loop con `requestAnimationFrame` y `dt` con tope de `MAX_DT`.
   - Movimiento de la pala por `keys` y de la pelota por `vx`/`vy`.
   - Rebotes en paredes y pala, y colisión con un bloque por frame. Avance de las explosiones.
   - Reglas:
     - Cada bloque suma `POINTS_PER_BLOCK`.
     - Al vaciar un nivel se carga el siguiente con `buildBlocks` y `resetBall`.
     - Tras el nivel 5, fase `gameover`.
     - Si la pelota cae, se resta una vida y se relanza, o la partida pasa a `gameover` al llegar a 0 vidas.
     - Al entrar en `gameover` se llama a `onGameOver(score)`.
   - `sync()` con la caché `reported` para `onScore`, `onLives`, `onLevel` y `onPauseChange`, y comprobación de `destroyed` tras `sync()`.
   - Sin registrar todavía. Compila sin usarse.
4. **Dibujo.** Diseñar con `/frontend-design` el aspecto en el canvas:
   - Bloques neón, pala, pelota, las 4 fases de la explosión y la pantalla de inicio.
   - Implementarlo en `engine.ts` con las funciones de `entities.ts`: fondo `#0a0a0f`, bloques vivos, explosiones, pala y pelota.
   - Pantalla `ready` con "PULSA ESPACIO PARA EMPEZAR" sobre el nivel 1.
   - Fuente `--font-press-start-2p` con fallback `monospace`.
   - Sin puntuación, vidas, nivel ni overlays de pausa, victoria o fin de partida.
5. **Entrada y ciclo de vida.** En `engine.ts`:
   - `keydown` y `keyup` en `window`, con handlers con nombre. Si `inputEnabled` es `false`, el handler sale antes del `preventDefault`.
   - `preventDefault` en las flechas y en Espacio. `P`/`Esc` alternan la pausa solo en `playing`.
   - En `ready`, Espacio arranca la partida. Las flechas actualizan `keys`.
   - `mousemove` en el canvas, convertido a coordenadas lógicas con `getBoundingClientRect` y limitado a `[0, W − PADDLE_W]`. Se ignora en pausa, en `gameover` o con `inputEnabled = false`.
   - `visibilitychange` pausa el juego. Al pausar, `keys` se pone a `false` para evitar teclas atascadas.
   - El resto de la API:
     - `pause` y `resume`, que reinicia `lastTime`.
     - `restart`: nivel 1, score 0, 3 vidas y fase `ready`.
     - `end` y `setInputEnabled`.
     - `destroy`, que cancela el `requestAnimationFrame` y quita los cuatro listeners (`keydown`, `keyup`, `mousemove` y `visibilitychange`).
6. **Sonido.** En `engine.ts`:
   - Crear los dos `Audio` base desde `SOUNDS` y una función `playSound(name)`. Esta clona el audio, lo registra en el `Set` de clones activos, captura el rechazo de `play()` y quita el clon con `ended`.
   - `bounce` suena al rebotar en las paredes y en la pala, y `break` al romper un bloque.
   - `pause()`, `end()` y `destroy()` paran y vacían los clones activos.
   - Compila sin usarse. El sonido se prueba en el paso 7.
7. **Registro e integración.** Añadir `"bloque-buster": { factory: createBloqueBusterGame }` a `GAME_ENGINES`.
   - Prueba manual: `/games/bloque-buster/play` muestra el motor real con "Vidas" en el HUD.
   - Jugar una partida: ver Puntuación, Vidas y Nivel actualizados, oír los sonidos, perder, ver el modal y guardar.
8. **Leaderboard.** Guardar una puntuación de BLOQUE BUSTER y verla en `/leaderboard?game=bloque-buster` y en el top de `/games/bloque-buster`. Si los pasos anteriores son correctos, no requiere cambios de código.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

**Catálogo**

- [x] `public.games` mantiene la fila `bloque-buster` sin cambios (`title`, descripciones, `category = 'ARCADE'`, `cover = 'cover-bricks'`, `accent_color = 'cyan'`, `sort_order = 2`), y no hay migración nueva en `supabase/migrations/`.
- [x] `/games` y Home muestran BLOQUE BUSTER con la portada `cover-bricks`, igual que antes.
- [x] `/games/bloque-buster` muestra el detalle, y **JUGAR AHORA** lleva a `/games/bloque-buster/play`.

**Motor**

- [x] Al entrar en `/games/bloque-buster/play`, el canvas muestra "PULSA ESPACIO PARA EMPEZAR" sobre el nivel 1, y la pelota no se mueve hasta pulsar Espacio.
- [x] `←`/`→` mueven la pala a velocidad constante, y la pala sigue al ratón sobre el canvas, también con el canvas escalado. La pala nunca sale de los bordes.
- [x] La pelota rebota en las paredes izquierda, derecha y superior, y en la pala.
- [x] Cada bloque roto desaparece con una animación de explosión breve y suma exactamente 10 puntos. En un mismo frame se rompe como máximo un bloque.
- [x] Los 5 niveles muestran los patrones del original, en este orden: parrilla completa, pirámide, ajedrez, filas con huecos y marco con cruz.
- [x] Al romper el último bloque de un nivel se carga el siguiente, la pelota vuelve sobre la pala, el Nivel del HUD sube en 1, la puntuación se conserva y la pelota es visiblemente más rápida.
- [x] Si la pelota cae por debajo de la pala, se resta una vida y la pelota se relanza al instante desde la pala.
- [x] La partida termina al perder la tercera vida.
- [x] La partida también termina al romper el último bloque del nivel 5, y el modal muestra la puntuación final (2.080 si no se perdió ningún bloque).
- [x] No existe ningún selector de nivel, y el clic sobre el canvas no hace nada.
- [x] Mientras el canvas está montado, ni las flechas ni Espacio hacen scroll de la página.
- [x] El canvas no dibuja puntuación, vidas, nivel ni ningún overlay de "GAME OVER", victoria o "PAUSA".
- [x] Bloques, pala y pelota usan la paleta neón acordada sobre el fondo `#0a0a0f`, sin cargar ninguna imagen.
- [x] `lib/games/bloque-buster/` no usa `localStorage`, no lee variables CSS de color y no tiene estado mutable a nivel de módulo.

**Sonido**

- [x] Suena `ball-bounce.mp3` al rebotar en las paredes y en la pala, y `break-sound.mp3` al romper un bloque.
- [x] Desde la pantalla de inicio no suena nada hasta pulsar Espacio, y la consola no muestra errores de autoplay.
- [x] Al pausar no suena nada nuevo y se cortan los sonidos en curso.
- [x] Tras **SALIR**, no sigue sonando nada.

**Integración con la plataforma**

- [x] Puntuación, Vidas y Nivel del HUD coinciden en todo momento con el estado del motor, y "Vidas" empieza en ♥ ♥ ♥.
- [x] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final del motor.
- [x] Con el modal abierto, escribir las iniciales (incluido Espacio) o mover el ratón no afecta a la pala ni al juego.
- [x] **PAUSA** congela la pelota y la pala, y **REANUDAR** continúa desde el mismo estado. `P` y `Esc` alternan la pausa, y la etiqueta del botón cambia.
- [x] Con el juego en pausa, ni las flechas ni el ratón mueven la pala.
- [x] Cambiar de pestaña con una flecha pulsada y volver deja el juego en pausa, con el botón en **REANUDAR**, y al reanudar la pala no se mueve sola.
- [x] Al reanudar tras una pausa larga, la pelota no da un salto ni atraviesa bloques.
- [x] **FIN** abre el modal con la puntuación actual.
- [x] **JUGAR DE NUEVO** vuelve a la pantalla de inicio con el nivel 1 completo, Puntuación 0, Vidas ♥ ♥ ♥ y Nivel 01.
- [x] Tras **SALIR** y volver a entrar, solo corre un loop: la pelota va a la velocidad normal y cada rebote suena una sola vez.
- [x] En un viewport de 480 px de ancho, el canvas se escala manteniendo la proporción 4:3, sin overflow horizontal.

**Leaderboard**

- [x] **GUARDAR PUNTUACIÓN** inserta una fila en `scores` con `game_id = 'bloque-buster'`, el nombre normalizado y la puntuación final.
- [x] La puntuación aparece en `/leaderboard?game=bloque-buster` y en el top de `/games/bloque-buster`.
- [x] Recargar `/games` refleja el nuevo `playCount` de BLOQUE BUSTER y, si la supera, el nuevo `bestScore`.
- [x] Con sesión iniciada, la fila "TU MEJOR MARCA" de `/leaderboard?game=bloque-buster` muestra la marca del jugador.

**No regresiones**

- [x] ASTEROIDS (motor, HUD con Vidas, pausa, modal y guardado) funciona igual que antes.
- [x] CAÍDA (motor, HUD sin Vidas, pausa, modal y guardado) funciona igual que antes.
- [x] Los juegos sin motor siguen con la simulación.
- [x] `/leaderboard` sin parámetros sigue abriendo la pestaña ASTEROIDS.
- [x] `next dev` no muestra errores en consola en `/`, `/games`, `/games/bloque-buster`, `/games/bloque-buster/play` ni `/leaderboard?game=bloque-buster`.
- [x] `npm run build` termina sin errores.
- [x] `npm run lint` no reporta errores en los archivos nuevos o modificados.

## Decisions

- **Sí:** dar motor al juego existente `bloque-buster`. Es el mismo juego (ARCADE, `cover-bricks`), conserva su `id`, su URL y su posición 2 en Home, y en Supabase tenía 0 puntuaciones, así que no hereda datos de la simulación.
- **No:** crear una entrada nueva `arkanoid`. Habría dos juegos equivalentes en el catálogo y BLOQUE BUSTER seguiría siendo una simulación.
- **Sí:** mantener sin cambios el título, las descripciones y la portada `cover-bricks`. Los textos describen correctamente el port, la portada ya representa un muro de bloques y así no hace falta migración.
- **No:** una migración `update` para mencionar los 5 niveles y las 3 vidas, ni una portada nueva. No aporta nada al objetivo.
- **Sí:** port con mecánica idéntica a `game.js`. Incluye la pala de 81 px (el código manda sobre el `CLAUDE.md` de la referencia, que dice 162), el rebote que solo invierte `vy`, un bloque por frame y el relanzamiento inmediato al perder una vida. Esta spec es un port, no un rediseño.
- **No:** ángulo de rebote según el punto de impacto, ni pelota pegada a la pala hasta pulsar una tecla. Son cambios de mecánica y quedan fuera de alcance.
- **Sí:** motor TypeScript bajo `GameFactory` en `lib/games/bloque-buster/`, con los niveles en `levels.ts`. Es el patrón de las SPEC 05 y 07, y lo único que lleva la puntuación al HUD y al leaderboard.
- **No:** `<iframe>` con los archivos originales. Ya se descartó en la SPEC 05: aísla el juego y obliga a usar `postMessage`.
- **Sí:** eliminar el selector de nivel del menú de pausa y su listener de `click`. `loadLevel(n)` recarga los bloques sin reiniciar la puntuación, así que permitía acumular puntos ilimitados en el leaderboard.
- **No:** mantener el selector reiniciando la puntuación, ni mantenerlo tal cual. El primero añade UI propia del juego sin valor para el ranking, y el segundo es una vía de trampas.
- **Sí:** completar el nivel 5 cuenta como fin de partida, con `onGameOver(finalScore)` y el modal de la plataforma. Equivale al estado `win` del original sin dibujar overlay, y la puntuación máxima posible queda fija en 2.080.
- **No:** bucle de niveles tras el 5. Es un cambio de mecánica.
- **No:** mensaje "¡COMPLETADO!" en el canvas antes del modal. Sería un overlay propio, contrario al contrato.
- **Sí:** sin tope de puntuación en el motor. El máximo posible (2.080) está muy por debajo del `check` de `scores.score`.
- **Sí:** mantener el ratón junto al teclado, como en el original. El `mousemove` va en el canvas, se convierte a coordenadas lógicas con `getBoundingClientRect`, se quita en `destroy()` y respeta `setInputEnabled` y la pausa.
- **No:** solo teclado. Perdería un control esencial del original.
- **Sí:** arrancar con Espacio desde la pantalla `ready`, como ASTEROIDS y CAÍDA.
- **No:** arrancar con un clic en el canvas. El clic queda sin uso y se mantiene la coherencia con los demás juegos.
- **Sí:** poner `keys` a `false` al pausar. El `keyup` se pierde si la pestaña se oculta con una flecha pulsada, y la pala se movería sola al reanudar. No cambia la mecánica.
- **Sí:** dibujar con primitivas de canvas y la paleta neón, sin spritesheet. Así no hay imágenes que cargar ni esperar en `ready`, y el juego encaja con la estética de la plataforma.
- **Sí:** repartir los 7 colores de bloque así: red → naranja, magenta → violeta y gray → gris metálico, más los 4 neones de ASTEROIDS. Reutiliza la ampliación de paleta de CAÍDA y mantiene 7 colores distinguibles. Solo cambian los colores.
- **No:** copiar `spritesheet-breakout.png` a `public/` y usar sprites. Conserva el aspecto original, pero no usa la paleta neón y añade una carga asíncrona antes de jugar.
- **Sí:** la explosión del original (4 frames en 150 ms) se dibuja de forma procedural en 4 fases, diseñadas con `/frontend-design`.
- **Sí:** incluir sonido con los dos MP3 del original en `public/games/bloque-buster/sounds/`. Se reproducen clonando el `Audio`, como en el original, sin reproducir nada antes de la primera pulsación y cortando los sonidos al pausar, al terminar y al destruir.
- **No:** dejar el sonido fuera de alcance, como en las SPEC 05 y 07. El usuario lo pidió explícitamente.
- **No:** control de volumen o tecla `M` para silenciar. Quedan fuera de alcance para no añadir UI propia en el canvas.
- **Sí:** sin cambios de contrato. El registro usa `GameEngine` con `hasLives` por defecto (`true`), así que el HUD muestra "Vidas" sin tocar `GamePlayer` ni `GameCanvas`.
- **Sí:** el leaderboard no se reimplementa ni se tocan `scores`, `game_stats` ni `leaderboard`. Las vistas ya funcionan por `game_id`.
- **Sí:** `sort_order = 2` sin cambios. BLOQUE BUSTER sigue en el top 6 de Home, y la pestaña inicial de `/leaderboard` sigue siendo ASTEROIDS.
- **Sí:** identificadores de código en inglés y textos visibles en español, mismo criterio que las specs 01 a 07.
- **Nota:** `.claude/skills/add-game/platform-contract.md` aún describe el registro anterior a la SPEC 07 (sin `GameEngine`). Esta spec se basa en el código actual. Actualizar ese documento queda fuera de alcance.

## Risks

| Riesgo                                                                                                                                | Mitigación                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta dos veces `GameCanvas` y quedan dos loops o listeners duplicados (pelota al doble de velocidad, sonidos duplicados). | `destroy()` cancela el `requestAnimationFrame`, quita los cuatro listeners y para los clones de audio. Hay un criterio de salir y volver a entrar.                                                                              |
| La clave `"bloque-buster"` de `GAME_ENGINES` no coincide con `games.id` y el juego cae en la simulación.                              | La clave va entre comillas, copiada del `id` de la migración. Hay un criterio de jugar en `/games/bloque-buster/play` con el motor real.                                                                                        |
| Tras una pausa o un cambio de pestaña, el primer `dt` es enorme y la pelota atraviesa bloques o la pala.                              | Tope `MAX_DT = 0.05` y reinicio de `lastTime` al reanudar. Con ese tope, la pelota avanza como máximo unos 22 px por frame en el nivel 5: menos que el alto de un bloque (24 px) y dentro de la ventana de la pala (14 + 8 px). |
| La pala se mueve sola al reanudar porque el `keyup` se perdió con la pestaña oculta.                                                  | `keys` se pone a `false` al pausar. Hay un criterio de aceptación específico.                                                                                                                                                   |
| Teclas como Espacio o el ratón mueven la pala mientras se escriben las iniciales en el modal.                                         | `setInputEnabled(false)` hace salir a los handlers de teclado y ratón antes del `preventDefault`. Hay un criterio específico.                                                                                                   |
| Con el canvas escalado por CSS, la pala no sigue bien al ratón.                                                                       | Conversión con `getBoundingClientRect` y `W / rect.width`, como el original. Se comprueba a 480 px de ancho.                                                                                                                    |
| El navegador bloquea `play()` por la política de autoplay y la consola muestra errores.                                               | Solo suena tras pulsar Espacio, que cuenta como interacción del usuario. El rechazo de `play()` se captura y se ignora.                                                                                                         |
| Los sonidos siguen sonando tras salir, o se acumulan clones de `Audio` sin liberar.                                                   | `Set` de clones activos, que se quitan con `ended`. `pause()`, `end()` y `destroy()` paran y vacían el `Set`.                                                                                                                   |
| La ruta de los MP3 da 404 por un error de rutas en `public/`.                                                                         | Rutas absolutas desde `/` en `SOUNDS`, consultando la documentación de `public/` de Next 16. En el paso 1 se comprueba la URL en el navegador.                                                                                  |
| Callbacks con `setState` en cada frame provocan re-renders del HUD a 60 fps.                                                          | `sync()` solo dispara cuando cambia el valor.                                                                                                                                                                                   |
| La pelota rebota dos veces en el mismo bloque o en la pala y queda atrapada.                                                          | El rebote en la pala fuerza `vy = −abs(vy)` y recoloca la pelota encima, como el original. Se rompe un bloque por frame y el bloque queda `alive = false` antes del siguiente frame.                                            |
| Las fuentes no están cargadas al dibujar la pantalla de inicio.                                                                       | Fallback a `monospace`. El texto se redibuja en cada frame.                                                                                                                                                                     |
| Las APIs de Next 16 o React 19 difieren de lo recordado.                                                                              | Consultar `node_modules/next/dist/docs/01-app/` en el paso 1, antes de tocar `public/` o el registro.                                                                                                                           |

## What is **not** in this spec

- Controles táctiles y juego en móvil.
- Música, control de volumen y botón o tecla para silenciar.
- Cambios de mecánica o de balance:
  - Ángulo de rebote según el punto de impacto en la pala.
  - Pelota pegada a la pala hasta pulsar una tecla.
  - Bucle de niveles tras el 5.
  - Power-ups.
- Selector de nivel o saltar de nivel.
- Cambiar textos o portada de `bloque-buster` en el catálogo.
- Actualizar `.claude/skills/add-game/platform-contract.md` al contrato de la SPEC 07.
- Antitrampas y validación de puntuación en el servidor.
- Implementación de los demás juegos del catálogo.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

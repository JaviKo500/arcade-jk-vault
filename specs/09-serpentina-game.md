# SPEC 09 — Juego SERPENTINA (Snake) jugable con leaderboard

> **Estado:** Approved · **Depende de:** SPEC 05 (`05-asteroids-game.md` — contrato `GameFactory`, `GameCanvas`, `GamePlayer`), SPEC 06 (`06-games-and-leaderboard-supabase.md` — tablas `games` y `scores`, leaderboard), SPEC 07 (`07-caida-game.md` — registro `GameEngine` con `hasLives`), SPEC 08 (`08-bloque-buster-game.md` — assets en `public/games/<id>/`) · **Fecha:** 2026-10-11
> **Objetivo:** Crear un Snake original como motor TypeScript que da vida al juego existente `serpentina` en `/games/serpentina/play`, con las frutas pixel art de `references/source-assets/snake-assets/`, 3 vidas, y puntuación, vidas, nivel y fin de partida enviados al HUD y al leaderboard de Supabase.

## Scope

**Incluye:**

- Catálogo: se reutiliza la fila existente `serpentina` de `public.games`. El `id`, el título SERPENTINA, la categoría `ARCADE`, el acento `green`, la portada `cover-snake` y el `sort_order = 4` no cambian.
  - Migración `supabase/migrations/<timestamp>_serpentina_engine.sql` con un `update` de `short_description` y `long_description`, que pasan a hablar de frutas, 3 vidas y niveles en lugar de "núcleos magenta".
- Portada: `cover-snake` en `app/globals.css` se mantiene sin cambios.
- Motor original en `lib/games/serpentina/` con `createSerpentinaGame(canvas, callbacks)`:
  - Rejilla de 40×30 celdas de 20 px sobre el canvas lógico de 800×600.
  - Movimiento por pasos discretos: 8 pasos/s en el nivel 1, +1 paso/s por nivel y tope de 20 pasos/s.
  - La serpiente empieza en el centro con 3 segmentos y mirando a la derecha.
  - Una sola fruta a la vez, en una celda libre aleatoria y sin caducidad. Cada fruta comida alarga la serpiente 1 segmento y suma 10 × nivel puntos.
  - El nivel sube cada 5 frutas.
  - Chocar con la pared o con el propio cuerpo cuesta una vida: fase `dead` de 1 s con parpadeo magenta. Después la serpiente reaparece en el centro con 3 segmentos, la fruta se reubica y se espera a una dirección. Puntuación y nivel se conservan.
  - 3 vidas. La partida termina al perder la última o cuando no queda celda libre para la fruta (tablero lleno).
  - Sin estado global ni listeners sueltos. API `start`, `pause`, `resume`, `restart`, `end`, `setInputEnabled` y `destroy`.
  - Callbacks `onScore`, `onLives`, `onLevel`, `onPauseChange` y `onGameOver`, solo cuando cambia el valor.
- Pantalla de inicio en el canvas, "PULSA ESPACIO PARA EMPEZAR", con la serpiente y la primera fruta dibujadas. La partida no arranca hasta pulsar Espacio y hasta que `fruits.png` haya cargado.
- Controles:
  - Flechas y WASD cambian la dirección. Se ignora el giro de 180°.
  - Como máximo un giro por paso, con un búfer de 1 giro para no perder pulsaciones rápidas.
  - `P` o `Esc` alternan la pausa.
  - `preventDefault` en las flechas y en Espacio.
  - El motor ignora el teclado mientras el modal está abierto.
- Pausa automática al ocultarse la pestaña (`visibilitychange`).
- Gráficos:
  - Fondo `#0a0a0f` con una rejilla tenue.
  - Cabeza verde neón `#00ff88` con brillo, y cuerpo en degradado de verde a cyan.
  - Frutas con la fila pixel art de `fruits.png`, copiada a `public/games/serpentina/fruits.png`. Cada fruta nueva es una de las 22 al azar, escalada a la celda manteniendo la proporción.
  - Diseño visual con `/frontend-design`.
- Registro `serpentina: { factory: createSerpentinaGame }` en `GAME_ENGINES` (`hasLives` por defecto, `true`: el HUD muestra "Vidas").
- Leaderboard: las puntuaciones guardadas desde el modal aparecen en `/leaderboard?game=serpentina` y en el top de `/games/serpentina`, sin cambios en `scores`, `game_stats` ni `leaderboard`.

**Fuera de alcance (para futuros specs):**

- Controles táctiles y juego en móvil.
- Sonido y música.
- Frutas con valor distinto según el tipo, frutas que caducan, power-ups u obstáculos.
- Modo con envolvimiento en los bordes.
- Rediseñar la portada `cover-snake`.
- Usar las filas de dibujo plano o realista de `fruits.png`.
- Actualizar `.claude/skills/add-game/platform-contract.md` al contrato de la SPEC 07.
- Antitrampas y validación de puntuación en el servidor.
- Implementar otros juegos del catálogo.
- Tests automatizados (no hay script de test configurado).

## Data model

### Catálogo (`update` de textos)

La fila `serpentina` se reutiliza. Solo cambian las descripciones, sin tocar el esquema, así que `npm run db:types` no se ejecuta.

```sql
-- supabase/migrations/<timestamp>_serpentina_engine.sql
-- Fila actual: id = 'serpentina', title = 'SERPENTINA', category = 'ARCADE', cover = 'cover-snake',
-- accent_color = 'green', sort_order = 4   (0 puntuaciones guardadas al redactar esta spec)
update public.games
set short_description = 'Come frutas, crece y no muerdas tu cola.',
    long_description  = 'Una serpiente de luz recorre una grilla de neón devorando frutas pixeladas. Cada bocado la alarga y suma puntos, y cada cinco frutas sube el nivel y la serpiente acelera. Tienes 3 vidas: chocar con una pared o con tu propia cola te cuesta una. ¿Hasta dónde llegará tu racha?'
where id = 'serpentina';
```

### Contrato (sin cambios)

`GameCallbacks`, `GameInstance`, `GameFactory`, `GameEngine`, `GameCanvas` y `GamePlayer` no cambian. Solo se añade una entrada al registro:

```ts
// lib/games/registry.ts
export const GAME_ENGINES: Partial<Record<string, GameEngine>> = {
  asteroids: { factory: createAsteroidsGame },
  "bloque-buster": { factory: createBloqueBusterGame },
  caida: { factory: createCaidaGame, hasLives: false },
  serpentina: { factory: createSerpentinaGame }, // hasLives por defecto: el HUD muestra "Vidas"
};
```

### Estado interno del motor (privado de `lib/games/serpentina/engine.ts`)

```ts
type Phase = "ready" | "playing" | "dead" | "waiting" | "gameover";
// "ready": "PULSA ESPACIO PARA EMPEZAR" con la serpiente inicial y la primera fruta. Espacio solo arranca si la imagen cargó (o falló)
// "playing": la serpiente avanza un paso cada 1 / stepsPerSecond s (la pausa es un flag aparte)
// "dead": 1 s de parpadeo magenta tras un choque; la vida ya se restó
// "waiting": serpiente reaparecida en el centro; espera una flecha o WASD para volver a "playing"
// "gameover": sin vidas, tablero lleno o llamada a end(). Ya se llamó a onGameOver

type Direction = "up" | "down" | "left" | "right";
type Cell = { col: number; row: number }; // 0 ≤ col < 40, 0 ≤ row < 30

type EngineState = {
  phase: Phase; // "ready"
  paused: boolean; // false
  inputEnabled: boolean; // true
  imageReady: boolean; // false; true con load o con error de fruits.png
  snake: Cell[]; // cabeza primero: [(20,15), (19,15), (18,15)]
  direction: Direction; // "right"
  queuedDirection: Direction | null; // búfer de 1 giro; null
  fruit: { cell: Cell; sprite: number }; // celda libre aleatoria; sprite = índice en FRUIT_SPRITES
  stepTimer: number; // segundos acumulados hacia el siguiente paso; 0
  deadTimer: number; // segundos restantes de la fase "dead"; 0
  fruitsEaten: number; // 0; no se reinicia al perder una vida
  score: number; // 0
  lives: number; // 3
  level: number; // 1 = floor(fruitsEaten / 5) + 1
};
```

### Reglas derivadas

- Velocidad: `stepsPerSecond = min(BASE_STEPS_PER_SECOND + (level − 1), MAX_STEPS_PER_SECOND)` = `min(8 + (level − 1), 20)`.
- Al comer: `score = min(score + POINTS_PER_FRUIT × level, MAX_SCORE)`, con el nivel previo al bocado. Después `fruitsEaten += 1`, se recalcula `level` y la cola no se recorta en ese paso.
- Giro: una dirección opuesta a `direction` se ignora. Si ya hubo un giro en este paso, el nuevo va a `queuedDirection` (se descarta si ya había uno), y se aplica en el paso siguiente.
- Choque: la cabeza sale de la rejilla o entra en una celda del cuerpo. La cola que se va a recortar en ese mismo paso no cuenta como cuerpo.
- Reaparición: tras `DEAD_DURATION`, la serpiente vuelve a la posición inicial, `direction = "right"`, la fruta se reubica en una celda libre y la fase pasa a `"waiting"`. Una flecha o WASD que no sea `left` fija la dirección y pasa a `"playing"`.
- Tablero lleno: si al colocar la fruta no queda ninguna celda libre, fase `"gameover"` y `onGameOver(score)`.

### Archivos del motor

- `lib/games/serpentina/constants.ts`:
  - Medidas: `W = 800`, `H = 600`, `CELL = 20`, `COLS = 40`, `ROWS = 30`, `INITIAL_LENGTH = 3`.
  - Reglas: `INITIAL_LIVES = 3`, `POINTS_PER_FRUIT = 10`, `FRUITS_PER_LEVEL = 5`, `BASE_STEPS_PER_SECOND = 8`, `MAX_STEPS_PER_SECOND = 20`, `DEAD_DURATION = 1`, `MAX_SCORE = 10_000_000`, `MAX_DT = 0.05`.
  - Asset: `FRUITS_SRC = "/games/serpentina/fruits.png"`.
  - `FRUIT_SPRITES: readonly { name: string; x: number; y: number; w: number; h: number }[]`: los 22 recortes de `sprites.js` (`y = 136`, `h = 160`), en el mismo orden de `x`, con los nombres corregidos según la imagen: apple, banana, pineapple, grape, pumpkin, turnip, eggplant, strawberry, cherry, carrot, mushroom, broccoli, watermelon, pepper, kiwi, lemon, orange, peach, peanut, raspberry, tomato, salad.
  - Paleta `COLORS`: `background` `#0a0a0f`, `grid` `rgba(138,143,181,0.08)`, `head` `#00ff88`, `bodyFrom` `#00ff88`, `bodyTo` `#00f5ff`, `dead` `#ff006e`, `fruitFallback` `#ff006e`, `text` `#e6e9ff` y `textDim` `#8a8fb5`.
- `lib/games/serpentina/entities.ts`: funciones puras que reciben el estado o el `ctx` como parámetros:
  - `initialSnake()`, `isOpposite(a, b)`, `nextHead(head, direction)`, `hitsWallOrBody(head, snake, willGrow)` y `spawnFruit(snake, random)` (devuelve `null` si no hay celda libre).
  - `drawGrid(ctx)`, `drawSnake(ctx, snake, color)` y `drawFruit(ctx, image, fruit)`. Si la imagen no está lista o falló, `drawFruit` dibuja un núcleo circular `fruitFallback`.
- `lib/games/serpentina/engine.ts`:
  - `createSerpentinaGame: GameFactory`.
  - Carga de `fruits.png` con `new Image()`, con los handlers `load`/`error` quitados en `destroy()`.
  - Loop con `requestAnimationFrame`, acumulador de pasos, entrada de teclado y fases.
  - Reglas de puntuación, vidas, nivel y fin de partida. Dibujo y pantalla de inicio.
  - `sync()` para disparar los callbacks.

### Assets

- `public/games/serpentina/fruits.png`, copiado sin cambios de `references/source-assets/snake-assets/fruits.png`.
- `sprites.js` **no** se copia: su contenido pasa a `FRUIT_SPRITES` con tipos y nombres corregidos.
- Cada fruta se dibuja escalada a la celda de 20 px manteniendo su proporción (alto 20 px y ancho proporcional ≤ 20 px, centrada), con `imageSmoothingEnabled = false` para conservar el pixel art.

### Puntuación y tope

| Nivel | Frutas comidas (acumuladas) | Puntos por fruta | Pasos/s        |
| ----- | --------------------------- | ---------------- | -------------- |
| 1     | 0–4                         | 10               | 8              |
| 2     | 5–9                         | 20               | 9              |
| 5     | 20–24                       | 50               | 12             |
| 13    | 60–64                       | 130              | 20             |
| n     | 5(n−1)–5n−1                 | 10 × n           | min(7 + n, 20) |

El máximo teórico, sumando 3 vidas que llenan el tablero, ronda 12,9 M y supera el `check` `score between 0 and 10000000`. Por eso el motor limita la puntuación a `MAX_SCORE = 10_000_000`.

### Convenciones

- Coordenadas de rejilla en celdas (`col`, `row`) con origen arriba a la izquierda. Se convierten a píxeles con `CELL` solo al dibujar, en el espacio lógico de 800×600.
- `dt` en segundos con tope de 0,05 s. El movimiento avanza por pasos discretos acumulando `dt`.
- Callbacks solo cuando el valor cambia, vía `sync()` y la caché `reported`.
- La paleta sale de `constants.ts`, nunca de variables CSS.
- El aleatorio (`Math.random`) solo decide la celda y el sprite de la fruta.
- El juego no crea datos persistentes. El guardado es el de `GamePlayer` (`insertScore`).

## Implementation plan

1. **Catálogo.** Crear la migración con `npx supabase migration new serpentina_engine`, con el `update` de `short_description` y `long_description` del Data model. Aplicarla con `npm run db:push`. No se ejecuta `npm run db:types` (no cambia el esquema).
   - Prueba manual: `/games` y Home muestran SERPENTINA en la posición 4 con `cover-snake` y la nueva descripción corta. `/games/serpentina` muestra la descripción larga. `/games/serpentina/play` sigue con la simulación.
2. **Asset y constantes.** Antes de nada, consultar en `node_modules/next/dist/docs/01-app/` cómo sirve Next 16 la carpeta `public/`.
   - Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/serpentina/fruits.png`.
   - Crear `lib/games/serpentina/constants.ts` con medidas, reglas, `FRUITS_SRC`, `FRUIT_SPRITES` y `COLORS`.
   - Comprobar sobre la imagen que cada recorte de `FRUIT_SPRITES` contiene una fruta completa de la fila pixel art y que su nombre coincide con lo que se ve.
   - Prueba manual: `http://localhost:3000/games/serpentina/fruits.png` se ve en el navegador. Compila sin usarse.
3. **Entidades.** Crear `lib/games/serpentina/entities.ts` con `initialSnake`, `isOpposite`, `nextHead`, `hitsWallOrBody`, `spawnFruit`, `drawGrid`, `drawSnake` y `drawFruit` (con el núcleo de respaldo).
   - El `ctx`, el estado y la imagen llegan como parámetros, sin globales.
   - Compila sin usarse.
4. **Núcleo del motor.** Crear `lib/games/serpentina/engine.ts` con `createSerpentinaGame(canvas, callbacks)`:
   - `EngineState` y fases `ready → playing ⇄ dead → waiting → playing → gameover`, con `paused` como flag.
   - Carga de `fruits.png`: `load` y `error` ponen `imageReady = true`.
   - Loop con `requestAnimationFrame`, `dt` con tope de `MAX_DT` y acumulador `stepTimer` según `stepsPerSecond`.
   - En cada paso:
     - Aplicar el giro pendiente.
     - Calcular la nueva cabeza y comprobar el choque.
     - Comer o recortar la cola.
     - Puntuación con `MAX_SCORE`, `fruitsEaten`, `level` y nueva fruta, o `gameover` si el tablero está lleno.
   - Choque: restar una vida y pasar a `dead`, o a `gameover` si no quedan vidas. Tras `DEAD_DURATION`, reaparición y fase `waiting`.
   - Al entrar en `gameover` se llama a `onGameOver(score)`.
   - `sync()` con la caché `reported` para `onScore`, `onLives`, `onLevel` y `onPauseChange`, y comprobación de `destroyed` tras `sync()`.
   - Sin registrar todavía. Compila sin usarse.
5. **Dibujo.** Diseñar con `/frontend-design` el aspecto en el canvas:
   - Rejilla tenue, cabeza con brillo, degradado del cuerpo de verde a cyan, parpadeo magenta en `dead` y frutas pixel art.
   - Pantalla `ready` con "PULSA ESPACIO PARA EMPEZAR" sobre la serpiente inicial y la fruta, e indicación de dirección en `waiting`.
   - Implementarlo en `engine.ts` con las funciones de `entities.ts`. Fuente `--font-press-start-2p` con fallback `monospace`.
   - Sin puntuación, vidas, nivel ni overlays de pausa o fin de partida.
6. **Entrada y ciclo de vida.** En `engine.ts`:
   - `keydown` en `window` con un handler con nombre. Si `inputEnabled` es `false`, sale antes del `preventDefault`.
   - `preventDefault` en las flechas y en Espacio. `P`/`Esc` alternan la pausa en `playing`, `dead` y `waiting`.
   - En `ready`, Espacio arranca la partida si `imageReady`.
   - Flechas y WASD: en `playing` aplican las reglas de giro y búfer; en `waiting` fijan la dirección (salvo `left`) y pasan a `playing`. Se ignoran en pausa.
   - `visibilitychange` pausa el juego.
   - El resto de la API:
     - `pause` y `resume`, que reinicia `lastTime`.
     - `restart`: serpiente inicial, score 0, 3 vidas, nivel 1, `fruitsEaten = 0` y fase `ready`.
     - `end` y `setInputEnabled`.
     - `destroy`, que cancela el `requestAnimationFrame`, quita `keydown` y `visibilitychange`, y quita los handlers `load`/`error` de la imagen.
7. **Registro e integración.** Añadir `serpentina: { factory: createSerpentinaGame }` a `GAME_ENGINES`.
   - Prueba manual: `/games/serpentina/play` muestra el motor real con "Vidas" en el HUD.
   - Jugar una partida: ver Puntuación, Vidas y Nivel actualizados, perder las 3 vidas, ver el modal y guardar.
8. **Leaderboard.** Guardar una puntuación de SERPENTINA y verla en `/leaderboard?game=serpentina` y en el top de `/games/serpentina`. Si los pasos anteriores son correctos, no requiere cambios de código.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

**Catálogo**

- [ ] `public.games` mantiene la fila `serpentina` con el mismo `id`, `title = 'SERPENTINA'`, `category = 'ARCADE'`, `cover = 'cover-snake'`, `accent_color = 'green'` y `sort_order = 4`, y con `short_description` y `long_description` iguales a las del Data model.
- [ ] Existe la migración `supabase/migrations/*_serpentina_engine.sql`, y `npx supabase migration list` la muestra aplicada en el remoto. Solo contiene el `update` de las descripciones.
- [ ] `lib/supabase/database.types.ts` no cambia.
- [ ] `/games` y Home muestran SERPENTINA con la portada `cover-snake` (igual que antes) y la nueva descripción corta.
- [ ] `/games/serpentina` muestra la nueva descripción larga, y **JUGAR AHORA** lleva a `/games/serpentina/play`.

**Motor**

- [ ] Al entrar en `/games/serpentina/play`, el canvas muestra "PULSA ESPACIO PARA EMPEZAR" con la serpiente de 3 segmentos en el centro y una fruta. Nada se mueve hasta pulsar Espacio.
- [ ] Tras pulsar Espacio, la serpiente avanza hacia la derecha celda a celda, a 8 pasos/s en el nivel 1.
- [ ] Las flechas y WASD cambian la dirección. Pulsar la dirección opuesta no hace nada.
- [ ] Dos giros rápidos dentro del mismo paso (por ejemplo, ↑ y luego ← yendo a la derecha) se aplican en dos pasos consecutivos, sin que la serpiente se muerda.
- [ ] Comer una fruta alarga la serpiente 1 segmento, suma exactamente 10 × nivel puntos y hace aparecer otra fruta en una celda libre.
- [ ] Las frutas son sprites pixel art de `fruits.png`, varían entre apariciones, caben en una celda y se ven nítidas (sin suavizado).
- [ ] La fruta nunca aparece sobre la serpiente.
- [ ] Tras 5 frutas, el Nivel del HUD pasa a 02 y la serpiente va visiblemente más rápida. La velocidad deja de subir a partir del nivel 13.
- [ ] Chocar con una pared o con el propio cuerpo resta una vida. La serpiente parpadea en magenta durante 1 s y reaparece en el centro con 3 segmentos, mirando a la derecha y quieta.
- [ ] Tras reaparecer, la serpiente no se mueve hasta pulsar una flecha o WASD. Puntuación y nivel se conservan.
- [ ] Avanzar hacia la celda que la cola deja libre en ese mismo paso no cuenta como choque.
- [ ] La partida termina al perder la tercera vida.
- [ ] Si `fruits.png` no carga (por ejemplo, renombrado el archivo), el juego sigue siendo jugable con un núcleo magenta como fruta.
- [ ] Mientras el canvas está montado, ni las flechas ni Espacio hacen scroll de la página.
- [ ] El canvas no dibuja puntuación, vidas, nivel ni ningún overlay de "GAME OVER" o "PAUSA".
- [ ] `lib/games/serpentina/` no usa `localStorage`, no lee variables CSS de color y no tiene estado mutable a nivel de módulo.
- [ ] La suma de puntos usa `Math.min(…, MAX_SCORE)` con `MAX_SCORE = 10_000_000`.

**Integración con la plataforma**

- [ ] Puntuación, Vidas y Nivel del HUD coinciden en todo momento con el estado del motor, y "Vidas" empieza en ♥ ♥ ♥.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final del motor.
- [ ] Con el modal abierto, escribir las iniciales (incluidos Espacio, W, A, S y D) no afecta al juego, y el input recibe esas letras.
- [ ] **PAUSA** congela la serpiente, y **REANUDAR** continúa desde el mismo estado. `P` y `Esc` alternan la pausa y la etiqueta del botón cambia.
- [ ] Con el juego en pausa, las flechas y WASD no cambian la dirección.
- [ ] Cambiar de pestaña y volver deja el juego en pausa, con el botón en **REANUDAR**.
- [ ] Al reanudar tras una pausa larga, la serpiente no avanza varias celdas de golpe.
- [ ] **FIN** abre el modal con la puntuación actual.
- [ ] **JUGAR DE NUEVO** vuelve a la pantalla de inicio con la serpiente inicial, Puntuación 0, Vidas ♥ ♥ ♥ y Nivel 01.
- [ ] Tras **SALIR** y volver a entrar, solo corre un loop: la serpiente va a la velocidad normal.
- [ ] En un viewport de 480 px de ancho, el canvas se escala manteniendo la proporción 4:3, sin overflow horizontal.

**Leaderboard**

- [ ] **GUARDAR PUNTUACIÓN** inserta una fila en `scores` con `game_id = 'serpentina'`, el nombre normalizado y la puntuación final.
- [ ] La puntuación aparece en `/leaderboard?game=serpentina` y en el top de `/games/serpentina`.
- [ ] Recargar `/games` refleja el nuevo `playCount` de SERPENTINA y, si la supera, el nuevo `bestScore`.
- [ ] Con sesión iniciada, la fila "TU MEJOR MARCA" de `/leaderboard?game=serpentina` muestra la marca del jugador.

**No regresiones**

- [ ] ASTEROIDS y BLOQUE BUSTER (motor, HUD con Vidas, pausa, modal y guardado) funcionan igual que antes.
- [ ] CAÍDA (motor, HUD sin Vidas, pausa, modal y guardado) funciona igual que antes.
- [ ] Los juegos sin motor siguen con la simulación.
- [ ] `/leaderboard` sin parámetros sigue abriendo la pestaña ASTEROIDS.
- [ ] `next dev` no muestra errores en consola en `/`, `/games`, `/games/serpentina`, `/games/serpentina/play` ni `/leaderboard?game=serpentina`.
- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores en los archivos nuevos o modificados.

## Decisions

- **Sí:** dar motor al juego existente `serpentina`. Es el mismo juego (ARCADE, `cover-snake`, acento `green`): conserva su `id`, su URL y su posición 4 en Home, y en Supabase tenía 0 puntuaciones, así que no hereda datos de la simulación. Lo eligió el usuario.
- **No:** crear una entrada nueva (por ejemplo `snake`). Habría dos snakes en el catálogo y SERPENTINA seguiría siendo una simulación.
- **Sí:** juego original (no es un port). `references/source-assets/snake-assets/` solo trae assets, sin código, así que la mecánica se definió en esta spec.
- **Sí:** motor TypeScript bajo `GameFactory` en `lib/games/serpentina/`. Es el patrón de las SPEC 05, 07 y 08, y lo único que lleva la puntuación al HUD y al leaderboard.
- **No:** `<iframe>` con un juego independiente. Ya se descartó en la SPEC 05: aísla el juego y obliga a usar `postMessage`.
- **Sí:** rejilla de 40×30 celdas de 20 px en el canvas de 800×600. Encaja exacta en el contrato actual, sin cambiar `GameCanvas` ni el `aspect-ratio`.
- **No:** celdas de 25 px (32×24) ni de 40 px (20×15). Tablero más pequeño, con menos recorrido para crecer.
- **Sí:** chocar con la pared cuesta una vida, como en el Snake clásico.
- **No:** envolvimiento en los bordes. Otra variante, fuera de alcance.
- **Sí:** 3 vidas. Al morir, fase `dead` de 1 s con parpadeo magenta y reaparición en el centro con 3 segmentos. Puntuación, nivel y `fruitsEaten` se conservan, y la serpiente espera a una dirección. Da tiempo a reaccionar y deja claro que se perdió una vida.
- **No:** reaparecer conservando la longitud (con una serpiente larga en el centro se volvería a chocar enseguida), ni reaparecer al instante sin espera.
- **Sí:** +10 × nivel por fruta, subida de nivel cada 5 frutas y velocidad de `min(8 + (nivel − 1), 20)` pasos/s. Refleja "cada bocado la hace más veloz" y da sentido al Nivel del HUD.
- **No:** puntos fijos sin niveles (el Nivel quedaría fijo en 01), ni puntos distintos por tipo de fruta (otra spec).
- **Sí:** tope `MAX_SCORE = 10_000_000` en el motor. Al reaparecer con 3 segmentos se pueden comer unas 3 × 1.197 frutas, y el máximo teórico (~12,9 M) supera el `check` de `scores.score`. El tope no cambia la mecánica en partidas reales.
- **No:** limitar el multiplicador al nivel 13. Cambiaría el balance.
- **Sí:** el tablero lleno (sin celda libre para la fruta) termina la partida con `onGameOver(score)`, igual que la victoria de BLOQUE BUSTER, sin overlay propio.
- **Sí:** una fruta a la vez, en una celda libre aleatoria y sin caducidad.
- **No:** frutas que caducan. Añade presión de tiempo fuera de lo pedido.
- **Sí:** usar la fila pixel art de `fruits.png`, copiada a `public/games/serpentina/`, con una fruta aleatoria entre 22 en cada aparición y sin suavizado. Es el asset que aportó el usuario y encaja con la estética retro.
- **No:** las filas de dibujo plano o realista, ni dibujar la fruta con primitivas como modo normal.
- **Sí:** núcleo magenta de respaldo si la imagen falla. El juego no queda bloqueado en `ready` por un 404.
- **Sí:** pasar `sprites.js` a `FRUIT_SPRITES` en `constants.ts`, con tipos y **nombres corregidos**. Las coordenadas del atlas caen sobre las frutas, pero los nombres están desplazados (`banana` en x=34 es la manzana). `window.SPRITE_ATLAS` es un global y no encaja con el contrato.
- **Sí:** migración `update` de `short_description` y `long_description`. La descripción anterior hablaba de "núcleos magenta" y no mencionaba vidas ni niveles.
- **No:** rediseñar la portada `cover-snake`. Ya representa una serpiente verde con un bocado.
- **Sí:** flechas y WASD, Espacio para empezar, giro de 180° ignorado, un giro por paso y búfer de 1 giro. Evita muertes por pulsaciones rápidas sin cambiar la mecánica.
- **No:** solo flechas, ni empezar con una flecha en vez de Espacio (se pierde la coherencia con los demás juegos).
- **Sí:** con `setInputEnabled(false)`, el handler sale antes del `preventDefault`, así que W, A, S, D y Espacio se escriben en el input de iniciales.
- **Sí:** paleta neón: cabeza `#00ff88` con brillo, cuerpo en degradado de verde a cyan, rejilla tenue sobre `#0a0a0f` y magenta para la muerte. Coherente con el acento `green` del catálogo.
- **Sí:** sonido fuera de alcance. La carpeta de assets no trae sonidos.
- **No:** reutilizar los MP3 de `bloque-buster`. No están pensados para este juego.
- **Sí:** sin cambios de contrato. `hasLives` vale `true` por defecto, así que el HUD muestra "Vidas" sin tocar `GamePlayer` ni `GameCanvas`.
- **Sí:** el leaderboard no se reimplementa, y no se tocan `scores`, `game_stats` ni `leaderboard`. Las vistas ya funcionan por `game_id`.
- **Sí:** `sort_order = 4` sin cambios. SERPENTINA sigue en el top 6 de Home, y la pestaña inicial de `/leaderboard` sigue siendo ASTEROIDS.
- **Sí:** identificadores de código en inglés y textos visibles en español, mismo criterio que las specs 01 a 08.
- **Nota:** `.claude/skills/add-game/platform-contract.md` aún describe el registro anterior a la SPEC 07 (sin `GameEngine`). Esta spec se basa en el código actual.

## Risks

| Riesgo                                                                                                               | Mitigación                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta dos veces `GameCanvas` y quedan dos loops o listeners duplicados (serpiente al doble de velocidad). | `destroy()` cancela el `requestAnimationFrame` y quita `keydown`, `visibilitychange` y los handlers de la imagen. Hay un criterio de salir y volver a entrar. |
| La clave `serpentina` de `GAME_ENGINES` no coincide con `games.id` y el juego cae en la simulación.                  | Copiar el `id` de la migración semilla. Hay un criterio de jugar en `/games/serpentina/play` con el motor real.                                               |
| Tras una pausa o un cambio de pestaña, el acumulador de pasos dispara varios pasos de golpe.                         | Tope `MAX_DT = 0.05` (como mucho 1 paso por frame a 20 pasos/s) y reinicio de `lastTime` al reanudar. Hay un criterio específico.                             |
| Dos teclas rápidas en el mismo paso producen un giro de 180° efectivo y la serpiente se muerde.                      | Un giro por paso, comparado con la dirección del último paso aplicado, más un búfer de 1 giro. Hay un criterio específico.                                    |
| Falsa colisión con la cola que se mueve en ese mismo paso.                                                           | `hitsWallOrBody` excluye la última celda cuando la serpiente no crece en ese paso. Hay un criterio específico.                                                |
| Los recortes de `FRUIT_SPRITES` cortan frutas o los nombres siguen mal.                                              | Verificación visual sobre `fruits.png` en el paso 2. Los nombres solo son informativos y no afectan a la mecánica.                                            |
| `fruits.png` da 404 o tarda en cargar y el juego queda bloqueado en `ready`.                                         | `error` también pone `imageReady = true` y se dibuja el núcleo magenta de respaldo. Hay un criterio con el archivo renombrado.                                |
| Las frutas se ven borrosas al reducir recortes de ~160 px a 20 px.                                                   | `imageSmoothingEnabled = false` y escalado proporcional centrado en la celda.                                                                                 |
| `spawnFruit` entra en un bucle infinito buscando celda libre con la serpiente muy larga.                             | Elegir al azar entre la lista de celdas libres, y devolver `null` (tablero lleno → `gameover`) si está vacía.                                                 |
| La puntuación supera el `check` de `scores.score` y el guardado falla.                                               | `Math.min(…, MAX_SCORE)` en el motor. Hay un criterio específico.                                                                                             |
| W, A, S, D o Espacio mueven la serpiente mientras se escriben las iniciales.                                         | `setInputEnabled(false)` hace salir al handler antes del `preventDefault`. Hay un criterio específico.                                                        |
| Callbacks con `setState` en cada frame provocan re-renders del HUD a 60 fps.                                         | `sync()` solo dispara cuando cambia el valor.                                                                                                                 |
| Las fuentes no están cargadas al dibujar la pantalla de inicio.                                                      | Fallback a `monospace`. El texto se redibuja en cada frame.                                                                                                   |
| Las APIs de Next 16 o React 19 difieren de lo recordado.                                                             | Consultar `node_modules/next/dist/docs/01-app/` en el paso 2, antes de tocar `public/` o el registro.                                                         |

## What is **not** in this spec

- Controles táctiles y juego en móvil.
- Sonido y música.
- Frutas con valor distinto según el tipo, frutas que caducan, power-ups u obstáculos.
- Modo con envolvimiento en los bordes.
- Rediseñar la portada `cover-snake`.
- Usar las filas de dibujo plano o realista de `fruits.png`.
- Actualizar `.claude/skills/add-game/platform-contract.md` al contrato de la SPEC 07.
- Antitrampas y validación de puntuación en el servidor.
- Implementación de los demás juegos del catálogo.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

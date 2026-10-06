# Contrato de integración de juegos en Arcade Vault

Este documento resume lo que ya existe tras la SPEC 05 y la SPEC 06. **Verifica cada punto contra el código al invocar el skill**: si el código difiere, manda el código.

## Qué hace falta para que un juego sea jugable y tenga leaderboard

| #   | Pieza    | Dónde                                                          | Notas                                                                                      |
| --- | -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Motor    | `lib/games/<id>/` (`constants.ts`, `entities.ts`, `engine.ts`) | Exporta `create<Name>Game: GameFactory`.                                                   |
| 2   | Registro | `lib/games/registry.ts` → `GAME_ENGINES`                       | La clave debe ser **exactamente** `games.id`. Sin entrada, `GamePlayer` usa la simulación. |
| 3   | Catálogo | Migración nueva en `supabase/migrations/`                      | `insert` (juego nuevo) o `update` (placeholder existente) en `public.games`.               |
| 4   | Portada  | `.cover-<id>` en `app/globals.css`, junto a las demás          | Diseñada con `/frontend-design`.                                                           |
| 5   | Nada más | `GamePlayer`, `GameCanvas`, `lib/data/*`, vistas               | El HUD, el modal, el guardado y el ranking funcionan por `game.id`.                        |

## 1. Contrato del motor — `lib/games/types.ts`

```ts
type GameCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onPauseChange: (paused: boolean) => void; // también con P/Esc y visibilitychange
  onGameOver: (finalScore: number) => void;
};

type GameInstance = {
  start;
  pause;
  resume;
  restart; // score 0, 3 vidas, nivel 1, vuelve a la pantalla de inicio
  end; // fuerza fin de partida y dispara onGameOver con el score actual
  setInputEnabled; // false mientras el modal está abierto
  destroy; // cancela requestAnimationFrame y quita todos los listeners
};

type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameInstance;
```

### Patrones obligatorios (ver `lib/games/asteroids/engine.ts`)

- Todo el estado vive en la instancia creada por la factory. Nada de globales de módulo mutables ni listeners sueltos.
- Fases explícitas, como `"ready" | "playing" | "dead" | "gameover"`. La fase `ready` es la pantalla de inicio en el canvas ("PULSA ESPACIO PARA EMPEZAR" o el equivalente del juego). La partida no arranca sola.
- Los callbacks se disparan **solo cuando el valor cambia**, mediante una función `sync()` que compara contra una caché `reported`. Nunca un `setState` por frame.
- `dt` en segundos con tope `MAX_DT = 0.05`. Al reanudar se reinicia `lastTime`.
- Después de `sync()` el loop comprueba `destroyed`, porque un callback puede destruir la instancia a mitad de frame.
- Teclado en `window` con `preventDefault` en las teclas del juego (flechas, Espacio). `P` y `Esc` alternan la pausa. Con `setInputEnabled(false)` el handler sale antes de hacer `preventDefault`, para que el input de iniciales del modal funcione.
- `visibilitychange` pausa el juego y dispara `onPauseChange(true)`.
- `destroy()` cancela el `requestAnimationFrame` y quita **cada** listener registrado. Cubre el doble montaje de StrictMode.
- Fuente del canvas: CSS variable `--font-press-start-2p`, con fallback `monospace`.
- En el canvas **no** se dibuja score, vidas, nivel ni overlay "GAME OVER": eso lo muestra la plataforma. Solo se dibujan indicadores propios de la mecánica (por ejemplo, el `3x` del power-up de ASTEROIDS).
- Resolución lógica fija; el CSS escala el canvas.

### Paleta neón de referencia — `lib/games/asteroids/constants.ts` (`COLORS`)

`background #0a0a0f` · cyan `#00f5ff` · magenta `#ff006e` · amarillo `#f5ff00` · verde `#00ff88` · texto `#e6e9ff` · texto tenue `#8a8fb5`. La paleta va en constantes del motor, no se lee de CSS en tiempo de ejecución.

## 2. Montaje — `components/game-canvas.tsx` y `components/game-player.tsx`

- `GameCanvas` renderiza `<canvas className="game-canvas" width={800} height={600} />`, crea la instancia en un `useEffect` que depende solo de la factory, llama a `start()` y a `destroy()` en el cleanup. Los callbacks viven en refs.
- `.game-canvas` en `app/globals.css`: `width: 100%; height: auto; aspect-ratio: 4 / 3`.
- `GamePlayer` elige motor con `GAME_ENGINES[game.id]`. Sin motor, usa la simulación (intervalo de puntos y `.game-arena`).
- HUD React: Jugador, Puntuación, **Vidas** (`♥` repetido) y Nivel. Botones PAUSA/REANUDAR, FIN y SALIR.
- `onGameOver` abre el modal "FIN DEL JUEGO" y llama a `setInputEnabled(false)`. **GUARDAR PUNTUACIÓN** llama a `insertScore({ gameId, playerName: normalizePlayerName(name), score })` de `lib/data/scores-client.ts`. **JUGAR DE NUEVO** llama a `restart()` y `setInputEnabled(true)`.

## 3. Supabase

- `public.games`: `id text pk`, `title`, `short_description`, `long_description`, `category` (`check in ('ARCADE','PUZZLE','SHOOTER','VERSUS')`), `cover`, `accent_color` (`check in ('cyan','magenta','yellow','green')`), `sort_order int not null unique`, `created_at`.
- `public.scores`: `game_id` con FK a `games.id`, `player_name ~ '^[A-Z0-9_]{1,12}$'`, `score between 0 and 10000000`.
- Vistas `game_stats` (`best_score`, `play_count`) y `leaderboard` (mejor marca por jugador y juego, con `rank`), ambas `security_invoker = true`. **Funcionan para cualquier juego nuevo sin cambios.**
- RLS: lectura de `games` y `scores`, e insert en `scores` para `anon` y `authenticated`. Nadie escribe en `games` desde el cliente: el catálogo solo cambia con migraciones.
- Flujo de migración:
  1. `npx supabase migration new add_<id>_game` (o `<id>_engine` si se reutiliza un placeholder).
  2. `npm run db:push`.
  3. `npm run db:types` **solo** si cambia el esquema (un `insert` o `update` de datos no cambia los tipos). Si se ejecuta, se commitea `lib/supabase/database.types.ts` junto a la migración.
  4. Verificar con `mcp__supabase__get_advisors` (security) si la migración toca esquema.
- `sort_order` es `unique`: un juego nuevo usa el siguiente al máximo, o la migración desplaza filas explícitamente (por ejemplo, sumando un offset temporal para no violar la unicidad).

## 4. Catálogo y portadas

- Tipos en `data/games.ts`: `GameCategory`, `Game` (`accentColor: "cyan" | "magenta" | "yellow" | "green"`, `bestScore`, `playCount` numéricos) y `CATEGORY_FILTERS`.
- Las páginas leen el catálogo con `getGames()` y `getGame(id)` de `lib/data/games.ts`. Las páginas nunca llaman a Supabase directamente.
- Portadas: `<div className={`cover-bg ${game.cover}`} />` en `components/game-card.tsx`, `components/mini-game-card.tsx` y `app/games/[id]/page.tsx`. El patrón es un `background` con gradientes en `.cover-<id>` y capas opcionales `::before`/`::after` (por ejemplo, SVG inline en `data:`). Ver `.cover-asteroids`.
- `components/game-card.tsx` mapea `accentColor` a clase de botón con `ACCENT_BUTTON_CLASS`.

### Catálogo al escribir este skill (verificar contra migraciones)

| sort_order | id            | categoría | portada         | acento  | motor |
| ---------- | ------------- | --------- | --------------- | ------- | ----- |
| 1          | asteroids     | SHOOTER   | cover-asteroids | cyan    | sí    |
| 2          | bloque-buster | ARCADE    | cover-bricks    | cyan    | no    |
| 3          | caida         | PUZZLE    | cover-tetro     | magenta | no    |
| 4          | serpentina    | ARCADE    | cover-snake     | green   | no    |
| 5          | gloton        | ARCADE    | cover-glot      | yellow  | no    |
| 6          | invasores     | SHOOTER   | cover-invaders  | green   | no    |
| 7          | rocas         | SHOOTER   | cover-rocas     | yellow  | no    |
| 8          | ranaria       | ARCADE    | cover-rana      | green   | no    |
| 9          | duelo-pixel   | VERSUS    | cover-duelo     | cyan    | no    |

Posibles placeholders: Arkanoid/Breakout → `bloque-buster`, Tetris → `caida`, Snake → `serpentina`, Pac-Man → `gloton`, Space Invaders → `invasores`, Frogger → `ranaria`, Pong → `duelo-pixel`. `rocas` se mantuvo separado de `asteroids` por decisión de la SPEC 05.

## 5. Brechas conocidas del contrato

Si el juego cae en alguna, la spec debe tratarla en Scope, Data model, Plan y Decisions.

| Brecha                                   | Por qué choca                                                                                  | Opciones a ofrecer                                                                                                                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Juego sin vidas (Tetris)                 | `onLives` y el HUD "Vidas" asumen vidas; `restart()` documenta "3 vidas".                      | (a) Extender el contrato de forma retrocompatible: por ejemplo, metadatos del motor con `hasLives: false` y `GamePlayer` oculta "Vidas". (b) Reportar siempre 1 vida. Recomendado: (a).               |
| Canvas que no es 800×600 / 4:3           | `GameCanvas` fija `width={800} height={600}` y `.game-canvas` fija `aspect-ratio: 4 / 3`.      | (a) El registro pasa a `{ factory, width, height }` y `GameCanvas` y el CSS usan esas medidas. (b) Dibujar el juego centrado dentro de 800×600 (tablero + panel lateral). Recomendado según el juego. |
| Segundo canvas o panel (pieza siguiente) | Solo hay un canvas.                                                                            | Dibujarlo dentro del mismo canvas lógico. No añadir DOM propio del juego.                                                                                                                             |
| HUD u overlay en DOM o en el canvas      | La plataforma ya muestra HUD y modal.                                                          | Quitarlos y alimentar los callbacks. Mantener solo indicadores propios de la mecánica.                                                                                                                |
| Métricas extra (líneas, combo)           | El HUD solo tiene Puntuación, Vidas y Nivel.                                                   | (a) Dibujarlas en el canvas como indicador de mecánica. (b) Ampliar el HUD con un callback nuevo (cambio de contrato, decisión explícita).                                                            |
| Ratón o clic                             | El patrón actual solo usa teclado en `window`.                                                 | Listeners en el canvas, convertidos a coordenadas lógicas con `getBoundingClientRect`, quitados en `destroy()` y respetando `setInputEnabled`.                                                        |
| Assets (sprites, imágenes)               | Las referencias cargan rutas relativas.                                                        | Copiarlos a `public/games/<id>/` y cargarlos desde el motor. La pantalla `ready` espera a que carguen.                                                                                                |
| Sonido                                   | SPEC 05 dejó el sonido fuera de alcance.                                                       | (a) Fuera de alcance (recomendado si no es esencial). (b) Incluirlo con `public/games/<id>/sounds/`, sin autoplay antes de la primera interacción y silenciado al pausar.                             |
| Estado de victoria (último nivel)        | Solo existe `onGameOver`.                                                                      | Tratar la victoria como fin de partida con `onGameOver(finalScore)`, o hacer bucle de niveles. Es una decisión explícita.                                                                             |
| Reinicio, pausa o tema propios           | La plataforma controla reinicio y pausa. `localStorage` propio rompe la regla de no persistir. | Mapear a `restart()`, `pause()`/`resume()` y `onPauseChange`. Eliminar temas y `localStorage` del juego.                                                                                              |
| Categoría o acento nuevos                | `check` en `games` y uniones en TypeScript.                                                    | Migración con `alter table ... drop/add constraint`, más `GameCategory`, `CATEGORY_FILTERS`, `Game["accentColor"]` y `ACCENT_BUTTON_CLASS`. Recomendado: usar los existentes.                         |
| Puntuación fuera de rango                | `scores.score` admite 0–10.000.000.                                                            | Confirmar que el juego no supera el tope; si puede, decidir un tope en el motor.                                                                                                                      |
| Multijugador local (VERSUS)              | El guardado es de un solo `player_name` y una puntuación.                                      | Definir qué puntuación se guarda (por ejemplo, la del jugador 1 contra CPU). Multijugador real va en otra spec.                                                                                       |

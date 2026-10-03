# SPEC 06 — Catálogo de juegos y leaderboard en Supabase

> **Estado:** Implemented · **Depende de:** SPEC 01 (`01-mvp-visual-screens.md` — pantallas de catálogo, detalle, leaderboard y modal de fin de partida), SPEC 02 (`02-home-landing-and-nav.md` — Home con los 6 primeros juegos), SPEC 04 (`04-supabase-infrastructure.md` — clientes, migraciones y tipos), SPEC 05 (`05-asteroids-game.md` — modal "GUARDAR PUNTUACIÓN" con puntuación real) · **Fecha:** 2026-10-03
> **Objetivo:** Mover el catálogo de juegos y las puntuaciones a las tablas `games` y `scores` de Supabase, para que el catálogo, el detalle, el leaderboard y el guardado de puntuación usen datos reales en lugar de mocks y `localStorage`.

## Scope

**Incluye:**

- Migración `supabase/migrations/<timestamp>_games_and_scores.sql` con:
  - Tabla `public.games`, sembrada con los 9 juegos actuales de `data/games.ts` y el mismo orden (`sort_order`).
  - Tabla `public.scores` con `check` de nombre (`^[A-Z0-9_]{1,12}$`) y de rango de puntuación (0–10.000.000), y FK a `games`.
  - Vista `public.game_stats`, con la mejor puntuación y el número de puntuaciones guardadas por juego.
  - Vista `public.leaderboard`, con la mejor marca de cada jugador por juego y su rango. Los empates los gana el `created_at` más antiguo.
  - RLS: `anon` y `authenticated` pueden leer `games` y `scores`, e insertar en `scores`. Nadie puede hacer `update` ni `delete` desde el cliente, y nadie puede escribir en `games`.
- `lib/supabase/database.types.ts` regenerado con `npm run db:types`.
- Capa de acceso a datos en `lib/data/`:
  - Lectura de juegos con sus estadísticas, de un juego por `id`, del top N del leaderboard de un juego y de la mejor marca de un jugador en un juego.
  - Inserción de una puntuación.
- `data/games.ts` conserva solo los tipos (`Game`, `GameCategory`) y `CATEGORY_FILTERS`. El array `GAMES` se elimina.
- `bestScore` y `playCount` salen de `game_stats`:
  - `playCount` pasa a significar "puntuaciones guardadas".
  - Se formatea como hoy (`12.4K`) y muestra `NUEVO` cuando es 0.
- Páginas convertidas a Server Components con lectura dinámica en cada request:
  - `/` (Home): los 6 primeros juegos por `sort_order`.
  - `/games`: la búsqueda y los filtros pasan a un componente cliente que recibe los juegos por props.
  - `/games/[id]`: detalle con estadísticas reales y el top 10 real.
  - `/games/[id]/play`: lee el juego de Supabase.
  - `/leaderboard`: la pestaña activa vive en la URL (`/leaderboard?game=<id>`). Podio y top 12 reales, más la fila "TU MEJOR MARCA" en un componente cliente.
- Fila "TU MEJOR MARCA" en `/leaderboard`:
  - Se muestra si `session.name` tiene alguna puntuación en ese juego, con su rango real aunque esté fuera del top 12.
  - Si no la tiene, no se muestra.
- Modal "GUARDAR PUNTUACIÓN" de `GamePlayer`:
  - Inserta en `scores` con el cliente de navegador, con el nombre normalizado a mayúsculas.
  - Muestra los estados guardando, guardado y error con opción de reintentar.
- Estados vacíos y de error:
  - Leaderboard o top del detalle sin puntuaciones: estado vacío "SÉ EL PRIMERO".
  - Fallo de lectura de Supabase: estado de error retro "SEÑAL PERDIDA", sin excepción no manejada.
- Se eliminan `lib/saved-scores.ts`, `data/leaderboard.ts` (`generateMockScores`) y los `bestScore`/`playCount` hardcodeados.

**Fuera de alcance (para futuros specs):**

- Autenticación real con Supabase Auth y la asociación de puntuaciones a usuarios. Hasta entonces, "TU MEJOR MARCA" se basa solo en el nombre.
- Antitrampas: validación de la puntuación en el servidor, firma de partidas y rate limit de inserciones.
- Registrar partidas no guardadas (un contador real de partidas jugadas).
- Migrar a Supabase las puntuaciones ya guardadas en `localStorage`. Se descartan.
- Panel de administración para editar el catálogo. El catálogo se modifica con migraciones.
- Caché o revalidación (ISR) de las páginas. Todo se lee de forma dinámica.
- Leaderboards por periodo (semanal o mensual) y paginación más allá del top.
- Tiempo real (Realtime) en el leaderboard.
- Tests automatizados (no hay script de test configurado).

## Data model

```sql
-- supabase/migrations/<timestamp>_games_and_scores.sql (resumen, no es la migración completa)

create table public.games (
  id                text primary key,               -- slug actual: 'asteroids', 'bloque-buster', ...
  title             text not null,
  short_description text not null,
  long_description  text not null,
  category          text not null check (category in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover             text not null,                  -- clase CSS: 'cover-asteroids', ...
  accent_color      text not null check (accent_color in ('cyan','magenta','yellow','green')),
  sort_order        int  not null unique,
  created_at        timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id),
  player_name text not null check (player_name ~ '^[A-Z0-9_]{1,12}$'),
  score       int  not null check (score between 0 and 10000000),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at asc);

-- Mejor puntuación y nº de puntuaciones guardadas por juego (juegos sin puntuaciones: 0 y 0)
create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0)  as best_score,
         count(s.id)::int           as play_count
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;

-- Mejor marca de cada jugador por juego, con rango (empate: gana el created_at más antiguo)
create view public.leaderboard with (security_invoker = true) as
  with best as (
    select distinct on (game_id, player_name) game_id, player_name, score, created_at
    from public.scores
    order by game_id, player_name, score desc, created_at asc
  )
  select game_id, player_name, score, created_at,
         row_number() over (partition by game_id order by score desc, created_at asc)::int as rank
  from best;

-- RLS
alter table public.games  enable row level security;
alter table public.scores enable row level security;
create policy "games are readable"   on public.games  for select to anon, authenticated using (true);
create policy "scores are readable"  on public.scores for select to anon, authenticated using (true);
create policy "anyone can add score" on public.scores for insert to anon, authenticated with check (true);
-- Sin políticas de update/delete: quedan denegados. Los check de la tabla validan el formato.

-- Seed: insert de los 9 juegos actuales de data/games.ts con sort_order 1..9 (asteroids = 1)
```

```ts
// data/games.ts — solo tipos y filtros (el array GAMES desaparece)
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  category: GameCategory;
  cover: string;
  accentColor: "cyan" | "magenta" | "yellow" | "green";
  bestScore: number; // de game_stats.best_score
  playCount: number; // de game_stats.play_count — antes string ("12.4K"), ahora número
};

export const CATEGORY_FILTERS = [/* sin cambios */];
```

```ts
// lib/data/types.ts
export type LeaderboardEntry = {
  rank: number;
  playerName: string;
  score: number;
  date: string; // "DD/MM/YYYY", formateado desde created_at
};

export type DataResult<T> = { ok: true; data: T } | { ok: false };
```

```ts
// lib/data/games.ts — servidor (usa lib/supabase/server.ts)
export async function getGames(): Promise<DataResult<Game[]>>; // ordenados por sort_order
export async function getGame(id: string): Promise<DataResult<Game | null>>; // null → notFound()

// lib/data/leaderboard.ts — servidor
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<DataResult<LeaderboardEntry[]>>;

// lib/data/scores-client.ts — navegador (usa lib/supabase/client.ts)
export async function insertScore(entry: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<DataResult<null>>;
export async function getPlayerBest(
  gameId: string,
  playerName: string,
): Promise<DataResult<LeaderboardEntry | null>>;
```

```ts
// lib/format.ts
export function formatPlayCount(n: number): string; // 0 → "NUEVO", 12400 → "12.4K", 950 → "950"
export function normalizePlayerName(raw: string): string; // mayúsculas, solo [A-Z0-9_], máx. 12; "" → "INVITADO"
```

Convenciones:

- Columnas en `snake_case` en la base de datos y propiedades en `camelCase` en TypeScript. El mapeo vive solo en `lib/data/`.
- Las páginas y los componentes nunca llaman a Supabase directamente, solo a funciones de `lib/data/`.
- Las funciones de `lib/data/` no lanzan excepciones: devuelven `{ ok: false }` y registran el detalle con `console.error`.
- Las vistas usan `security_invoker = true` para respetar el RLS de las tablas base (recomendación del advisor de Supabase).
- Después de aplicar la migración, se ejecuta `npm run db:types` y se commitea `database.types.ts` junto con ella (convención de la SPEC 04).

## Implementation plan

1. Crear la migración con `npx supabase migration new games_and_scores`:
   - Contenido: tablas `games` y `scores`, índice, vistas `game_stats` y `leaderboard`, RLS y políticas, y la siembra de los 9 juegos copiados de `data/games.ts` con `sort_order` 1..9.
   - Aplicarla con `npm run db:push` y regenerar los tipos con `npm run db:types`.
   - Verificar con `mcp__supabase__get_advisors` (security) que no hay warnings sobre las tablas ni las vistas nuevas.
   - La app no cambia todavía.
2. Crear `lib/format.ts` (`formatPlayCount`, `normalizePlayerName`), `lib/data/types.ts` y `lib/data/games.ts` (`getGames`, `getGame`, con el mapeo `snake_case → camelCase` y el cruce con `game_stats`). Compila sin usarse todavía.
3. Crear `lib/data/leaderboard.ts` (`getLeaderboard`) y `lib/data/scores-client.ts` (`insertScore`, `getPlayerBest`). Compila sin usarse todavía.
4. Pasar el catálogo a Supabase en todas las pantallas a la vez, porque cambia el tipo `Game`. Antes de escribir código, consultar en `node_modules/next/dist/docs/01-app/` Server Components, renderizado dinámico, `searchParams` y `notFound`.
   - `data/games.ts`: eliminar `GAMES` y cambiar `playCount` a `number`.
   - `GameCard` y `MiniGameCard` usan `formatPlayCount`.
   - `/`: Server Component que llama a `getGames()` y muestra los 6 primeros.
   - `/games`: Server Component que llama a `getGames()`. La búsqueda y los filtros pasan a `components/games-browser.tsx` (cliente).
   - `/games/[id]` y `/games/[id]/play`: usan `getGame(id)`, y `null` llama a `notFound()`. El detalle muestra `bestScore` y `playCount` reales. El top 10 sigue en mock en este paso.
   - `/leaderboard`: las pestañas salen de `getGames()`. Las filas siguen en mock en este paso.
   - Si `getGames()` o `getGame()` devuelven `{ ok: false }`, se muestra el componente `components/signal-lost.tsx` ("SEÑAL PERDIDA").
   - Prueba manual: las mismas pantallas que antes, ahora con datos de Supabase. Con una URL de Supabase inválida, se ve "SEÑAL PERDIDA".
5. Top 10 real en `/games/[id]` con `getLeaderboard(id, 10)`:
   - Sin filas, se muestra el estado vacío "SÉ EL PRIMERO".
   - Con un error, se muestra "SEÑAL PERDIDA" solo en ese bloque.
6. Leaderboard real en `/leaderboard`:
   - La pestaña activa se lee de `searchParams.game`. Si falta o el `id` no existe, se usa el primer juego por `sort_order`.
   - Las pestañas son `<Link href="/leaderboard?game=<id>">`.
   - El podio y el top 12 salen de `getLeaderboard(game, 12)`. El podio muestra solo los puestos que existan.
   - Estado vacío "SÉ EL PRIMERO" y estado de error "SEÑAL PERDIDA".
   - Se elimina `data/leaderboard.ts`, que ya no tiene consumidores.
7. Fila "TU MEJOR MARCA" en `components/player-best-row.tsx` (cliente):
   - Lee `session` y llama a `getPlayerBest(game, session.name)`.
   - Se muestra solo si hay sesión y resultado, con su rango real.
   - Si hay un error o no hay resultado, no muestra nada.
8. Guardado real en el modal de `components/game-player.tsx`:
   - **GUARDAR PUNTUACIÓN** llama a `insertScore` con `normalizePlayerName(name)`.
   - Estados: "GUARDANDO…" con el botón deshabilitado, "GUARDADO" y error con un botón **REINTENTAR**.
   - Se elimina `lib/saved-scores.ts`.
   - Prueba manual: guardar en ASTEROIDS y ver la puntuación en `/leaderboard?game=asteroids` y en `/games/asteroids`.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

**Base de datos**

- [x] Existe una migración nueva en `supabase/migrations/` (`*_games_and_scores.sql`), y `npx supabase migration list` la muestra aplicada en el remoto.
- [x] `public.games` contiene exactamente 9 filas, con los mismos `id`, títulos, descripciones, categorías, portadas y colores que tenía `data/games.ts` en `main`, y `asteroids` con `sort_order = 1`.
- [x] Insertar en `scores` con la publishable key (`anon`) un registro válido funciona.
- [x] Insertar con `player_name = 'abc'`, `'NOMBRE_DEMASIADO_LARGO'` o `'A B'` falla por el `check`.
- [x] Insertar con `score = -1` o `score = 10000001` falla por el `check`.
- [x] Insertar con un `game_id` inexistente falla por la FK.
- [x] Con la publishable key, `update` y `delete` sobre `scores` no afectan ninguna fila, e `insert`, `update` y `delete` sobre `games` fallan o no afectan ninguna fila.
- [x] La vista `leaderboard` devuelve una sola fila por jugador y juego, con su mejor puntuación. Entre dos jugadores empatados, el de `created_at` más antiguo tiene el rango menor.
- [x] La vista `game_stats` devuelve `best_score = 0` y `play_count = 0` para un juego sin puntuaciones.
- [x] `mcp__supabase__get_advisors` (security) no reporta warnings sobre `games`, `scores`, `game_stats` ni `leaderboard`.
- [x] `lib/supabase/database.types.ts` incluye `games` y `scores` en `Tables`, y `game_stats` y `leaderboard` en `Views`.

**Catálogo**

- [x] `data/games.ts` no exporta `GAMES`, y ningún archivo de `app/`, `components/` ni `lib/` lo importa.
- [x] Home muestra los 6 primeros juegos por `sort_order`, empezando por ASTEROIDS.
- [x] `/games` muestra los 9 juegos, y la búsqueda por nombre y los filtros por categoría funcionan igual que antes.
- [x] Las tarjetas y el detalle muestran `bestScore` y `playCount` de `game_stats`.
- [x] Un juego sin puntuaciones muestra `NUEVO` como `playCount` y `0` como `bestScore`.
- [x] Tras guardar una puntuación, recargar `/games` refleja el nuevo `playCount` y, si la supera, el nuevo `bestScore`.
- [x] `/games/no-existe` y `/games/no-existe/play` muestran la página 404.

**Leaderboard y detalle**

- [x] `/leaderboard` sin parámetros abre la pestaña ASTEROIDS. `/leaderboard?game=caida` abre CAÍDA, y `/leaderboard?game=no-existe` abre ASTEROIDS.
- [x] Al pulsar una pestaña, la URL cambia a `/leaderboard?game=<id>`, y recargar mantiene esa pestaña.
- [x] El podio y la tabla de `/leaderboard` muestran como máximo 12 filas, ordenadas por rango, con un jugador por fila.
- [x] Con 1 o 2 puntuaciones, el podio muestra solo los puestos existentes, sin huecos con datos inventados.
- [x] Un juego sin puntuaciones muestra "SÉ EL PRIMERO" en `/leaderboard` y en el top de `/games/[id]`.
- [x] El top de `/games/[id]` muestra como máximo 10 filas reales.
- [x] Con sesión iniciada con un nombre que tiene puntuación en el juego, aparece la fila "TU MEJOR MARCA" con su rango y puntuación reales, también si está fuera del top 12.
- [x] Sin sesión, o con un nombre sin puntuación en ese juego, la fila "TU MEJOR MARCA" no aparece.
- [x] `data/leaderboard.ts` no existe, y no queda ninguna referencia a `generateMockScores`.

**Guardado**

- [x] **GUARDAR PUNTUACIÓN** inserta una fila en `scores` con el `gameId` del juego, el nombre normalizado a mayúsculas y la puntuación final.
- [x] Mientras se guarda, el botón muestra "GUARDANDO…" y está deshabilitado. Al terminar, muestra "GUARDADO".
- [x] Si la inserción falla, el modal muestra un mensaje de error y un botón **REINTENTAR**, y reintentar con éxito inserta una sola fila.
- [x] Hacer doble clic en **GUARDAR PUNTUACIÓN** inserta una sola fila.
- [x] `lib/saved-scores.ts` no existe, y no se escribe la clave `arcade-vault:saved-scores` en `localStorage`.

**Errores y no regresiones**

- [x] Con `NEXT_PUBLIC_SUPABASE_URL` apuntando a una URL inválida, `/`, `/games`, `/games/asteroids` y `/leaderboard` muestran "SEÑAL PERDIDA" sin una excepción no manejada.
- [ ] El juego ASTEROIDS (motor, HUD, pausa y modal) funciona igual que en la SPEC 05.
- [x] `next dev` no muestra errores en consola en `/`, `/games`, `/games/asteroids`, `/games/asteroids/play` ni `/leaderboard`.
- [x] `npm run build` termina sin errores.
- [x] `npm run lint` no reporta errores en los archivos nuevos o modificados por esta spec.

## Decisions

- **Sí:** tabla `games` en Supabase como fuente única del catálogo, y `scores.game_id` con FK a `games.id`. La base garantiza que no hay puntuaciones de juegos inexistentes.
- **No:** dejar el catálogo en `data/games.ts` con una tabla `games` mínima solo para la FK. Habría dos fuentes de verdad que mantener sincronizadas.
- **Sí:** sembrar los 9 juegos dentro de la migración. El catálogo queda reproducible y versionado en git.
- **No:** panel de administración del catálogo. Por ahora los cambios del catálogo se hacen con migraciones.
- **Sí:** inserción anónima (`anon`) en `scores`, con RLS y `check` de formato. Permite tener un leaderboard real antes de la spec de auth.
- **No:** Route Handler `/api/scores` con `SUPABASE_SECRET_KEY`. Sin auth tampoco evita las trampas, y añade una clave sensible y más código.
- **No:** esperar a la spec de auth para persistir. Bloquearía el objetivo principal de la plataforma (competir por puntuación).
- **Sí:** asumir que se puede hacer trampa (insertar puntuaciones falsas con la publishable key). Los antitrampas van en una spec propia.
- **Sí:** el leaderboard muestra la mejor marca de cada jugador por juego. Un jugador no puede acaparar el top repitiendo partidas.
- **No:** listar todas las partidas en el leaderboard.
- **Sí:** a igual puntuación gana quien la registró antes (`created_at` ascendente). El criterio es determinista y tiene sentido arcade.
- **Sí:** vistas `game_stats` y `leaderboard` con `security_invoker = true`. El cálculo vive en SQL, respeta el RLS y lo recomienda el advisor de Supabase.
- **No:** calcular el ranking en TypeScript descargando todas las puntuaciones. No escala y duplicaría lógica.
- **Sí:** `playCount` pasa a significar "puntuaciones guardadas". No requiere escrituras extra, y el formato visible (`12.4K`, `NUEVO`) no cambia.
- **No:** registrar cada partida terminada aunque no se guarde. Implica más escrituras anónimas y es otra spec.
- **Sí:** eliminar todos los mocks (`generateMockScores`, `bestScore`/`playCount` hardcodeados), con un estado vacío "SÉ EL PRIMERO".
- **No:** sembrar puntuaciones falsas en la base. Contaminarían el leaderboard real.
- **No:** mantener los mocks en los juegos sin motor. Mezclar datos reales y falsos en la misma pantalla confunde.
- **Sí:** eliminar `lib/saved-scores.ts` sin migrar lo que ya había en `localStorage`. Son datos locales de prueba, sin valor para el ranking global.
- **Sí:** Server Components con lectura dinámica en cada request y la interactividad en componentes cliente que reciben props. Evita spinners y parpadeos, y el leaderboard siempre está al día.
- **No:** páginas cliente que leen con `lib/supabase/client.ts`. Más estados de carga y más JavaScript en el cliente.
- **No:** caché ni ISR. Con este volumen no hace falta, y se evaluará si aparece un problema de rendimiento.
- **Sí:** la pestaña de `/leaderboard` vive en la URL (`?game=<id>`). Se puede compartir y recargar, y la puede leer un Server Component.
- **Sí:** las páginas solo acceden a Supabase mediante `lib/data/`, y esas funciones devuelven `DataResult` sin lanzar excepciones. Los errores se tratan de forma uniforme ("SEÑAL PERDIDA").
- **Sí:** "TU MEJOR MARCA" se calcula por coincidencia de `session.name` con `player_name`. Es lo único posible sin auth, y queda documentado como limitación.
- **Sí:** nombre de jugador limitado a `^[A-Z0-9_]{1,12}$` y normalizado en el cliente. Es estética arcade y evita contenido abusivo largo. `INVITADO` encaja en el patrón.
- **Sí:** una sola spec para las tablas, el catálogo, la lectura y el guardado, por decisión explícita del usuario, aunque se propuso dividirla en dos.
- **Sí:** identificadores de código en inglés y textos visibles en español, mismo criterio que las specs 01 a 05.

## Risks

| Riesgo                                                                                                            | Mitigación                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cualquiera puede insertar puntuaciones falsas con la publishable key (visible en el navegador).                   | Se asume de forma explícita (ver Decisions). Los `check` limitan el formato y el rango. Antitrampas y rate limit van en una spec propia.                            |
| Spam masivo de inserciones anónimas que llena `scores`.                                                           | `scores` no admite `delete` desde el cliente, pero sí desde el dashboard o con SQL. El rate limit queda fuera de alcance y se documenta como deuda.                 |
| Si Supabase cae, cae todo el catálogo (antes era estático).                                                       | Todas las lecturas pasan por `lib/data/` con `DataResult`, y las páginas muestran "SEÑAL PERDIDA" sin romperse. Hay un criterio de aceptación con una URL inválida. |
| La siembra de la migración diverge del contenido de `data/games.ts` (erratas al copiar las descripciones).        | Criterio de aceptación que compara las 9 filas con `data/games.ts` de `main`.                                                                                       |
| La vista `leaderboard` con `distinct on` y `row_number()` se vuelve lenta con muchas filas.                       | Índice `scores (game_id, score desc, created_at asc)`. Con el volumen esperado basta, y si no, se evalúa una vista materializada en otra spec.                      |
| El cambio de tipo de `playCount` (`string → number`) rompe varias pantallas a la vez.                             | El paso 4 del plan migra todos los consumidores del catálogo en un único paso compilable.                                                                           |
| Las APIs de Next 16 (`searchParams` y `params` async, renderizado dinámico, `notFound`) difieren de lo recordado. | Consultar `node_modules/next/dist/docs/01-app/` antes del paso 4, como indican `AGENTS.md` y `CLAUDE.md`.                                                           |
| Next 16 podría prerenderizar o cachear las páginas y mostrar un leaderboard desactualizado.                       | Verificar en la documentación cómo forzar el renderizado dinámico. Hay un criterio de aceptación de "recargar refleja el nuevo `playCount`".                        |
| Doble clic en guardar inserta puntuaciones duplicadas.                                                            | Botón deshabilitado mientras dura "GUARDANDO…" y un criterio de aceptación específico.                                                                              |
| `database.types.ts` desactualizado respecto a la migración.                                                       | Convención de la SPEC 04: `db:types` después de cada `db:push`, commiteados juntos. Hay un criterio de aceptación de tipos.                                         |

## What is **not** in this spec

- Autenticación real con Supabase Auth y la asociación de puntuaciones a usuarios.
- Antitrampas y rate limit de inserciones.
- Contador real de partidas jugadas (incluidas las no guardadas).
- Migración de las puntuaciones existentes en `localStorage`.
- Panel de administración del catálogo.
- Caché o ISR de las páginas.
- Leaderboards por periodo y paginación.
- Leaderboard en tiempo real.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

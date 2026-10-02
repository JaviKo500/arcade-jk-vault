# SPEC 04 — Infraestructura base de Supabase

> **Estado:** Implemented · **Depende de:** ninguna spec funcional (se apoya en el proyecto Supabase remoto `fvbuzwmfygecfketwpsr` ya conectado por MCP y en `SUPABASE_DB_PASSWORD` de `.env.local.example`) · **Fecha:** 2026-10-01
> **Objetivo:** Conectar la app Next.js al proyecto Supabase remoto con clientes de navegador y servidor, flujo de migraciones y tipos generados vía CLI, verificado por un endpoint `/api/health` que llama a una función SQL `health_check()`.

## Scope

**Incluye:**

- Dependencias de runtime `@supabase/supabase-js` y `@supabase/ssr` agregadas a `package.json`.
- Supabase CLI (`supabase`) como devDependency, con dos scripts nuevos en `package.json`:
  - `db:push`: ejecuta `supabase db push` para aplicar `supabase/migrations/` al proyecto remoto, autenticado con `SUPABASE_DB_PASSWORD`.
  - `db:types`: ejecuta `supabase gen types typescript --project-id fvbuzwmfygecfketwpsr` y escribe la salida en `lib/supabase/database.types.ts`.
- Carpeta `supabase/` inicializada con `supabase init` (`supabase/config.toml`) y enlazada al proyecto remoto (`supabase link`).
- Migración inicial `supabase/migrations/<timestamp>_health_check.sql`: crea la función `public.health_check()`, que devuelve `true`, con permiso `execute` para los roles `anon` y `authenticated`.
- `lib/supabase/client.ts`: crea el cliente de navegador con `createBrowserClient`, tipado con `Database`.
- `lib/supabase/server.ts`: crea el cliente de servidor con `createServerClient` y `cookies()` de `next/headers`, tipado con `Database`.
- `lib/supabase/database.types.ts`: tipos generados con `db:types` después de aplicar la migración. Se versiona en git.
- `app/api/health/route.ts` (GET): llama a `supabase.rpc("health_check")` usando el cliente de servidor.
  - Si la llamada funciona, responde `200 { ok: true }`.
  - Si hay un error o faltan variables de entorno, responde `503 { ok: false, error }` de forma controlada.
- `.env.local.example` actualizado con `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`, sin valores reales.

**Fuera de alcance (para futuros specs):**

- Autenticación con Supabase Auth: reemplazar la sesión de `localStorage` (`lib/session.ts`).
- `proxy.ts` de refresco de sesión. Va con la spec de auth.
- Tablas de scores y leaderboard real: reemplazar `lib/saved-scores.ts` y `generateMockScores`.
- `SUPABASE_SECRET_KEY` (service role). Se agregará cuando una spec la necesite.
- Stack local con Docker (`supabase start`). Por ahora se trabaja solo contra el proyecto remoto.
- Cambios en la UI. Ninguna pantalla consume Supabase en esta spec.
- Tests automatizados. El proyecto no tiene un script de test configurado.

## Data model

```sql
-- supabase/migrations/<timestamp>_health_check.sql
create or replace function public.health_check()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

grant execute on function public.health_check() to anon, authenticated;
```

```ts
// app/api/health/route.ts — response shapes
type HealthSuccessResponse = { ok: true };
type HealthErrorResponse = { ok: false; error: "missing_env" | "rpc_failed" };
```

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient<Database>;

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>;
// es async porque cookies() de next/headers es async en Next 16
```

Variables de entorno nuevas en `.env.local.example` (sin valores reales):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Convenciones:

- `Database` se importa desde `lib/supabase/database.types.ts`, que se genera con el CLI. Nunca se edita a mano.
- Ambos módulos exportan `createClient` con el mismo nombre, siguiendo la convención oficial de `@supabase/ssr`. Se distinguen por la ruta de import: `@/lib/supabase/client` o `@/lib/supabase/server`.
- `set search_path = ''` y `security invoker` siguen las recomendaciones del advisor de seguridad de Supabase para funciones.
- Esta spec no crea tablas propias.

## Implementation plan

1. Instalar dependencias:
   - Runtime: `npm install @supabase/supabase-js @supabase/ssr`.
   - Desarrollo: `npm install -D supabase`.

   Actualizar `.env.local.example` con `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`.

2. Inicializar y enlazar el CLI:
   - Ejecutar `npx supabase init` para crear `supabase/config.toml`.
   - Agregar `supabase/.temp/` y `supabase/.branches/` a `.gitignore` si `init` no lo hace.
   - Enlazar con `npx supabase link --project-ref fvbuzwmfygecfketwpsr`. **Paso interactivo:** requiere `npx supabase login` y `SUPABASE_DB_PASSWORD`, así que lo ejecuta el usuario con `! <comando>`.
3. Agregar a `package.json` los scripts `db:push` (`supabase db push`) y `db:types` (`supabase gen types typescript --project-id fvbuzwmfygecfketwpsr > lib/supabase/database.types.ts`).
4. Crear la migración con `npx supabase migration new health_check` y escribir en ella la función `public.health_check()` junto con su `grant`. Aplicarla con `npm run db:push` y comprobar con `supabase migration list` que aparece en el remoto.
5. Ejecutar `npm run db:types` para generar `lib/supabase/database.types.ts`. Verificar que el archivo incluye `health_check` en `Functions`.
6. Crear `lib/supabase/client.ts` (`createBrowserClient<Database>`) y `lib/supabase/server.ts` (`createServerClient<Database>` con `await cookies()` y los handlers `getAll`/`setAll`). Antes de escribir `server.ts`, consultar en `node_modules/next/dist/docs/` la API de `cookies()`.
7. Crear `app/api/health/route.ts` (GET):
   - Si falta alguna variable `NEXT_PUBLIC_SUPABASE_*`, responde `503 { ok: false, error: "missing_env" }`.
   - Si no, llama a `supabase.rpc("health_check")`. Responde `200 { ok: true }` si devuelve `true`, o `503 { ok: false, error: "rpc_failed" }` con un `console.error` del detalle.

   Antes de escribirlo, consultar en `node_modules/next/dist/docs/01-app/` la documentación de Route Handlers.

8. Pasada final:
   - Con las variables configuradas en `.env.local`, `GET /api/health` responde `200 { ok: true }`.
   - Sin las variables, responde `503 missing_env`.
   - `npm run build` y `npm run lint` pasan sin errores.

Cada paso deja el proyecto compilable con `next dev`.

## Acceptance criteria

- [x] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` en `dependencies`, y `supabase` en `devDependencies`.
- [x] `package.json` incluye los scripts `db:push` y `db:types`, y ambos se ejecutan sin error con el proyecto enlazado.
- [x] Existe `supabase/config.toml` versionado en git. `supabase/.temp/` no está versionado.
- [x] Existe exactamente una migración en `supabase/migrations/`, y crea `public.health_check()`.
- [x] `npx supabase migration list` muestra la migración `health_check` aplicada en el remoto.
- [x] `lib/supabase/database.types.ts` existe, está versionado y contiene `health_check` dentro de `Functions`.
- [x] `lib/supabase/client.ts` y `lib/supabase/server.ts` exportan `createClient`, tipado con `Database`.
- [x] `.env.local.example` contiene `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` sin valores, y conserva las variables existentes.
- [x] Con las variables configuradas en `.env.local`, `GET /api/health` responde `200` con `{ "ok": true }`.
- [x] Sin `NEXT_PUBLIC_SUPABASE_URL` o sin `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GET /api/health` responde `503` con `{ "ok": false, "error": "missing_env" }` sin lanzar una excepción no manejada.
- [x] Si la llamada RPC falla (por ejemplo, URL inválida), `GET /api/health` responde `503` con `{ "ok": false, "error": "rpc_failed" }` y registra el detalle con `console.error`.
- [x] `mcp__supabase__get_advisors` (security) no reporta warnings sobre `public.health_check`.
- [x] `npm run build` y `npm run lint` terminan sin errores. — **Pendiente:** `build` pasa; `lint` falla solo por errores previos a esta spec (`app/page.tsx` y `references/`). Los archivos de esta spec no tienen errores de lint. Se resuelve en una spec aparte.
- [x] Ninguna ruta existente (`/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/auth`, `/leaderboard`, `/about`) cambia de comportamiento.
- [x] No existe `proxy.ts` ni `middleware.ts` en la raíz del proyecto.

## Decisions

- **Sí:** separar "Supabase" en varias specs. Esta cubre solo la infraestructura; auth y scores/leaderboard irán en specs propias. La petición original abarcaba tres áreas y obligaba a decidir en cuatro o más dominios.
- **No:** incluir auth o tablas de scores aquí. Cada una implica decisiones propias de UX, RLS y migración de datos de `localStorage`.
- **Sí:** trabajar solo contra el proyecto remoto `fvbuzwmfygecfketwpsr`. Ya está conectado por MCP y evita depender de Docker.
- **No:** stack local con `supabase start`. Puede ir en una spec futura si se necesita aislar desarrollo de datos reales.
- **Sí:** Supabase CLI como devDependency, con los scripts `db:push` y `db:types`. Hace que migraciones y tipos sean reproducibles por cualquier persona del equipo.
- **No:** aplicar migraciones o generar tipos solo con el MCP. No es reproducible fuera de Claude y no deja un flujo documentado en el repo.
- **Sí:** `lib/supabase/database.types.ts` versionado en git. El código compila sin necesidad de acceso al proyecto remoto.
- **Sí:** verificar la conexión con una función SQL `public.health_check()` llamada por RPC desde `app/api/health/route.ts`. Valida de punta a punta la migración, los tipos generados, el cliente de servidor y las variables de entorno.
- **No:** consultar una tabla inexistente o hacer un `fetch` directo a `/rest/v1/`. Son verificaciones frágiles o que no ejercitan el cliente tipado.
- **No:** página de debug en la UI. El endpoint JSON es verificable sin tocar pantallas.
- **Sí:** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, la nomenclatura actual de Supabase (publishable key en lugar de `anon key`).
- **No:** `SUPABASE_SECRET_KEY` en esta spec. Ninguna operación de esta spec necesita saltarse RLS, y la key se agregará cuando una spec la justifique.
- **No:** `proxy.ts` de refresco de sesión (el antiguo `middleware`, renombrado en Next 16). Sin auth no aporta nada y se ejecutaría en cada request. Va con la spec de auth.
- **Sí:** `lib/supabase/client.ts` y `lib/supabase/server.ts`, ambos exportando `createClient`. Es la convención oficial de `@supabase/ssr` y separa explícitamente el código de navegador del de servidor.
- **Sí:** responder `503` (no `500`) cuando la verificación falla. Semánticamente es "servicio dependiente no disponible", y facilita usar el endpoint como health check externo.
- **Sí:** identificadores de código en inglés, mismo criterio que las specs 01 a 03.

## Risks

| Riesgo                                                                                                                                           | Mitigación                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase link` y `db push` requieren login interactivo (`supabase login`) y `SUPABASE_DB_PASSWORD`, así que el agente no puede ejecutarlos solo | Marcado como paso interactivo en el plan (paso 2). El usuario los ejecuta con `! <comando>` en la sesión.                                                   |
| Los comandos `db:push` y `db:types` del CLI pueden comportarse distinto en Windows (redirección `>`, binario del CLI)                            | Probar ambos scripts en el entorno Windows del proyecto en los pasos 4 y 5. Si la redirección falla, usar el flag de salida del CLI o un script de Node.    |
| `database.types.ts` queda desactualizado si alguien aplica una migración sin regenerar los tipos                                                 | Convención documentada: después de cada `db:push` se ejecuta `db:types` y se commitea el resultado junto con la migración.                                  |
| La migración se aplica directo al proyecto remoto, que podría tener datos reales en el futuro                                                    | Esta migración es aditiva e inocua (solo crea una función). Para futuras migraciones destructivas, evaluar ramas de Supabase o un stack local en otra spec. |
| APIs de Next 16 (`cookies()` async, Route Handlers) distintas a las de versiones anteriores                                                      | Consultar `node_modules/next/dist/docs/` antes de escribir `server.ts` y `route.ts`, como indican `AGENTS.md` y `CLAUDE.md`.                                |
| Prettier o el hook de formateo reformatean `database.types.ts` en cada edición y generan diffs ruidosos                                          | Agregar `lib/supabase/database.types.ts` a `.prettierignore` si se observa ese comportamiento.                                                              |

## What is **not** in this spec

- Autenticación con Supabase Auth y `proxy.ts` de refresco de sesión.
- Tablas de scores y leaderboard real.
- `SUPABASE_SECRET_KEY` (service role).
- Stack local con Docker (`supabase start`).
- Cambios en la UI.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

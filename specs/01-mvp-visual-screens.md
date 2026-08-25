# SPEC 01 — MVP visual: pantallas de Arcade Vault

> **Status:** Implemented · **Depends on:** Ninguno (primer spec del proyecto) · **Date:** 2026-08-15
> **Objective:** Portar las 5 pantallas del prototipo estático en `references/templates/` (Biblioteca, Detalle, Reproductor, Auth, Salón de la Fama) a rutas reales de Next.js App Router, reutilizando el CSS/fuentes ya configurados y datos mock simulados, sin implementar lógica de juego real ni backend.

## Scope

**Incluye:**

- Ruta `/` — pantalla de Biblioteca: hero, buscador, chips de categoría, grid de tarjetas de juego (con efecto tilt), estado "sin resultados".
- Ruta `/games/[id]` — pantalla de Detalle de juego: cover, tags, descripción, stat strip, botones "Jugar ahora" / "Volver al vault", leaderboard lateral con datos mock.
- Ruta `/games/[id]/play` — pantalla de Reproductor: HUD (jugador, puntaje, vidas, nivel), CRT con arena animada por CSS, pausa/reanudar, temporizador simulado que incrementa puntaje y nivel, modal de "fin del juego" con guardado de puntaje (input de nombre + botón).
- Ruta `/auth` — pantalla de Auth: tabs "Iniciar sesión" / "Crear cuenta", formulario, botón "Jugar como invitado", botones sociales decorativos (sin integración real).
- Ruta `/leaderboard` — pantalla de Salón de la Fama: tabs por juego, podio top 3, tabla de puntuaciones, fila destacada "tu mejor marca" cuando hay sesión iniciada.
- Componente `Nav` compartido (desktop + panel móvil) con resaltado de ruta activa, contador de créditos fijo, y botón de sesión (Iniciar sesión / nombre de usuario · cerrar sesión).
- Sesión de usuario simulada (login/logout, invitado) persistida en `localStorage`.
- Puntajes guardados desde el Reproductor persistidos en `localStorage`.
- Datos mock de juegos, categorías y tablas de puntuación (adaptados de `data.jsx`), sin fuente de datos real.
- Fondo global (grid en perspectiva, scanlines, ruido) y layout general ya existentes en `app/layout.tsx` / `app/globals.css`, reutilizados sin cambios estructurales grandes.
- Responsive tal como está resuelto en `styles.css` (breakpoints existentes para nav, hall, detail, player).
- Todo el copy visible en la UI (títulos, labels, botones, mensajes) se mantiene en español, igual que el template de referencia; solo los identificadores de código (rutas, nombres de archivo, componentes, variables, claves de datos mock) van en inglés.

**Fuera de alcance (para futuros specs):**

- Lógica real de cualquier juego (Bloque Buster, Caída, Serpentina, etc.) — el Reproductor es una simulación visual, no un juego jugable.
- Autenticación real (backend, tokens, OAuth con Google/GitHub) — los botones sociales son decorativos.
- Persistencia en servidor o base de datos — todo vive en `localStorage` del navegador.
- Sistema de créditos/monedas funcional — el contador es un valor fijo decorativo.
- Imágenes o assets de portada reales — se mantienen los covers generados por CSS.
- Internacionalización (i18n) — el copy queda fijo en español, sin cambio de idioma.
- Tests automatizados (no hay test script configurado en el proyecto).

## Data model

Se traduce `data.jsx` a un módulo TypeScript con datos estáticos. Los identificadores de código van en inglés; los valores de contenido visible (títulos, descripciones, categorías, nombres de jugadores, fechas) se mantienen tal como están en el template (en español o como préstamos ya usados en ambos idiomas, p. ej. "ARCADE", "PUZZLE").

```ts
// data/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  category: GameCategory;
  cover: string;          // sufijo de clase CSS, ej. "cover-bricks"
  accentColor: "cyan" | "magenta" | "yellow" | "green";
  bestScore: number;
  playCount: string;      // ya formateado, ej. "12.4K"
};

export const GAMES: Game[] = [ /* 8 entradas, portadas 1:1 desde data.jsx */ ];
export const CATEGORY_FILTERS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;

// data/leaderboard.ts
export type LeaderboardEntry = {
  rank: number;
  playerName: string;
  score: number;
  date: string; // "DD/MM/YYYY"
};

export function generateMockScores(seed: number, count?: number): LeaderboardEntry[];
// puerto directo de seededScores(seed, count) — mismo algoritmo pseudoaleatorio determinista
```

Estado de sesión y puntajes guardados, persistidos en `localStorage`:

```ts
// lib/session.ts
export type Session = { name: string } | null;

const SESSION_KEY = "arcade-vault:session";

// lib/saved-scores.ts
export type SavedScore = {
  gameId: string;
  playerName: string;
  score: number;
  savedAt: number; // epoch ms
};

const SAVED_SCORES_KEY = "arcade-vault:saved-scores";
```

Convenciones:

- `Game.id` es el mismo valor que el segmento dinámico `[id]` en las rutas `/games/[id]` y `/games/[id]/play`.
- `generateMockScores` es determinista por `seed` (igual que el original), para que el leaderboard de una misma pantalla no cambie en cada render.
- No hay backend: `Session` y `SavedScore[]` solo existen en `localStorage` del navegador.

## Implementation plan

1. Crear `data/games.ts` y `data/leaderboard.ts`, portando `GAMES`, `CATEGORY_FILTERS` y `generateMockScores` desde `data.jsx`. No cambia la UI todavía; el build sigue pasando.
2. Crear `lib/session.ts` (leer/escribir `Session` en `localStorage`) y `lib/saved-scores.ts` (leer/agregar `SavedScore[]`).
3. Crear `components/session-provider.tsx` (client component con React Context) que expone `session`, `signIn(name)`, `signOut()`, inicializado desde `lib/session.ts`; envolver `app/layout.tsx` con él.
4. Crear `components/nav.tsx` (puerto de `nav.jsx`) usando el contexto de sesión y `usePathname` para resaltar la ruta activa; montarlo en `app/layout.tsx` junto con `components/footer.tsx` (puerto estático del `<footer>` de `app.jsx`).
5. Reemplazar el scaffold de `app/page.tsx` por la pantalla de Biblioteca: hero, buscador, chips de categoría, grid de `components/game-card.tsx`, navegación a `/games/[id]` al seleccionar una tarjeta.
6. Crear `app/games/[id]/page.tsx` (Detalle de juego): cover, tags, descripción, stat strip, leaderboard lateral con `generateMockScores`, botones a `/games/[id]/play` y `/`.
7. Crear `app/auth/page.tsx` (Auth): tabs "Iniciar sesión"/"Crear cuenta", formulario, botón de invitado; al enviar llama `signIn` del contexto y navega a `/`.
8. Crear `app/games/[id]/play/page.tsx` (Reproductor): HUD, CRT con arena animada, pausa/reanudar, temporizador simulado de puntaje/nivel, modal de fin de juego que guarda el puntaje vía `lib/saved-scores.ts`.
9. Crear `app/leaderboard/page.tsx` (Salón de la Fama): tabs por juego, podio top 3, tabla de puntuaciones, fila "tu mejor marca" cuando hay sesión activa (contexto de sesión).
10. Pasada final: verificar los breakpoints responsive existentes en las 5 rutas, el estado "sin resultados" en Biblioteca, el estado invitado vs. con sesión en Nav y Salón de la Fama, y limpiar cualquier resto del scaffold de `create-next-app` que ya no aplique.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

- [x] `next dev` levanta el proyecto sin errores en consola en ninguna de las 5 rutas.
- [x] La ruta `/` muestra el hero, el buscador filtra por título en tiempo real, los chips filtran por categoría, y se muestra el estado "sin resultados" cuando no hay coincidencias.
- [x] Cada tarjeta de juego en `/` navega a `/games/[id]` con el `id` correcto al hacer click.
- [x] La ruta `/games/[id]` muestra los datos del juego seleccionado (cover, tags, descripción, stats) y un leaderboard con 10 filas generadas por `generateMockScores`.
- [x] El botón "Jugar ahora" en `/games/[id]` navega a `/games/[id]/play`; el botón "Volver al vault" navega a `/`.
- [x] En `/games/[id]/play`, el puntaje y el nivel aumentan automáticamente mientras el juego no está en pausa ni terminado.
- [x] El botón "Pausa" detiene el incremento de puntaje y muestra el overlay "En pausa"; "Reanudar" lo retoma.
- [x] El botón "Fin" abre el modal de fin de juego mostrando el puntaje final.
- [x] Guardar el puntaje en el modal lo persiste en `localStorage` (`arcade-vault:saved-scores`) y muestra la confirmación "Puntuación guardada".
- [x] La ruta `/auth` permite alternar entre "Iniciar sesión" y "Crear cuenta", enviar el formulario inicia sesión simulada y navega a `/`.
- [x] "Jugar como invitado" en `/auth` navega a `/` sin iniciar sesión.
- [x] Tras iniciar sesión, el `Nav` muestra el nombre de usuario en vez del botón "Iniciar sesión", en todas las rutas.
- [x] Cerrar sesión desde el `Nav` limpia la sesión de `localStorage` y el `Nav` vuelve a mostrar "Iniciar sesión".
- [x] Recargar la página conserva la sesión iniciada (persistencia en `localStorage`).
- [x] La ruta `/leaderboard` muestra tabs por juego, un podio con los 3 primeros puestos y una tabla con el resto de las posiciones.
- [x] Con sesión iniciada, `/leaderboard` muestra la fila destacada "tu mejor marca"; sin sesión, no aparece.
- [x] El `Nav` resalta la ruta activa correctamente en `/`, `/games/[id]`, `/games/[id]/play`, `/auth` y `/leaderboard`.
- [x] El menú móvil del `Nav` (hamburguesa) abre y cierra el panel lateral en viewports angostos.
- [x] Todas las pantallas son usables en un viewport móvil (≤ 480px de ancho) sin overflow horizontal.

## Decisions

- **Sí:** rutas reales de Next.js App Router en inglés (`/`, `/games/[id]`, `/games/[id]/play`, `/auth`, `/leaderboard`) en vez del ruteo por hash del template. Es la convención estándar de App Router; el hash routing era un hack propio de la SPA sin build del prototipo.
- **No:** mantener el ruteo por hash de `app.jsx`. Iría contra las convenciones de Next.js App Router que ya sigue el proyecto.
- **Sí:** el Reproductor es una demo visual interactiva (temporizador simulado de puntaje/nivel, animaciones CSS, modal completo de fin de juego) en vez de un mockup estático. Pedido explícito para mostrar el flujo completo de la pantalla sin implementar un juego real.
- **Sí:** sesión de usuario simulada (login/logout/invitado) mediante Context + `localStorage`. Necesaria para reflejar el estado "con sesión" en el `Nav` y la fila "tu mejor marca" del Salón de la Fama.
- **No:** autenticación real con backend u OAuth. Fuera de alcance de un MVP puramente visual.
- **Sí:** persistencia en `localStorage` tanto para la sesión como para los puntajes guardados. Consistente con el template original (`av_user`, `av_scores`) y da una demo más completa entre recargas.
- **No:** persistencia solo en memoria. Se descartó porque resetear todo el estado en cada refresh degrada la demo.
- **Sí:** componentes compartidos en `components/` y datos mock en `data/`, ambos en la raíz del proyecto. Convención común en Next.js, aprovecha el alias `@/*` ya configurado.
- **No:** `app/_components/` y `app/_data/`. Se descartó a favor de la convención más estándar y más simple de navegar.
- **Sí:** mantener los covers de juego generados con CSS puro (sin imágenes). Ya está todo el CSS necesario portado en `globals.css`; cero assets nuevos que gestionar.
- **No:** imágenes reales de portada. Fuera de alcance de portar el template tal cual.
- **Sí:** contador de créditos del `Nav` como valor fijo decorativo ("CRÉDITOS · 03"). Es puramente decorativo en el template; no existe lógica de créditos en ningún otro lugar del sistema.
- **Sí:** identificadores de código (rutas, nombres de archivo, componentes, variables, claves de datos/localStorage) en inglés; todo el copy visible en la UI se mantiene en español. Pedido explícito del usuario; conserva el contenido igual al template de referencia.
- **Sí:** las 5 pantallas se cubren en un único spec. Comparten `Nav`, datos mock y el mismo lenguaje visual; dividirlas habría generado specs con dependencias cruzadas fuertes.

## Risks

| Riesgo                                                                 | Mitigación                                                                                                    |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `localStorage` no disponible (modo privado/incógnito o SSR)             | Los helpers de `lib/session.ts` y `lib/saved-scores.ts` deben envolver acceso a `localStorage` en try/catch y devolver estado vacío si falla; la app sigue siendo usable, solo sin persistencia. |
| APIs de Next.js 16 distintas a las recordadas de versiones anteriores   | Consultar `node_modules/next/dist/docs/01-app/` antes de escribir cada ruta/layout, según indica `AGENTS.md`/`CLAUDE.md`. |
| Desincronización de sesión entre pestañas/rutas al usar Context en vez de recargar página | El `SessionProvider` lee el estado inicial de `localStorage` al montar; no se requiere sincronía entre pestañas para este MVP (fuera de alcance). |

## What is **not** in this spec

- Lógica real de cualquier juego (Bloque Buster, Caída, Serpentina, Gloton, Invasores, Rocas, Ranaria, Duelo Pixel).
- Autenticación real (backend, tokens, OAuth con Google/GitHub).
- Persistencia en servidor o base de datos.
- Sistema de créditos/monedas funcional.
- Imágenes o assets de portada reales.
- Internacionalización (i18n) o cambio de idioma en la UI.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.

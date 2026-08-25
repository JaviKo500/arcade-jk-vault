# SPEC 02 — Home landing y navegación

> **Estado:** Approved · **Depende de:** `01-mvp-visual-screens` (rutas `/`, `/games/[id]`, `/auth`, `/leaderboard`, `Nav`, sesión ya implementados) · **Fecha:** 2026-08-24
> **Objetivo:** Portar la nueva landing `home.jsx` como la ruta `/`, actualizar `Nav` al layout de 4 links (`nav.jsx`: Inicio, Biblioteca, Salón de la Fama, Acerca de), mover el catálogo actual de Biblioteca de `/` a `/games`, y crear una ruta `/about` mínima tipo placeholder para que el link "Acerca de" funcione sin implementar el contenido completo de `about.jsx`.

## Scope

**Incluye:**

- Ruta `/` — nueva pantalla Home (landing): hero con silhouettes flotantes decorativos, sección "¿Por qué Arcade Vault?" (4 feature cards), preview de juegos (6 tarjetas mini desde `GAMES`), sección de stats, sección "Actividad en vivo" (ticker de puntuaciones recientes + top jugadores del día), sección de precios (plan único gratis + FAQ), CTA final.
- Ruta `/games` — el catálogo Biblioteca que hoy vive en `/` (hero, buscador, chips de categoría, grid de tarjetas, estado "sin resultados") se mueve tal cual a esta ruta, sin cambios de comportamiento.
- Ruta `/about` — placeholder mínimo (mensaje tipo "Próximamente", con el layout global de la app) para que el link "Acerca de" del nav no rompa. No se porta el contenido de `about.jsx` (hero de misión, highlights, formulario de contacto).
- `Nav` actualizado al layout de 4 links de `nav.jsx`: Inicio (→ `/`), Biblioteca (→ `/games`, activo también en `/games/[id]` y `/games/[id]/play`), Salón de la Fama (→ `/leaderboard`), Acerca de (→ `/about`). Logo apunta a `/`. Se mantiene el botón de sesión (Iniciar Sesión / nombre de usuario) y el contador de créditos fijo, igual que hoy.
- Efecto "reveal on scroll" (`IntersectionObserver` sobre `.reveal`) portado como hook reutilizable para animar las secciones de Home al hacer scroll.
- Silhouettes decorativos, iconos de features (`FeatureIcon`) y tarjeta mini de juego (`MiniCard`) como componentes de presentación de Home.
- Datos mock propios de Home (ticker de actividad reciente y top jugadores del día) portados tal cual del template como un módulo de datos estático nuevo, sin relación con `generateMockScores`.
- Estilos CSS específicos de Home (`home-*`, `mini-*`, `feature-*`, `activity-*`, `pricing-*`, `stat-*`, `top-*`, `tick-*`, `final-*`) portados desde `references/templates/home-about/styles.css` a `app/globals.css`, reutilizando clases/tokens ya existentes (`.btn`, `.pixel`, `.reveal`, `.fade-in`, `neon-*`, `.cover-bg`) sin duplicarlos.
- Actualizar cualquier enlace interno existente que apunte a `/` esperando el catálogo (por ejemplo el botón "Volver al vault" en `/games/[id]`) para que apunte a `/games`.

**Fuera de alcance (para futuros specs):**

- Contenido completo de `about.jsx` (misión, highlights, formulario de contacto funcional) — solo el placeholder de `/about`.
- Cualquier lógica real detrás del ticker de actividad o el top de jugadores (websockets, datos en vivo) — siguen siendo datos estáticos decorativos.
- Cambios al sistema de créditos, precios reales o cobros — la sección de precios es puramente visual/decorativa, igual que en el template.
- Tests automatizados (no hay test script configurado en el proyecto).

## Data model

```ts
// data/home-activity.ts
export type ActivityAccent = "cyan" | "magenta" | "yellow" | "green";

export type RecentScoreEntry = {
  player: string;
  game: string;
  score: number;
  timeAgo: string;      // ya formateado, ej. "hace 2 min"
  accent: ActivityAccent;
};

export type TopPlayerToday = {
  rank: number;
  player: string;
  score: number;
};

export const RECENT_SCORES: RecentScoreEntry[]; // 7 entradas, port 1:1 desde home.jsx
export const TOP_PLAYERS_TODAY: TopPlayerToday[]; // 5 entradas, port 1:1 desde home.jsx
```

```ts
// hooks/use-reveal.ts
export function useReveal(): void;
// Registra un IntersectionObserver sobre document.querySelectorAll(".reveal")
// y agrega la clase "in" al entrar en viewport (threshold 0.12), igual que en home.jsx/about.jsx.
```

No se modifican `data/games.ts` ni `data/leaderboard.ts` — Home solo lee `GAMES` (primeras 6 vía `.slice(0, 6)`) para la sección de preview de juegos.

Convenciones:

- `MiniCard` (mini-tarjeta de preview) recibe un `Game` de `data/games.ts` y navega a `/games/${game.id}` — es un componente nuevo (`components/mini-game-card.tsx`), distinto de `GameCard` porque usa el layout visual `.mini-card` (más compacto) en vez de `.card`.
- `RECENT_SCORES` y `TOP_PLAYERS_TODAY` son datos estáticos fijos (no generados dinámicamente), igual que en el template original — no dependen de `localStorage` ni de sesión.

## Implementation plan

1. Mover el contenido actual de `app/page.tsx` (Biblioteca) a `app/games/page.tsx` sin cambios de comportamiento (búsqueda, chips, grid, estado vacío).
2. Actualizar los enlaces existentes que apuntaban a `/` esperando el catálogo — ej. "Volver al vault" en `app/games/[id]/page.tsx` — para que apunten a `/games`.
3. Crear `data/home-activity.ts` con `RECENT_SCORES` y `TOP_PLAYERS_TODAY`, portados 1:1 desde los arrays hardcodeados de `home.jsx`.
4. Crear `hooks/use-reveal.ts` portando el hook `useReveal` (IntersectionObserver sobre `.reveal`, clase `in` al entrar en viewport).
5. Crear `components/mini-game-card.tsx` (puerto de `MiniCard`), recibe un `Game` y navega a `/games/[id]` con `next/link`.
6. Portar a `app/globals.css` los estilos específicos de Home desde `references/templates/home-about/styles.css` (`home-*`, `mini-*`, `feature-*`, `activity-*`, `pricing-*`, `stat-*`, `top-*`, `tick-*`, `final-*`), reutilizando clases/tokens ya existentes sin duplicarlos.
7. Crear el nuevo `app/page.tsx` con el contenido de Home: hero + `FloatingSilhouettes`, sección de features con `FeatureIcon`, preview de juegos con `MiniCard` (`GAMES.slice(0, 6)`), sección de stats, sección de actividad (ticker con `RECENT_SCORES`, top jugadores con `TOP_PLAYERS_TODAY`), sección de precios + FAQ, CTA final; usa `useReveal` y navega con `next/link` a `/games`, `/auth`, `/leaderboard` y `/games/[id]`.
8. Actualizar `components/nav.tsx` al layout de 4 links de `nav.jsx`: Inicio (`/`), Biblioteca (`/games`, activo también en `/games/[id]` y `/games/[id]/play`), Salón de la Fama (`/leaderboard`), Acerca de (`/about`); logo apunta a `/`; se conserva el botón de sesión y el contador de créditos.
9. Crear `app/about/page.tsx` como placeholder mínimo ("Próximamente" o similar), dentro del layout global existente.
10. Pasada final: verificar navegación completa (Inicio, Biblioteca, Salón de la Fama, Acerca de, sesión) en desktop y menú móvil, breakpoints responsive de Home, y que `/games` conserva intacto el comportamiento de búsqueda/filtro/estado vacío.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

- [ ] `next dev` levanta el proyecto sin errores en consola en `/`, `/games`, `/games/[id]`, `/games/[id]/play`, `/auth`, `/leaderboard` y `/about`.
- [ ] La ruta `/` muestra la nueva pantalla Home: hero con silhouettes flotantes, sección de features (4 tarjetas), preview de 6 juegos, sección de stats, sección de actividad (ticker + top jugadores), sección de precios con FAQ, y CTA final.
- [ ] Las secciones de Home marcadas `reveal` se animan (agregan la clase `in`) al hacer scroll hasta que entran en el viewport.
- [ ] Cada mini-tarjeta de juego en el preview de Home navega a `/games/[id]` con el `id` correcto al hacer click.
- [ ] Los botones de CTA de Home ("Explorar juegos", CTA final) navegan a `/games`; el botón "Crear cuenta" navega a `/auth`; el link "Ver salón" de la sección de actividad navega a `/leaderboard`.
- [ ] La ruta `/games` muestra el catálogo Biblioteca con el mismo comportamiento que antes (buscador filtra en tiempo real, chips filtran por categoría, estado "sin resultados" cuando no hay coincidencias).
- [ ] El botón "Volver al vault" en `/games/[id]` navega a `/games` (ya no a `/`).
- [ ] El `Nav` muestra 4 links (Inicio, Biblioteca, Salón de la Fama, Acerca de) en desktop y en el menú móvil; el logo navega a `/`.
- [ ] El `Nav` resalta "Inicio" como activo solo en `/`; resalta "Biblioteca" como activo en `/games`, `/games/[id]` y `/games/[id]/play`; resalta "Salón de la Fama" en `/leaderboard`; resalta "Acerca de" en `/about`.
- [ ] El link "Acerca de" navega a `/about`, que muestra un placeholder simple dentro del layout global (nav y footer visibles), sin error de consola ni 404.
- [ ] El botón de sesión del `Nav` (Iniciar Sesión / nombre de usuario · cerrar sesión) sigue funcionando igual que antes en todas las rutas.
- [ ] Todas las secciones de Home son usables en un viewport móvil (≤ 480px de ancho) sin overflow horizontal.

## Decisions

- **Sí:** `/` pasa a ser la nueva landing Home (`home.jsx`) y el catálogo Biblioteca se mueve a `/games`. Es la estructura que sigue el `nav.jsx` nuevo (logo → home, "Inicio" y "Biblioteca" como links separados); mantener Biblioteca en `/` habría contradicho ese diseño.
- **No:** dejar `/` como Biblioteca y meter Home en una ruta secundaria (ej. `/home`). Se descartó por ser menos fiel al template y por generar una raíz `/` que no coincide con lo que el propio nav asume.
- **Sí:** Biblioteca se mueve a `/games` (no `/library`). Coherente con el namespace ya existente `/games/[id]` y `/games/[id]/play`.
- **Sí:** crear `/about` como placeholder mínimo en vez de dejar el link sin ruta. Evita un link roto (404) en el nav sin comprometerse a portar el contenido completo de `about.jsx`.
- **No:** portar `about.jsx` completo (misión, highlights, formulario de contacto) en este spec. Pedido explícito del usuario — queda para un spec futuro.
- **Sí:** datos del ticker de actividad y top jugadores de Home como módulo estático propio (`data/home-activity.ts`), sin relación con `generateMockScores`. Sus formas de datos no coinciden y mezclarlos habría complicado ambos sin necesidad real.
- **Sí:** `useReveal` como hook reutilizable en `hooks/use-reveal.ts` en vez de código duplicado dentro de `app/page.tsx`. Sigue existiendo el mismo patrón en `about.jsx` (fuera de alcance hoy), así queda listo para reutilizarse cuando se implemente esa spec.
- **Sí:** `MiniCard` como componente nuevo `components/mini-game-card.tsx`, distinto de `GameCard` existente. Usa una clase CSS distinta (`.mini-card` vs `.card`) y un layout más compacto; forzarlo dentro de `GameCard` con props condicionales habría complicado un componente que hoy es simple.
- **Sí:** estilos de Home portados directamente a `app/globals.css` (mismo archivo que ya centraliza todo el CSS del proyecto), reutilizando clases utilitarias existentes (`.btn`, `.pixel`, `.reveal`, `neon-*`, `.cover-bg`) en vez de duplicarlas.
- **Sí:** identificadores de código en inglés, copy visible en español — mismo criterio que spec 01.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Otros lugares del código (fuera de los ya identificados) siguen asumiendo que `/` es el catálogo Biblioteca | Buscar todas las referencias a `Link href="/"` y a `navigate`/`router.push("/")` en el proyecto antes de dar el paso 2 por cerrado, no solo el botón "Volver al vault" ya detectado. |
| Colisión de nombres de clases CSS entre los estilos nuevos de Home (`home-*`, `stat-*`, etc.) y clases ya existentes en `globals.css` | Antes de portar el bloque de estilos, diffear contra las clases ya presentes en `globals.css` y no duplicar/sobreescribir selectores compartidos (`.btn`, `.pixel`, `neon-*`). |
| APIs de Next.js 16 distintas a las recordadas de versiones anteriores, especialmente al mover `page.tsx` de `/` a `/games` (rutas, metadata, tipos generados `PageProps`/`LayoutProps`) | Consultar `node_modules/next/dist/docs/01-app/` antes de escribir cada ruta nueva o movida, según indica `AGENTS.md`/`CLAUDE.md`. |

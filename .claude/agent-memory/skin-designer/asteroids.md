---
name: asteroids-skins
description: Auditoría 2026-11-17 de ASTEROIDS (primer juego con skins) y contrato de skins que fijó para el resto de motores
metadata:
  type: project
---

**2026-11-17 · `asteroids` (ASTEROIDS)** — no tenía skins; añadidas `classic`, `neon`, `retro`. Sin fallos de contraste en `classic` (sin cambios de color).

- Peor ratio: classic 5.15 (thrust/partícula `#ff006e`), neon 6.18 (asteroide `#ff2bd6` vs `--bg`), retro 4.74 (asteroide `#83769c` vs `--bg`).
- classic tiene roles con luminancia casi igual (cian/blanco/amarillo/verde, ratios 1.0–1.24); se distinguen por tono y no se tocó porque classic conserva la paleta.
- Neon: nave cian, rocas magenta, balas blancas, power-up amarillo, fondo `#07020f`, glow ×1.75. Retro: subconjunto PICO-8 sobre negro, glow 0.
- Cambio técnico: las partículas pasaron de `rgba(${rgb},a)` a `globalAlpha` + hex (mismo resultado visual).

**Contrato fijado (reutilizar tal cual en los siguientes juegos):**

- `types.ts`: `SkinId`, `GameInstance.setSkin?`, `GameEngine.skins?: readonly SkinId[]`.
- `constants.ts`: `type <Name>Palette` (roles + `glow` multiplicador de `shadowBlur`), `SKINS`, `DEFAULT_SKIN`, `COLORS = SKINS[DEFAULT_SKIN]` como alias.
- `engine.ts`: `let colors = SKINS[DEFAULT_SKIN]`; `setSkin` solo reasigna `colors`. Entidades reciben `colors` por parámetro.
- `registry.ts`: `skins: ["classic", "neon", "retro"]`.
- UI: `.skin-picker` en `GamePlayer` entre HUD y CRT (botones `role="radio"`, swatch por skin `.skin-<id> .skin-swatch` en `globals.css`; el botón hace `blur()` para que Espacio siga disparando). Para un juego nuevo solo hay que añadir sus paletas y la clave `skins` en el registro; los swatches CSS son genéricos (colores de asteroids).
- Persistencia: `lib/skin-preference.ts` (`getSkinPreference(gameId, skins)` / `setSkinPreference`), restaurada en `onInstance`.

**Ojo:** el hook PostToolUse reformatea **todo** `app/globals.css` con Prettier si se edita con Edit/Write (diff de ~2900 líneas). Insertar CSS con Bash (`sed`) para no tocar el resto. `npm run lint` falla por errores previos en `references/` (no es código de la app); `npx eslint app components lib hooks data` sale limpio.

Archivos: `lib/games/asteroids/{constants,entities,engine}.ts`, `lib/games/types.ts`, `lib/games/registry.ts`, `lib/skin-preference.ts`, `components/game-player.tsx`, `app/globals.css`, `.claude/skills/add-game/platform-contract.md`, `references/game-skins.md`.

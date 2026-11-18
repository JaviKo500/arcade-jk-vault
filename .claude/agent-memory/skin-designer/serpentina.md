---
name: serpentina-skins
description: Auditoría 2026-11-17 de SERPENTINA (Snake): 0→3 skins reutilizando el contrato de asteroids, paletas y ratios
metadata:
  type: project
---

**2026-11-17 · `serpentina` (SERPENTINA)** — no tenía skins; añadidas `classic`, `neon`, `retro` con el contrato de [[asteroids-skins]] sin tocarlo. Sin fallos de contraste en `classic`.

- Roles: background, grid (rgba decorativa), head, bodyFrom/bodyTo (degradado `#rrggbb` que interpola `mixHex`), dead (parpadeo tras choque), fruitFallback (solo si `fruits.png` no carga), text, textDim, glow.
- Peor ratio: classic 5.15 (`#ff006e`), neon 6.41 (cola `#ff2bd6`), retro 4.58 (cola `#008751`, 4.31 vs `--bg`).
- Neon: serpiente cian→magenta, rejilla magenta, destello/texto amarillo, fondo `#07020f`, glow ×1.75. Retro: PICO-8 (verdes `#00e436`→`#008751`, choque `#ff004d`, fruta de respaldo azul `#29adff` para no depender de rojo/verde), glow 0.
- Frutas = sprites, no se recolorean. Los ojos usan `background` de la skin.
- Las funciones de `entities.ts` reciben `colors` por parámetro; `text()` del motor multiplica su glow por `colors.glow`.

Archivos: `lib/games/serpentina/{constants,entities,engine}.ts`, `lib/games/registry.ts` (solo la entrada `serpentina`), `references/game-skins.md`.

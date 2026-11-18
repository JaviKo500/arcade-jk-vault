---
name: caida-skins
description: Auditoría 2026-11-17 de CAÍDA (Tetris): 0→3 skins con el contrato de asteroids, marcas por pieza para daltonismo, paletas y ratios
metadata:
  type: project
---

**2026-11-17 · `caida` (CAÍDA)** — no tenía skins; añadidas `classic`, `neon`, `retro` reutilizando el contrato de [[asteroids-skins]] sin tocarlo. Registro conserva `hasLives: false`.

- Peor ratio: classic 3.79 (T `#aa00ff` vs pozo `#0e0e18`, original, pasa), neon 5.50 (T `#c64bff`), retro 4.74 (J `#83769c` vs `--bg`). Textos ≥ 5.04.
- 8 piezas (incluye la tuerca N). Búsqueda exhaustiva: ni con PICO-8 ni con neón se separan los 28 pares en deutan/protan (ΔE mín. ~17–23). Solución: campo `marks` (`plain`/`dot`/`frame`) + `mark` (color) en la paleta; neon/retro usan lisa I,O,T,L · punto S,Z · marco J,N. Classic todo `plain` (conserva el aspecto; T/J casi iguales en deuteranopia, aceptado).
- Otros campos extra: `well`, `highlight`+`highlightAlpha` (retro 0 = plano), `ghostAlpha` (0.2/0.25/0.35), `keycap`.
- `drawBlock(ctx, colors, ...)` recibe la paleta. Sin build (lo hizo el usuario: había dev server); verificado con `npx tsc --noEmit` y `npx eslint`.
- Script útil de contraste + simulación Machado deutan/protan + ΔE: reescribirlo si hace falta (no se guarda).

Archivos: `lib/games/caida/{constants,entities,engine}.ts`, `lib/games/registry.ts`, `references/game-skins.md`.

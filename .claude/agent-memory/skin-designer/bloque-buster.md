---
name: bloque-buster-skins
description: Auditoría 2026-11-17 de BLOQUE BUSTER (Arkanoid): 0→3 skins con el contrato de asteroids, paletas y ratios
metadata:
  type: project
---

**2026-11-17 · `bloque-buster` (BLOQUE BUSTER)** — no tenía skins; añadidas `classic`, `neon`, `retro` reutilizando el contrato de [[asteroids-skins]] sin tocarlo.

- Peor ratio: classic 3.91 (bloque violeta `#aa00ff`, original, pasa ≥3), neon 5.50 (bloque `#c64bff` vs `--bg`), retro 4.74 (bloque lavanda `#83769c` vs `--bg`). Textos en canvas ≥ 5.04.
- Paleta extra respecto a asteroids: `blockFill` (alpha del interior del bloque; retro = 1, bloques macizos 8-bit) y `highlight` (reflejo/filo/chispas, antes `#fff`/`rgba(255,255,255,a)` → ahora hex + `globalAlpha`). `textDim` eliminado (no se usaba).
- Neon: fondo `#07020f`, pala cian, pelota blanca con glow magenta, título magenta, texto amarillo, glow ×1.75. Retro: PICO-8 sobre negro, pala roja `#ff004d`, naranja `#ff6c24` (en vez de `#ffa300`, que se confundía con el verde: 1.16).
- Pares de bloques con luminancia casi igual se distinguen por tono (cian/verde, verde/gris retro); los colores de bloque los fija la fila del nivel.

Archivos: `lib/games/bloque-buster/{constants,entities,engine,levels}.ts`, `lib/games/registry.ts`, `references/game-skins.md`.

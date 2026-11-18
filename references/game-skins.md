# Skins de juegos — Arcade Vault

Estado de las skins (temas) de cada juego con motor. Cada juego debe tener al menos 3 skins: **CLÁSICO** (`classic`, por defecto), **NEÓN** (`neon`) y **RETRO** (`retro`), y todas deben pasar la verificación en modo oscuro (contraste WCAG sobre `--bg: #0a0a0f`: ≥ 3:1 elementos de juego, ≥ 4.5:1 texto en canvas).

Lo mantiene el subagente `skin-designer` (`.claude/agents/skin-designer.md`). La skin elegida se guarda en `localStorage` por juego con la clave `arcade-vault:skin:<gameId>`.

Leyenda: ✅ implementada y verificada · ⚠️ implementada con fallos de contraste · ❌ falta

## Estado

| ID              | Título        | CLÁSICO | NEÓN | RETRO | Modo oscuro              | Última revisión |
| --------------- | ------------- | ------- | ---- | ----- | ------------------------ | --------------- |
| `asteroids`     | ASTEROIDS     | ✅      | ✅   | ✅    | OK · peor 4.74 (retro)   | 2026-11-17      |
| `bloque-buster` | BLOQUE BUSTER | ✅      | ✅   | ✅    | OK · peor 3.91 (clásico) | 2026-11-17      |
| `caida`         | CAÍDA         | ✅      | ✅   | ✅    | OK · peor 3.79 (clásico) | 2026-11-17      |
| `serpentina`    | SERPENTINA    | ✅      | ✅   | ✅    | OK · peor 4.58 (retro)   | 2026-11-17      |

## Notas (2026-11-16)

- Ningún juego tiene skins: cada motor usa una única paleta `COLORS` en `lib/games/<id>/constants.ts`, que será la base de la skin `classic`.
- Aún no existe el contrato de skins (`SkinId`, `setSkin`, selector en `GamePlayer`); lo define el primer juego que pase por `skin-designer`.
- Para añadir las skins a un juego: invocar `skin-designer` con su `id` o nombre.

## Notas (2026-11-17) — contrato de skins (definido por `asteroids`)

- `lib/games/types.ts`: `SkinId = "classic" | "neon" | "retro"`, `GameInstance.setSkin?(skin)` (cambia la paleta en caliente, sin reiniciar ni tocar la puntuación) y `GameEngine.skins?: readonly SkinId[]`.
- `lib/games/<id>/constants.ts`: `type <Name>Palette` (un campo por rol + `glow`, multiplicador de `shadowBlur`), `SKINS: Record<SkinId, <Name>Palette>`, `DEFAULT_SKIN = "classic"`.
- `lib/games/registry.ts`: el juego declara `skins: ["classic", "neon", "retro"]`.
- `components/game-player.tsx`: selector CLÁSICO / NEÓN / RETRO (`.skin-picker`) entre el HUD y el CRT, solo si el motor declara `skins`.
- Persistencia: `lib/skin-preference.ts` (`getSkinPreference` / `setSkinPreference`), clave `arcade-vault:skin:<gameId>`, restaurada al montar el motor.
- ASTEROIDS — peor ratio por skin: CLÁSICO 5.15 · NEÓN 6.18 · RETRO 4.74 (umbral ≥ 3:1 elementos, ≥ 4.5:1 texto).

## Notas (2026-11-17) — SERPENTINA

- Reutiliza el contrato de `asteroids` sin cambios: `SerpentinaPalette` + `SKINS` en `lib/games/serpentina/constants.ts`, `setSkin` en el motor y `skins` en el registro.
- Peor ratio por skin (vs fondo de la skin): CLÁSICO 5.15 (destello/fruta de respaldo `#ff006e`) · NEÓN 6.41 (cola `#ff2bd6`) · RETRO 4.58 (cola `#008751`; 4.31 vs `--bg`).
- Las frutas son sprites de `fruits.png` y no se recolorean en ninguna skin.

## Notas (2026-11-17) — BLOQUE BUSTER

- Reutiliza el contrato de `asteroids` sin cambios: `BloqueBusterPalette` + `SKINS` en `lib/games/bloque-buster/constants.ts` (añade `blockFill`, opacidad del interior de los bloques: 1 = macizo en RETRO), `setSkin` en el motor y `skins` en el registro.
- Peor ratio por skin: CLÁSICO 3.91 (bloque violeta `#aa00ff`, paleta original sin cambios) · NEÓN 5.50 (bloque `#c64bff` vs `--bg`) · RETRO 4.74 (bloque lavanda `#83769c` vs `--bg`).
- Los 7 colores de bloque se distinguen por tono; algunos pares tienen luminancia casi igual (p. ej. cian/verde en CLÁSICO y NEÓN, verde/gris en RETRO).

## Notas (2026-11-17) — CAÍDA

- Reutiliza el contrato de `asteroids` sin cambios: `CaidaPalette` + `SKINS` en `lib/games/caida/constants.ts`, `setSkin` en el motor y `skins` en el registro (conserva `hasLives: false`).
- Peor ratio por skin (vs pozo de la skin y vs `--bg`): CLÁSICO 3.79 (T violeta `#aa00ff`, paleta original sin cambios) · NEÓN 5.50 (T `#c64bff` vs `--bg`) · RETRO 4.74 (J lavanda `#83769c` vs `--bg`). Textos en canvas ≥ 5.04.
- Las 8 piezas (I, O, T, S, Z, J, L y la tuerca N) no se pueden separar solo por color en todos los tipos de daltonismo (ΔE mínimo óptimo ~17–23). NEÓN y RETRO añaden una **marca interior** por pieza (`marks`: lisa I/O/T/L · punto S/Z · marco J/N, estilo bloques de NES) para que los pares conflictivos (T/J/Z, I/N, O/S, S/L) queden en grupos distintos. CLÁSICO conserva bloques lisos (en deuteranopia T/J se parecen; se distinguen por forma).
- Pieza fantasma: opacidad por skin (`ghostAlpha`: 0.2 / 0.25 / 0.35), guía decorativa; siempre ≥ 3.3:1 frente a la pieza sólida del mismo color, para que no se confunda con bloques fijados.
- RETRO: bloques planos (`highlightAlpha: 0`), sin glow, pozo negro con rejilla azul PICO-8.

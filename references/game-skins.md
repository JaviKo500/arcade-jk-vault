# Skins de juegos — Arcade Vault

Estado de las skins (temas) de cada juego con motor. Cada juego debe tener al menos 3 skins: **CLÁSICO** (`classic`, por defecto), **NEÓN** (`neon`) y **RETRO** (`retro`), y todas deben pasar la verificación en modo oscuro (contraste WCAG sobre `--bg: #0a0a0f`: ≥ 3:1 elementos de juego, ≥ 4.5:1 texto en canvas).

Lo mantiene el subagente `skin-designer` (`.claude/agents/skin-designer.md`). La skin elegida se guarda en `localStorage` por juego con la clave `arcade-vault:skin:<gameId>`.

Leyenda: ✅ implementada y verificada · ⚠️ implementada con fallos de contraste · ❌ falta

## Estado

| ID              | Título        | CLÁSICO | NEÓN | RETRO | Modo oscuro   | Última revisión |
| --------------- | ------------- | ------- | ---- | ----- | ------------- | --------------- |
| `asteroids`     | ASTEROIDS     | ❌      | ❌   | ❌    | Sin verificar | —               |
| `bloque-buster` | BLOQUE BUSTER | ❌      | ❌   | ❌    | Sin verificar | —               |
| `caida`         | CAÍDA         | ❌      | ❌   | ❌    | Sin verificar | —               |
| `serpentina`    | SERPENTINA    | ❌      | ❌   | ❌    | Sin verificar | —               |

## Notas (2026-11-16)

- Ningún juego tiene skins: cada motor usa una única paleta `COLORS` en `lib/games/<id>/constants.ts`, que será la base de la skin `classic`.
- Aún no existe el contrato de skins (`SkinId`, `setSkin`, selector en `GamePlayer`); lo define el primer juego que pase por `skin-designer`.
- Para añadir las skins a un juego: invocar `skin-designer` con su `id` o nombre.

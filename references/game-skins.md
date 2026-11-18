# Skins de juegos — Arcade Vault

Estado de las skins (temas) de cada juego con motor. Cada juego debe tener al menos 3 skins: **CLÁSICO** (`classic`, por defecto), **NEÓN** (`neon`) y **RETRO** (`retro`), y todas deben pasar la verificación en modo oscuro (contraste WCAG sobre `--bg: #0a0a0f`: ≥ 3:1 elementos de juego, ≥ 4.5:1 texto en canvas).

Lo mantiene el subagente `skin-designer` (`.claude/agents/skin-designer.md`). La skin elegida se guarda en `localStorage` por juego con la clave `arcade-vault:skin:<gameId>`.

Leyenda: ✅ implementada y verificada · ⚠️ implementada con fallos de contraste · ❌ falta

## Estado

| ID              | Título        | CLÁSICO | NEÓN | RETRO | Modo oscuro            | Última revisión |
| --------------- | ------------- | ------- | ---- | ----- | ---------------------- | --------------- |
| `asteroids`     | ASTEROIDS     | ✅      | ✅   | ✅    | OK · peor 4.74 (retro) | 2026-11-17      |
| `bloque-buster` | BLOQUE BUSTER | ❌      | ❌   | ❌    | Sin verificar          | —               |
| `caida`         | CAÍDA         | ❌      | ❌   | ❌    | Sin verificar          | —               |
| `serpentina`    | SERPENTINA    | ❌      | ❌   | ❌    | Sin verificar          | —               |

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

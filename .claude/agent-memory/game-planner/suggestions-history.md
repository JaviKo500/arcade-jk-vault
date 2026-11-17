---
name: suggestions-history
description: Historial de rondas del game-planner — juego elegido, spec, alternativas descartadas y por qué; consultar antes de proponer para no repetir
metadata:
  type: project
---

Rondas de sugerencias (el estado vivo está en `references/game-suggestions-todo.md`; verificar ahí y en `lib/games/registry.ts`).

- **2026-11-16** — Recomendado `invasores` (INVASORES, SHOOTER, green). Se redactó una SPEC 10 en Draft pero el usuario la descartó: de momento solo se planifica, la implementación se hará de otra manera. No redactar specs salvo que se pida explícitamente. Placeholder sin motor, original (enemigos scout/drone/grunt, sonda, escudos), oleadas infinitas, sin cambios de contrato.
  - Alternativa `duelo-pixel` (VERSUS, cyan): puntuación vs CPU poco comparable + brecha multijugador.
  - Alternativa `gloton` (ARCADE, yellow): la más costosa (laberinto + 4 IAs) y ARCADE ya tenía 2 motores.

**Why:** evitar repetir sugerencias y saber qué huecos quedan.
**How to apply:** tras esta ronda, quedan sin motor `gloton`, `ranaria`, `duelo-pixel` y `rocas`; `references/started-games/` ya está agotado (asteroids, tetris, arkanoid portados). No re-sugerir alternativas pendientes salvo que el usuario las rescate; si siguen en Sugeridos sin decisión, se pueden reconsiderar como candidatas. Ver [[catalog-criteria]].

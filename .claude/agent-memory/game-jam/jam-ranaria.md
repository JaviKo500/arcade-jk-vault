---
name: jam-ranaria
description: Jam 2026-11-16 — RANARIA (cruce de tráfico y río, 5 nidos), id ranaria reutilizando placeholder; 3 specs en specs/game-jam/ranaria/ y supuestos tomados
metadata:
  type: project
---

Jam 2026-11-16: el usuario pidió **Ranaria** ("anfibio neón cruza carriles de tráfico y un río con plataformas hasta llenar 5 nidos, con tiempo por ronda"), id sugerido `ranaria`, diseño original sin recrear juegos comerciales.

- Definición: `ranaria`, RANARIA, ARCADE, `green`, placeholder reutilizado (migración `update`, `sort_order = 8` sin cambios), portada nueva `cover-ranaria` (se elimina `cover-rana`).
- Specs: `01-ranaria-game.md` (base: rejilla 20×15 de 40 px, 5 carriles carretera + 5 río, 30 s/ronda, 3 vidas, +10/fila nueva, nido 50+10×s, +1.000 por nivel, velocidad ×1,15/nivel tope ×2,05), `02-ranaria-niveles-y-peligros.md` (5 tramos en `levels.ts` en bucle ×1,2/vuelta tope ×1,8, medusas que se sumergen, dron en la mediana, nidos sellados), `03-ranaria-bonus-y-sonido.md` (luciérnaga +200, cría +200, racha ×3, vida extra a 10.000, sonido Web Audio sintetizado).
- Supuestos principales: ronda = cada intento de la rana; partida determinista sin `Math.random` (ranking comparable); se conservan scores de la simulación en `ranaria`; barra de TIEMPO y nombre de tramo dibujados en canvas como indicadores de mecánica.

**Why:** registro de ids usados y criterios aplicados para no repetir carpeta ni contradecir decisiones en jams futuras.
**How to apply:** no reutilizar `specs/game-jam/ranaria/`; si se pide otra ampliación de RANARIA, partir de estas 3 specs. Patrón reutilizable: placeholder del seed → `update` + portada `cover-<id>` nueva. Preferencia del usuario observada: diseño original con estética neón propia (ver [[user-preferences]] cuando exista).

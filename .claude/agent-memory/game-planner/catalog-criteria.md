---
name: catalog-criteria
description: Criterios aprendidos del catálogo de Arcade Vault para elegir juegos — preferir placeholders sin motor, sin cambios de contrato, puntuación determinista
metadata:
  type: project
---

Criterios que han guiado las elecciones (sin feedback explícito del usuario todavía):

- Preferir dar motor a un placeholder del seed (`gloton`, `ranaria`, `duelo-pixel`, `rocas`) antes que crear filas nuevas: conserva id, URL y sort_order. Todas las specs 07–09 lo hicieron así y el usuario lo aceptó.
- `rocas` es mecánicamente igual que `asteroids` (SPEC 05 los separó a propósito): baja prioridad salvo que se le dé un giro propio.
- VERSUS (`duelo-pixel`) choca con el guardado de un solo `player_name`; requiere decidir qué puntuación se guarda.
- Puntuación base × nivel y aleatoriedad mínima en lo que puntúa → leaderboard comparable. Tope `MAX_SCORE = 10_000_000` si el juego no tiene fin.
- `platform-contract.md` del skill está desfasado respecto a la SPEC 07 (`GameEngine`/`hasLives`); mandar el código.

**Why:** el usuario valora integrar juegos sin tocar la plataforma y con leaderboard justo.
**How to apply:** puntuar alto "encaje con contrato" y "competitividad"; anotar supuestos en Decisions. Ver [[suggestions-history]].

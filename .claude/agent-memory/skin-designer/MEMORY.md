# Memoria del agente skin-designer

Índice de auditorías de skins. Una línea por juego: fecha, `id`, skins encontradas/faltantes.

## Estado

- La plataforma solo tiene tema oscuro (`--bg: #0a0a0f` en `app/globals.css`).
- El agente implementa directamente en el código (sin spec), por petición del usuario (2026-11-16).
- Contrato de skins definido por `asteroids` (2026-11-17); los demás juegos lo reutilizan: ver [asteroids.md](asteroids.md).

## Convenciones

- Skins mínimas: `classic` (por defecto, paleta actual), `neon`, `retro`.
- La skin elegida se guarda en `localStorage` por juego (clave `arcade-vault:skin:<gameId>`) y se restaura al abrir el juego; valor inválido o ausente → `classic`. Pedido explícito del usuario (2026-11-16).
- No editar `app/globals.css` con Edit/Write (el hook lo reformatea entero); insertar con Bash.

## Auditorías

- [asteroids](asteroids.md) — 2026-11-17 · 0→3 skins (classic/neon/retro), primer juego, define el contrato; sin fallos de contraste.
- Pendientes: `bloque-buster`, `caida`, `serpentina` (sin skins).

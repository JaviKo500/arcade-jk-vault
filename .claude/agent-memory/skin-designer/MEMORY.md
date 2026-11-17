# Memoria del agente skin-designer

Índice de auditorías de skins. Una línea por juego: fecha, `id`, skins encontradas/faltantes, spec creada.

## Estado inicial (2026-11-16)

- Ningún juego tiene skins: los motores (`asteroids`, `caida`, `bloque-buster`, `serpentina`) usan una única paleta `COLORS` en `lib/games/<id>/constants.ts`.
- La plataforma solo tiene tema oscuro (`--bg: #0a0a0f` en `app/globals.css`).
- El agente implementa directamente en el código (sin spec), por petición del usuario (2026-11-16).
- El primer juego con skins define el contrato (`SkinId`, paleta, `setSkin`, selector); los siguientes lo reutilizan.

## Convenciones

- Skins mínimas: `classic` (por defecto, paleta actual), `neon`, `retro`.
- La skin elegida se guarda en `localStorage` por juego (clave `arcade-vault:skin:<gameId>`) y se restaura al abrir el juego; valor inválido o ausente → `classic`. Pedido explícito del usuario (2026-11-16).

## Auditorías

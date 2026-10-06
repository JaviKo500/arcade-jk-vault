# Guía de port desde `references/`

Cómo leer una carpeta de `references/` y traducirla al contrato de `platform-contract.md`. El precedente es la SPEC 05, que portó `references/02-asteroids/game.js` a `lib/games/asteroids/`.

## 1. Qué leer y qué ignorar

- **Leer:** `README.md`, `CLAUDE.md` (si describe el juego), `index.html`, todos los `.js` y `.css` del juego, y los assets (`assets/`, sprites, sonidos).
- **Ignorar:**
  - `references/__MACOSX/` y cualquier `._*` o `.DS_Store` (metadatos de macOS).
  - `.claude/`, `.agents/`, `.github/`, `skills-lock.json` y `specs/` internos de la referencia: son de otro proyecto y no forman parte del juego.
  - `references/templates/`: son maquetas React del portal Arcade Vault, no un juego.
- Si la referencia trae specs propias (por ejemplo `references/04-arkanoid/specs/`), pueden servir para entender la intención de una mecánica, pero **no** se copian decisiones de ellas sin preguntar.

## 2. Inventario a presentar al usuario

Antes de preguntar, resume en una lista corta:

1. Archivos de código y su orden de carga.
2. Canvas: tamaño, número de canvas y si hay HUD en DOM.
3. Estado global y listeners (`window`, `document`, canvas, botones) y si el loop se cancela.
4. Puntuación: cómo se suma, tablas de puntos y multiplicadores.
5. Vidas y nivel: si existen, cómo cambian y qué los reinicia.
6. Fin de partida, victoria y reinicio.
7. Controles (teclas por `e.code` o `e.key`, ratón, clic).
8. Pausa propia, temas, `localStorage` u otra persistencia.
9. Assets y sonido.
10. Brechas con el contrato (tabla de `platform-contract.md`).

## 3. Mapeo al contrato

| En la referencia                                 | En el motor portado                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Variables globales de módulo                     | Estado privado (`EngineState`) dentro de la closure de `create<Name>Game`.                                |
| Clases que leen `ctx`, `keys` o globales         | Clases en `entities.ts` que reciben `ctx`, input y paleta como parámetros.                                |
| Constantes sueltas                               | `constants.ts`: `W`, `H`, tablas de puntos y velocidades, `COLORS`.                                       |
| Datos de niveles (`levels.js`)                   | `lib/games/<id>/levels.ts` con tipos.                                                                     |
| `requestAnimationFrame(loop)` sin cancelar       | `rafId` guardado y `cancelAnimationFrame` en `destroy()`.                                                 |
| `addEventListener` en `window`/`document`/canvas | Handlers con nombre, registrados al crear y quitados en `destroy()`.                                      |
| HUD dibujado o en DOM (`#score`, `SCORE`, vidas) | Se elimina. `sync()` dispara `onScore`, `onLives`, `onLevel` solo cuando cambian.                         |
| Overlay "GAME OVER" o `#overlay`                 | Se elimina. Fase `gameover` y `onGameOver(finalScore)`. El modal de la plataforma lo muestra.             |
| Reinicio con tecla o botón propio                | `restart()`, invocado por **JUGAR DE NUEVO**. Vuelve a la fase `ready`.                                   |
| Pausa propia (`P`, menú de pausa)                | `pause()`/`resume()` + `onPauseChange`. `P`/`Esc` y `visibilitychange` siguen funcionando.                |
| Arranque inmediato                               | Fase `ready` con pantalla de inicio en el canvas. Arranca con la tecla que defina la spec.                |
| `localStorage`, temas, highscores propios        | Se eliminan. El guardado es el de la plataforma.                                                          |
| Rutas relativas a assets                         | `public/games/<id>/...` y carga desde el motor antes de salir de `ready`.                                 |
| Colores propios                                  | Paleta neón en `COLORS` (si el usuario lo aprueba). Solo cambian colores, no la mecánica.                 |
| `dt` en ms o por frame                           | `dt` en segundos con tope `MAX_DT = 0.05`. Si el original va por frame, convertir velocidades y anotarlo. |

## 4. Estructura destino

```
lib/games/<id>/
├── constants.ts   # W, H, tablas, COLORS
├── entities.ts    # clases y helpers sin globales
├── levels.ts      # solo si el juego tiene niveles predefinidos
└── engine.ts      # create<Name>Game: GameFactory — loop, input, colisiones, fases, dibujo
```

Si un archivo pasa de ~400 líneas, la spec puede dividirlo (por ejemplo `board.ts` o `render.ts`), con nombres concretos.

## 5. Notas sobre las referencias actuales

Son ejemplos para orientar las preguntas, **no decisiones tomadas**. Verifica leyendo el código.

- **`02-asteroids`:** ya portado en la SPEC 05 (`asteroids`). No se vuelve a portar.
- **`03-tetris`:**
  - Tablero de 300×600 (10×20 celdas de 30 px) más un canvas de pieza siguiente de 120×120.
  - HUD y overlay en DOM (`#score`, `#lines`, `#level`, `#overlay`, `#restart-btn`).
  - Sin vidas. Nivel = `floor(lines / 10) + 1`. Puntos por líneas `[0, 100, 300, 500, 800] × nivel`, más bonus por caída rápida y suave.
  - Tema claro/oscuro con `localStorage('tetris-theme')`, que debe eliminarse.
  - Brechas: sin vidas, canvas no 4:3, segundo canvas, métrica "líneas".
  - Placeholder probable: `caida` (PUZZLE, `cover-tetro`).
  - Incluye `.Claude/commands/clima.md` y `.github/`, que no tienen relación con el juego.
- **`04-arkanoid`:**
  - Canvas de 800×600. Carga `assets/spritesheet.js`, `levels.js` (5 niveles con bloques y multiplicador de velocidad) y `game.js`.
  - Ratón para mover la pala y clic para lanzar y para el menú de pausa. Teclado con `e.key`.
  - 3 vidas, +10 por bloque, estado `win` tras el último nivel.
  - Spritesheet PNG y dos sonidos MP3.
  - Brechas: ratón y clic, assets, sonido, estado de victoria, menú de pausa propio.
  - Placeholder probable: `bloque-buster` (ARCADE, `cover-bricks`).

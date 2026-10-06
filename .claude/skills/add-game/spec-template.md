# Plantilla de spec de juego

Esta es la forma que debe tener la spec que genera `/add-game`. **No es texto para copiar literalmente.** Adapta cada bloque al juego, elimina lo que no aplique y añade lo que las brechas del contrato requieran. Las reglas generales de `~/.agents/skills/spec/template.md` siguen vigentes: una idea por frase, nombres concretos, sin TODOs y sin funciones completas.

Convenciones del repo: encabezados de sección en inglés, cuerpo en español, identificadores de código en inglés y textos visibles en español.

---

## Encabezado

```markdown
# SPEC NN — Juego <TÍTULO> jugable con leaderboard

> **Estado:** Draft · **Depende de:** SPEC 05 (`05-asteroids-game.md` — contrato `GameFactory`, `GameCanvas`, `GamePlayer`), SPEC 06 (`06-games-and-leaderboard-supabase.md` — tablas `games` y `scores`, leaderboard) · **Fecha:** YYYY-MM-DD
> **Objetivo:** <Portar el X de `references/NN-x/` | Crear el juego X> como motor TypeScript que se monta en `/games/<id>/play` y envía puntuación<, vidas> y nivel al HUD y al leaderboard de la plataforma.
```

Añade a "Depende de" cualquier spec posterior que haya cambiado el contrato.

---

## Scope

**Incluye** (bloques típicos):

- Catálogo:
  - Juego nuevo: migración `supabase/migrations/<timestamp>_add_<id>_game.sql` con un `insert` en `public.games` (`id`, `title`, `short_description`, `long_description`, `category`, `cover`, `accent_color`, `sort_order`).
  - Placeholder reutilizado: migración `<timestamp>_<id>_engine.sql` con `update` de los campos que cambien, o ninguna migración si no cambia nada.
- Portada `cover-<id>` en `app/globals.css`, diseñada con `/frontend-design` y distinta de las demás.
- Motor en `lib/games/<id>/` con `create<Name>Game(canvas, callbacks)`:
  - Mecánica (idéntica al original o la acordada), sin estado global ni listeners sueltos.
  - API `start`, `pause`, `resume`, `restart`, `end`, `setInputEnabled`, `destroy`.
  - Callbacks `onScore`, `onLives`, `onLevel`, `onPauseChange`, `onGameOver`, solo cuando cambia el valor.
- Pantalla de inicio en el canvas. La partida no arranca hasta la tecla acordada.
- Controles, `P`/`Esc` para pausa, `preventDefault` en las teclas del juego, pausa por `visibilitychange`.
- Paleta neón en `COLORS`. Sin HUD ni overlay "GAME OVER" en el canvas, salvo indicadores propios de la mecánica.
- Registro en `lib/games/registry.ts` con la clave `<id>`.
- Cambios del contrato o de la plataforma que exijan las brechas detectadas (uno por punto, con la ruta exacta).
- Leaderboard: las puntuaciones guardadas desde el modal aparecen en `/leaderboard?game=<id>` y en el top de `/games/<id>`, sin cambios en `scores` ni en las vistas.

**Fuera de alcance (para futuros specs)** (típicos):

- Controles táctiles y juego en móvil.
- Sonido y música (salvo que se haya decidido incluirlos).
- Cambios de mecánica o de balance respecto al original.
- Antitrampas y validación de puntuación en servidor.
- Implementar otros juegos del catálogo.
- Tests automatizados (no hay script de test configurado).

---

## Data model

Incluye solo lo que aparece o cambia:

- Fila de `public.games` (como `insert` o `update` resumido en SQL), con `sort_order` explícito.
- Estado interno del motor (privado de `engine.ts`): `type Phase = ...` y `type EngineState = { ... }` con comentarios de valores iniciales.
- Lista de archivos del motor y qué contiene cada uno.
- Cambios de contrato, si los hay, como diff de tipos de `lib/games/types.ts` o de la forma de `GAME_ENGINES`.
- Assets: rutas bajo `public/games/<id>/`.

Convenciones a fijar:

- Coordenadas con origen arriba a la izquierda en un espacio lógico de `W×H`.
- Velocidades en px/s y `dt` en segundos con tope de 0,05 s.
- Callbacks solo cuando cambia el valor.
- La paleta sale de `constants.ts`.
- El juego no crea datos persistentes propios: el guardado es el de `GamePlayer` (`insertScore`).

Si la mecánica de puntuación es relevante para el leaderboard, documenta la tabla de puntos y el valor máximo esperado (debe caber en `score between 0 and 10000000`).

---

## Implementation plan

Plan tipo. Cada paso deja el proyecto compilable y navegable con `next dev`:

1. **Catálogo y portada.** Crear la migración (`npx supabase migration new ...`), aplicarla con `npm run db:push` (y `npm run db:types` solo si cambia el esquema). Añadir `.cover-<id>` con `/frontend-design`.
   - Prueba manual: `/games` y, si aplica, Home muestran el juego con su portada. `/games/<id>/play` sigue con la simulación.
2. **Brechas del contrato** (solo si hay). Ampliar `lib/games/types.ts`, `lib/games/registry.ts`, `components/game-canvas.tsx`, `components/game-player.tsx` o `app/globals.css` de forma retrocompatible. Antes de tocar componentes, consultar `node_modules/next/dist/docs/01-app/`.
   - Prueba manual: ASTEROIDS funciona igual que antes.
3. **Constantes y entidades.** `constants.ts` y `entities.ts` (y `levels.ts` si aplica), sin globales. Compila sin usarse.
4. **Motor.** `engine.ts` con `EngineState`, fases, loop con `dt` limitado, reglas de puntuación, niveles y fin de partida, dibujo con la paleta y pantalla de inicio. `sync()` para los callbacks.
5. **Entrada y ciclo de vida.** Teclado (y ratón si aplica), `P`/`Esc`, `visibilitychange`, `setInputEnabled`, `pause`, `resume`, `restart`, `end` y `destroy`.
6. **Registro e integración.** Añadir `<id>: create<Name>Game` a `GAME_ENGINES`.
   - Prueba manual: jugar, ver el HUD actualizado, terminar la partida, ver el modal y guardar.
7. **Leaderboard.** Guardar una puntuación y verla en `/leaderboard?game=<id>` y en `/games/<id>`. Sin cambios de código si los pasos anteriores son correctos.

Divide cualquier paso que requiera más de 30–50 líneas de código. El último paso no es "probar todo": eso son los criterios de aceptación.

---

## Acceptance criteria

Criterios estándar, a adaptar y ampliar con los propios de la mecánica:

**Catálogo**

- [ ] `public.games` tiene la fila `<id>` con `title`, `category`, `cover`, `accent_color` y `sort_order` acordados (o, si se reutiliza un placeholder, el `id` existente sin cambios y sus puntuaciones previas intactas).
- [ ] `/games` muestra `<TÍTULO>` con la portada `cover-<id>`, distinta de las demás.
- [ ] `/games/<id>` muestra el detalle, y **JUGAR AHORA** lleva a `/games/<id>/play`.

**Motor**

- [ ] Al entrar en `/games/<id>/play`, el canvas muestra la pantalla de inicio y no pasa nada hasta pulsar la tecla de inicio.
- [ ] Criterios de mecánica verificables (puntos exactos por acción, cambio de nivel, condición de fin de partida).
- [ ] Mientras el canvas está montado, las teclas del juego no hacen scroll de la página.
- [ ] El canvas no dibuja score, vidas, nivel ni overlay "GAME OVER".

**Integración con la plataforma**

- [ ] Puntuación<, Vidas> y Nivel del HUD coinciden en todo momento con el estado del motor.
- [ ] Al terminar la partida se abre el modal "FIN DEL JUEGO" con la puntuación final del motor.
- [ ] Con el modal abierto, escribir las iniciales no afecta al juego.
- [ ] **PAUSA** congela el juego y **REANUDAR** lo continúa. `P` y `Esc` alternan la pausa y la etiqueta del botón cambia.
- [ ] Cambiar de pestaña y volver deja el juego en pausa, con el botón en **REANUDAR**.
- [ ] **FIN** abre el modal con la puntuación actual.
- [ ] **JUGAR DE NUEVO** vuelve a la pantalla de inicio con el estado inicial.
- [ ] Tras **SALIR** y volver a entrar, solo corre un loop: la velocidad es la normal y cada acción ocurre una vez.
- [ ] En un viewport de 480 px de ancho, el canvas se escala manteniendo su proporción, sin overflow horizontal.

**Leaderboard**

- [ ] **GUARDAR PUNTUACIÓN** inserta una fila en `scores` con `game_id = '<id>'`, el nombre normalizado y la puntuación final.
- [ ] La puntuación aparece en `/leaderboard?game=<id>` y en el top de `/games/<id>`.
- [ ] Recargar `/games` refleja el nuevo `playCount` y, si la supera, el nuevo `bestScore`.
- [ ] Con sesión iniciada, la fila "TU MEJOR MARCA" de `/leaderboard?game=<id>` muestra la marca del jugador.

**No regresiones**

- [ ] ASTEROIDS (motor, HUD, pausa, modal y guardado) funciona igual que antes.
- [ ] Los juegos sin motor siguen con la simulación.
- [ ] `next dev` no muestra errores en consola en `/`, `/games`, `/games/<id>`, `/games/<id>/play` ni `/leaderboard?game=<id>`.
- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` no reporta errores en los archivos nuevos o modificados.

---

## Decisions

Siempre presentes, con **Sí/No** y motivo:

- Reutilizar el placeholder `<id-existente>` o crear una entrada nueva.
- Port idéntico al original o con cambios de mecánica.
- Motor TypeScript bajo `GameFactory` frente a `<iframe>` con los archivos originales (descartado en la SPEC 05: aísla el juego y obliga a `postMessage`).
- Recolorear a la paleta neón.
- Cómo se resuelve cada brecha del contrato y qué alternativa se descartó.
- Posición en el catálogo (`sort_order`) y su efecto en Home y en la pestaña inicial de `/leaderboard`.
- Sonido dentro o fuera de alcance.
- Identificadores en inglés y textos visibles en español.

---

## Risks

Riesgos habituales (incluye solo los que apliquen y añade los propios):

| Riesgo                                                                                 | Mitigación                                                                                        |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| StrictMode monta dos veces `GameCanvas` y quedan dos loops o listeners duplicados.     | `destroy()` cancela el `requestAnimationFrame` y quita cada listener. Criterio de salir y volver. |
| Callbacks con `setState` en cada frame provocan re-renders a 60 fps.                   | `sync()` solo dispara cuando el valor cambia.                                                     |
| El primer `dt` tras una pausa es enorme.                                               | Tope de 0,05 s y reinicio de `lastTime` al reanudar.                                              |
| La clave de `GAME_ENGINES` no coincide con `games.id` y el juego cae en la simulación. | Criterio de aceptación de jugar en `/games/<id>/play` con el motor real.                          |
| `sort_order` duplicado hace fallar la migración.                                       | Usar el siguiente al máximo o desplazar filas con un offset temporal en la misma migración.       |
| Un cambio de contrato rompe ASTEROIDS.                                                 | Cambios retrocompatibles y criterio de no regresión de ASTEROIDS.                                 |
| Las APIs de Next 16 o React 19 difieren de lo recordado.                               | Consultar `node_modules/next/dist/docs/` antes de tocar componentes.                              |
| Las fuentes no están cargadas al dibujar la pantalla de inicio.                        | Fallback a `monospace`; el texto se redibuja en cada frame.                                       |

---

## What is **not** in this spec

Repite la lista de "Fuera de alcance" y cierra con:

> Cada uno de estos, si se necesita, va en su propio spec.

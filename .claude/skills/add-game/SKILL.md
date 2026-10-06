---
name: add-game
description: Genera una spec (specs/NN-<id>-game.md) para crear un juego jugable e integrarlo en Arcade Vault con su leaderboard en Supabase, portándolo desde una carpeta de references/ o diseñándolo desde cero. Úsalo antes de /spec-impl cuando quieras añadir un juego nuevo o darle motor a un juego del catálogo.
disable-model-invocation: true
argument-hint: "<carpeta de references (ej. 03-tetris) o descripción breve del juego>"
---

# /add-game — Diseñador de specs de juegos para Arcade Vault

Este skill produce **una spec**, no código. Su resultado es un archivo `specs/NN-<id>-game.md` en estado `Draft`, que después se implementa con `/spec-impl NN-<id>-game`.

La spec describe cómo un juego (portado desde `references/` u original) pasa a ser jugable en `/games/<id>/play`, con HUD real, modal "FIN DEL JUEGO", guardado en `scores` y ranking en `/leaderboard?game=<id>`. El patrón de referencia son la SPEC 05 (`specs/05-asteroids-game.md`, port del motor) y la SPEC 06 (`specs/06-games-and-leaderboard-supabase.md`, catálogo y puntuaciones en Supabase).

Archivos de apoyo, en el mismo directorio que este skill:

- `platform-contract.md`: los puntos de integración reales de la plataforma y las brechas conocidas del contrato. **Léelo siempre.**
- `porting-guide.md`: cómo analizar una carpeta de `references/` y traducirla al contrato. Léelo en modo port.
- `spec-template.md`: el esqueleto de la spec de juego, con los bloques estándar a adaptar.

## Flujo del comando

- Sigue las fases en orden. **No te saltes fases.**
- Responde en el idioma del prompt inicial (en este repo, normalmente español).
- Pregunta en bloques de 3 a 5 preguntas numeradas, con 2–4 opciones y tu recomendación marcada. Espera la respuesta antes de seguir.

### Fase 1 — Contexto del proyecto

1. Lee `CLAUDE.md` y `AGENTS.md`.
2. Lista `specs/` para saber el siguiente número `NN` y lee la SPEC 05 y la SPEC 06 completas.
3. Lee `platform-contract.md`.
4. Verifica el estado actual del código, porque puede haber cambiado desde que se escribió este skill:
   - `lib/games/types.ts` (contrato) y `lib/games/registry.ts` (juegos con motor).
   - `components/game-canvas.tsx` y `components/game-player.tsx`.
   - Todas las migraciones de `supabase/migrations/`, para conocer los `id`, categorías, acentos y el `sort_order` máximo actuales del catálogo.
   - Las specs posteriores a la 06, por si ya ampliaron el contrato (por ejemplo, juegos sin vidas o canvas de otro tamaño).
5. Si algo de `platform-contract.md` ya no coincide con el código, manda el código y menciónalo al usuario.

### Fase 2 — Origen del juego

Decide el modo a partir de `$ARGUMENTS`:

- **Modo port:** el argumento coincide con una carpeta de `references/` (por ejemplo `03-tetris`, `tetris` o `references/04-arkanoid`).
  - Sigue `porting-guide.md` y lee todos los archivos de código de esa carpeta.
  - Presenta al usuario un resumen breve: archivos, tamaño del canvas, estado global y listeners, cómo se calculan puntuación, vidas y nivel, cómo termina la partida, controles, assets y sonido, y qué se dibuja como HUD u overlay.
- **Modo original:** el argumento es una descripción, o viene vacío.
  - Si viene vacío, pide una descripción de **una sola frase**. Si no cabe en una frase, propone dividir el juego en varias specs.
  - Pregunta mecánica principal, cómo se puntúa, cuándo termina la partida (vidas, tiempo, derrota única), controles y niveles.
- Si el argumento es ambiguo (podría ser una referencia o una descripción), pregunta.

**Detección de placeholder (ambos modos):** compara el juego con el catálogo actual (título, género, categoría, portada). Si hay un juego del catálogo sin motor que representa lo mismo (por ejemplo Tetris → `caida`, Arkanoid → `bloque-buster`, Snake → `serpentina`), **pregunta siempre**:

1. **Darle motor al juego existente** (conserva `id`, URL y puntuaciones ya guardadas). La migración hace `update` de la fila si cambian textos o portada, o no toca la base si no cambia nada.
2. **Crear una entrada nueva** con su propio `id` (como ASTEROIDS frente a ROCAS). La migración hace `insert`.

No decidas tú. Registra la elección en `## Decisions`.

### Fase 3 — Preguntas de definición

Cubre como mínimo estos temas. Pregunta solo lo que no esté ya decidido:

1. **Identidad en el catálogo:** `id` (slug en inglés o español en kebab-case, sin tildes), `title` en mayúsculas, `category` y `accentColor` dentro de los `check` actuales, `shortDescription` y `longDescription` en español.
2. **Posición:** `sort_order` (por defecto, el siguiente al máximo). Si debe ir en el top 6 de Home o ser la pestaña inicial de `/leaderboard`, hay que desplazar filas, y eso es una decisión explícita.
3. **Portada:** clase `cover-<id>` en `app/globals.css`, distinta de las demás. La spec debe indicar que se diseña con `/frontend-design`.
4. **Fidelidad:** en modo port, ¿mecánica idéntica al original (recomendado) o con cambios? Los cambios de balance van fuera de alcance salvo que el usuario los pida.
5. **Paleta:** recolorear a la paleta neón de la plataforma (recomendado, ver `COLORS` en `lib/games/asteroids/constants.ts`).
6. **Brechas del contrato:** revisa la tabla de brechas de `platform-contract.md` y pregunta por cada una que aplique (sin vidas, canvas que no es 800×600, ratón, assets, sonido, estado de victoria, categoría o acento nuevos). Para cada brecha ofrece opciones concretas, por ejemplo extender el contrato de forma retrocompatible o adaptar el juego al contrato actual.

Para de preguntar cuando puedas responder sin suponer:

1. ¿Qué archivos aparecen o cambian?
2. ¿Cuál es el primer paso ejecutable y cuál el último?
3. ¿Cómo se verifica que el juego está integrado, incluido su leaderboard?

Si el juego toca más de tres áreas o requiere cambiar el contrato y además varios componentes de la plataforma, propone separar la ampliación del contrato en una spec propia.

### Fase 4 — Redacción sección a sección

Usa `spec-template.md` como forma. **No generes la spec entera de una vez.** Muestra cada sección, pregunta "¿Esta sección queda así o quieres ajustarla?" y espera confirmación antes de la siguiente.

Orden estricto: Encabezado → Scope → Data model → Implementation plan → Acceptance criteria → Decisions → Risks → What is **not** in this spec.

Reglas al redactar:

- Rutas y nombres concretos (`lib/games/<id>/engine.ts`, `create<Name>Game`, `cover-<id>`), nunca "el módulo del juego".
- Cada paso del plan deja el proyecto compilable y navegable con `next dev`.
- Los criterios de aceptación son booleanos y verificables. Incluye siempre los criterios estándar de `spec-template.md` adaptados al juego.
- La sección de Decisions recoge lo elegido **y lo descartado**, con su motivo, incluida la elección de placeholder.
- Sin TODOs. Una decisión pendiente se pregunta ahora.

### Fase 5 — Guardar

1. Propón el nombre `specs/NN-<id>-game.md` (o un slug más descriptivo si el usuario lo prefiere) y confírmalo.
2. Escribe el archivo con estado `Draft`. **No lo marques como aprobado.**
3. Confirma al usuario:
   - La ruta del archivo creado.
   - Que está en `Draft` y que debe cambiarlo a `Approved` cuando lo haya releído.
   - El siguiente paso: `/spec-impl NN-<id>-game`.
4. **Detente aquí.** No propongas implementar la spec ni escribas código.

## Reglas duras

- **Nunca escribas código** en este comando. Solo el `.md` de la spec al final.
- **Nunca asumas decisiones** que el usuario no confirmó, en especial la elección de placeholder, el `id` y las brechas del contrato.
- **No modifiques `scores`, `game_stats` ni `leaderboard`** en la spec salvo necesidad justificada en Decisions. Las vistas ya funcionan por `game_id` para cualquier juego nuevo.
- **El leaderboard no se reimplementa:** basta con que el juego exista en `public.games`, esté en `GAME_ENGINES` con el mismo `id` y dispare `onGameOver(finalScore)`. La spec debe verificarlo con criterios de aceptación.
- **El juego no guarda nada por su cuenta** (`localStorage`, highscores propios). El guardado es el de `GamePlayer` con `insertScore`.
- Toda spec incluye un paso que obliga a consultar `node_modules/next/dist/docs/` antes de tocar componentes o páginas, y a usar `/frontend-design` para la portada y cualquier UI nueva.
- Identificadores de código en inglés y textos visibles en español, igual que las specs 01 a 06.
- Si el usuario quiere saltarse las preguntas, recuérdale que las preguntas ahora ahorran horas después. Si insiste, respétalo y anótalo en Decisions ("Definición rápida sin aclaración detallada").

## Argumentos

- `/add-game 03-tetris` → modo port desde `references/03-tetris/`.
- `/add-game pong para dos jugadores` → modo original con esa descripción.
- `/add-game` → pregunta primero si es un port (lista las carpetas de `references/` que son juegos) o un juego original.

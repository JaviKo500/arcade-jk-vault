# SPEC 03 — Página About y envío de contacto por correo

> **Estado:** Approved · **Depende de:** SPEC 02 (`02-home-landing-and-nav.md` — rutas `/`, `/about` placeholder, `Nav`, `useReveal` ya implementados) · **Fecha:** 2026-09-02
> **Objetivo:** Portar el contenido completo de `about.jsx` (hero de misión, highlights, formulario de contacto) a la ruta `/about` existente, reemplazando el placeholder, y conectar el formulario a un endpoint propio que envía el mensaje por correo vía Resend, con validación server-side, honeypot y rate limiting en memoria.

## Scope

**Incluye:**

- Ruta `/about` — reemplazar el placeholder actual (`app/about/page.tsx`) por el contenido completo portado de `about.jsx`: hero de misión ("ACERCA DE ARCADE VAULT" + texto de misión), fila de 3 highlights (❤️ hecho con amor, 🌐 juegos en HTML, 🌱 proyecto en crecimiento) con `HighlightIcon`, divisor decorativo animado (`about-divider`), y sección de contacto (`about-contact`) con formulario.
- Formulario de contacto funcional: campos NOMBRE, CORREO ELECTRÓNICO, MENSAJE (mismos placeholders que el template), validación cliente igual a `about.jsx` (shake si algún campo está vacío), estado de éxito ("terminal success" con animación de líneas, igual al template) y nuevo estado de error inline (mensaje corto, formulario permanece visible con los datos escritos).
- Campo honeypot oculto adicional en el formulario (no presente en el template original), invisible para usuarios reales, usado para descartar envíos de bots.
- Endpoint `app/api/contact/route.ts` (Route Handler, método POST): valida los campos server-side (no vacíos, formato de email válido), rechaza si el honeypot viene lleno, aplica rate limiting en memoria por IP, y si todo pasa, llama a Resend para enviar el correo.
- Rate limiting en memoria (`lib/contact-rate-limit.ts`): límite simple por IP (ej. máx. 3 envíos cada 10 minutos), usando un `Map` en el módulo del route handler — sin Redis ni base de datos.
- Integración con Resend: dependencia `resend` agregada a `package.json`, cliente instanciado en el route handler con `RESEND_API_KEY`, envío usando `CONTACT_FROM_EMAIL` (remitente) y `CONTACT_TO_EMAIL` (destinatario) como variables de entorno.
- Archivo `.env.local.example` (nuevo) documentando `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` sin valores reales.
- `useReveal` (ya existente de SPEC 02) reutilizado para animar `about-divider` y `about-contact` al hacer scroll, igual que en el template.
- Estilos CSS específicos de About (`about-*`, `highlight-*`, `contact-*`, `field`, `terminal-success`, `term-*`, `shake`) portados desde `references/templates/home-about/styles.css` a `app/globals.css`, reutilizando clases/tokens ya existentes sin duplicarlos.

**Fuera de alcance (para futuros specs):**

- Dominio verificado en Resend y valores reales de `RESEND_API_KEY`/`CONTACT_FROM_EMAIL`/`CONTACT_TO_EMAIL` — quedan como variables de entorno pendientes de configurar; sin ellas el endpoint responde error controlado.
- Verificación end-to-end de que el correo llega a una bandeja de entrada real — el criterio de aceptación cubre el flujo completo (validación, honeypot, rate limit, llamada a Resend, manejo de éxito/error) sin depender de una key real.
- Rate limiting persistente/distribuido (Redis, Upstash, etc.) — el de este spec es en memoria y se resetea al reiniciar el servidor o entre instancias serverless.
- Plantillas HTML de correo con diseño propio — el cuerpo del correo enviado es texto simple con los datos del formulario.
- Tests automatizados (no hay test script configurado en el proyecto).

## Data model

```ts
// app/api/contact/route.ts — request/response shapes
type ContactRequestBody = {
  name: string;
  email: string;
  msg: string;
  company: string; // honeypot — debe llegar vacío; si no, se descarta el envío
};

type ContactSuccessResponse = { ok: true };
type ContactErrorResponse = { ok: false; error: "invalid_fields" | "honeypot" | "rate_limited" | "send_failed" };
```

```ts
// lib/contact-rate-limit.ts
export function isRateLimited(ip: string): boolean;
// Map<string, number[]> en memoria del módulo: ip -> timestamps (epoch ms) de envíos recientes.
// Límite: máx. 3 envíos por IP cada 10 minutos (ventana deslizante). Se resetea al reiniciar el server.
```

Variables de entorno nuevas (`.env.local.example`, sin valores reales):

```
RESEND_API_KEY=
CONTACT_FROM_EMAIL=
CONTACT_TO_EMAIL=
```

Convenciones:

- El formulario en `app/about/page.tsx` mantiene su estado local (`form`, `sent`, `shake`) igual que `about.jsx`, y agrega `error: string | null` para el mensaje inline de error.
- El campo honeypot se renderiza oculto vía CSS (posición fuera de pantalla), nunca `display:none` ni `type="hidden"`, para que bots que sí ejecutan CSS básico sigan cayendo en la trampa; el campo no tiene `label` visible.
- No se crean modelos de persistencia nuevos — no hay base de datos; el rate limiting vive solo en memoria del proceso del servidor.

## Implementation plan

1. Agregar la dependencia `resend` a `package.json` (`npm install resend`) y crear `.env.local.example` con `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` sin valores.
2. Crear `lib/contact-rate-limit.ts` con `isRateLimited(ip)`, ventana deslizante de 10 minutos y máx. 3 envíos por IP, usando un `Map` en memoria de módulo.
3. Crear `app/api/contact/route.ts`: parsea el body, valida campos (nombre/email/mensaje no vacíos, email con formato válido), rechaza si el honeypot (`company`) viene lleno, consulta `isRateLimited` con la IP de la request, y si todo pasa intenta enviar el correo con Resend (`RESEND_API_KEY`, `CONTACT_FROM_EMAIL` → `CONTACT_TO_EMAIL`, asunto con el nombre del remitente, cuerpo con nombre/email/mensaje). Responde `{ ok: true }` en éxito o `{ ok: false, error }` con el código HTTP correspondiente (400 validación, 429 rate limit, 500 fallo de envío/Resend no configurado).
4. Portar a `app/globals.css` los estilos específicos de About (`about-*`, `highlight-*`, `contact-*`, `field`, `terminal-success`, `term-*`, `shake`) desde `references/templates/home-about/styles.css`, reutilizando clases/tokens ya existentes sin duplicarlos.
5. Reescribir `app/about/page.tsx` como componente cliente (`"use client"`, mismo patrón que `app/page.tsx`) portando el hero de misión, la fila de highlights con `HighlightIcon` (inline, igual que `FeatureIcon` en Home), y el divisor decorativo, todo con `useReveal` para las animaciones de scroll.
6. Agregar la sección de contacto al mismo archivo: formulario con NOMBRE/CORREO/MENSAJE + campo honeypot oculto, validación cliente (shake si falta algún campo), `onSubmit` que hace `fetch("/api/contact", { method: "POST", ... })`; en éxito muestra la vista "terminal success" portada 1:1 del template; en error muestra un mensaje inline corto y conserva los datos escritos para reintentar.
7. Pasada final: verificar con `next dev` que `/about` renderiza el contenido completo, las animaciones `reveal` funcionan, el formulario valida en cliente, y que sin `RESEND_API_KEY` configurada el endpoint responde el error controlado esperado (500 `send_failed`) sin romper la UI.

Cada paso deja el proyecto compilable y navegable con `next dev`.

## Acceptance criteria

- [ ] `next dev` levanta el proyecto sin errores en consola en `/about`.
- [ ] `/about` muestra el hero de misión, los 3 highlights con sus íconos, el divisor decorativo y la sección de contacto, con el copy y layout del template `about.jsx`.
- [ ] Las secciones marcadas `reveal` en `/about` (`about-divider`, `about-contact`) se animan (agregan la clase `in`) al hacer scroll hasta que entran en el viewport.
- [ ] Enviar el formulario con algún campo vacío dispara la animación `shake` y no hace la llamada a `/api/contact`.
- [ ] Enviar el formulario con los 3 campos completos hace un POST a `/api/contact` con `name`, `email`, `msg` y el campo honeypot vacío.
- [ ] Si `/api/contact` responde `{ ok: true }`, el formulario muestra la vista "terminal success" (líneas animadas + mensaje con el nombre en mayúsculas), igual que en el template.
- [ ] Si `/api/contact` responde `{ ok: false }` (por cualquier motivo, incluyendo `RESEND_API_KEY` no configurada), el formulario muestra un mensaje de error inline corto, no pasa a la vista de éxito, y conserva los valores escritos por el usuario.
- [ ] `POST /api/contact` con el campo honeypot (`company`) no vacío responde error sin intentar enviar el correo vía Resend.
- [ ] `POST /api/contact` responde `429` (`rate_limited`) al superar 3 envíos desde la misma IP en una ventana de 10 minutos.
- [ ] `POST /api/contact` con `name`, `email` o `msg` vacíos o con `email` de formato inválido responde `400` (`invalid_fields`) sin llamar a Resend.
- [ ] Sin `RESEND_API_KEY` configurada en el entorno, `POST /api/contact` con datos válidos responde `500` (`send_failed`) de forma controlada, sin lanzar una excepción no manejada ni tumbar el servidor.
- [ ] La sección de contacto de `/about` es usable en un viewport móvil (≤ 480px de ancho) sin overflow horizontal.

## Decisions

- **Sí:** portar `about.jsx` completo (hero + highlights + contacto) en este spec, no solo el formulario. Pedido explícito del usuario ("sigue el template exactamente igual").
- **Sí:** `/about` como página cliente (`"use client"`) con subcomponentes inline (`HighlightIcon`), mismo patrón que `app/page.tsx` (Home, SPEC 02) en vez de dividir en archivos separados dentro de `components/`. Mantiene consistencia con la convención ya establecida en el proyecto para páginas "un solo archivo con secciones".
- **Sí:** envío de correo vía un Route Handler propio (`app/api/contact/route.ts`) que llama a Resend server-side, en vez de una Server Action. Mantiene la API key fuera del cliente sin ambigüedad y es el patrón más explícito para un endpoint con validación, honeypot y rate limiting.
- **Sí:** honeypot + rate limiting en memoria incluidos en este spec, aunque no estaban en el template original. Es la única protección anti-spam viable sin agregar infraestructura nueva (no hay Redis/DB en el proyecto), y evita que el endpoint quede abierto a abuso trivial desde el día uno.
- **No:** rate limiting persistente (Redis/Upstash). Sobre-ingeniería para el estado actual del proyecto; el límite en memoria es suficiente para MVP y se documenta su limitación (no persiste entre reinicios ni instancias serverless).
- **Sí:** `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` como variables de entorno pendientes (`.env.local.example` sin valores), no bloqueando el spec. El endpoint debe fallar de forma controlada mientras no estén configuradas.
- **No:** exigir una key real de Resend para dar el spec por completo. El criterio de aceptación verifica el flujo completo (validación, honeypot, rate limit, llamada a Resend, manejo de éxito/error) sin depender de que un correo llegue a una bandeja real.
- **Sí:** estado de error inline nuevo (no existe en el template original, que solo tenía `shake` para validación vacía). El template no contempla fallos de red/servidor porque no tenía backend real; ahora que sí lo hay, un error silencioso o que borre lo escrito sería mala UX.
- **Sí:** estilos de About portados directamente a `app/globals.css`, mismo criterio que SPEC 02 para Home.
- **Sí:** identificadores de código en inglés, copy visible en español — mismo criterio que specs 01 y 02.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Rate limiting en memoria no persiste entre reinicios del servidor ni entre instancias en un despliegue serverless/multi-proceso, permitiendo bypass en esos escenarios | Documentado como limitación conocida (ver Decisions); suficiente para MVP en un solo proceso (`next dev` / `next start` simple). Migrar a un store externo si el proyecto pasa a un entorno serverless multi-instancia. |
| Sin `RESEND_API_KEY` configurada, es fácil que el error 500 quede sin distinguirse de otros fallos reales de Resend en producción | El endpoint distingue internamente "no configurado" de "Resend rechazó el envío", pero ambos responden `send_failed` al cliente por simplicidad; el detalle real se loggea server-side (`console.error`) para debug. |
| APIs de Next.js 16 para Route Handlers (tipos de `Request`/`Response`, forma de leer IP del cliente) distintas a versiones anteriores recordadas | Consultar `node_modules/next/dist/docs/01-app/` (sección de Route Handlers) antes de escribir `app/api/contact/route.ts`, según indica `AGENTS.md`/`CLAUDE.md`. |

## What is **not** in this spec

- Dominio verificado en Resend y valores reales de las variables de entorno de correo.
- Verificación end-to-end de entrega real de correo a una bandeja de entrada.
- Rate limiting persistente/distribuido (Redis, Upstash).
- Plantillas HTML de correo con diseño propio.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

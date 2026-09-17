<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ruta del Cacao — Frontend

Sistema de trazabilidad de la producción de cacao en Norte de Santander (proyecto
académico UFPS). Este repo es la aplicación **Next.js 16** (App Router) + TypeScript +
Tailwind v4, un repo hermano de `ruta-del-cacao-backend` (Django). Vive normalmente junto
al repo paraguas `ruta-del-cacao` (workspace: `docs/`, `specs/`, contexto completo del
dominio) — pero **este archivo no depende de que ese repo exista al lado**: quien clone
solo este repo debe poder trabajar seguro con lo que sigue.

## No negociables del proyecto (resumen — la versión completa con el porqué de cada uno
vive en `AGENTS.md` del workspace, si lo tienes al lado)

- **Commits y push: los hace la persona, nunca el agente**, salvo que se pida explícito en
  esa sesión. El agente siempre propone el mensaje de commit.
- **Dos ramas fijas `main`/`dev`.** Ramas de trabajo salen de `dev`, nunca de `main`;
  integran a `dev` por PR con **squash merge**. Nadie hace force-push a ninguna de las dos.
- **Idioma:** nombres en el código (variables, funciones, componentes, tipos) en
  **inglés**; **comentarios de código en español, sin emojis**; mensajes de commit en
  **inglés**, formato Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
  `chore:`), resumen conciso ≤ 72 caracteres. El cuerpo del commit **solo** para el porqué
  que el diff no muestra por sí solo — nunca para narrar el qué; si no hay nada así, sin
  cuerpo.
- **Comentarios de código nunca mencionan specs, el repo workspace, ni rutas como
  `specs/003`** — este repo puede vivir clonado solo, sin el workspace al lado, así que esa
  referencia sería un enlace roto. Si hace falta el porqué de una decisión, se escribe
  completo en el comentario mismo.
- **Los comentarios tampoco nombran el proveedor/herramienta de turno** (Railway, Vercel,
  etc.) salvo que el código dependa de un detalle propio de ese proveedor. El mecanismo real
  (variables de entorno, convención 12-factor) es el mismo sin importar el proveedor, y
  nombrarlo de más ata el comentario a una decisión de infraestructura que puede cambiar.
  Un ejemplo con nombre de proveedor sí es válido en `.env.example`, nunca en código.
- **Toda feature con código lleva tests.** Lint/formato limpio antes de commitear
  (ESLint, ya configurado; Prettier si se añade).
- **Nunca commitear secretos** (`.env*`, llaves de API).
- **Seguridad y datos: activa desde el día uno.** Este sistema maneja datos personales
  reales de productores/usuarios y autenticación real — nunca loggear ni exponer en
  consola datos personales reales, ni siquiera en desarrollo.

## Específico de este repo

- **Offline First (RNF-21) es una restricción de arquitectura pendiente de decidir**, no un
  detalle de UI. Las pantallas de captura en campo (empezando por fincas/parcelas, Sprint
  1) probablemente necesiten seguir funcionando sin conexión. **No implementar ninguna
  pantalla de captura de campo hasta que exista un spec de arquitectura que defina el
  enfoque** (Service Worker, almacenamiento local, cola de sincronización) — retroaplicarlo
  después es mucho más caro que decidirlo antes de la primera pantalla.
- Stack instalado hoy: Next.js 16 + React 19 + TypeScript + Tailwind v4 + ESLint, pnpm.
  Aún **sin** librería de estado de servidor/formularios/validación — se añaden cuando la
  primera feature real las necesite, no antes.
- Estructura: App Router en `src/app/`.
- Si tienes el repo workspace (`ruta-del-cacao/`) al lado: `docs/CONTEXTO.md` tiene el
  dominio completo (actores, RF/RNF, modelo de datos con preguntas abiertas) y `specs/`
  tiene las features ya especificadas — leer antes de construir una pantalla nueva.


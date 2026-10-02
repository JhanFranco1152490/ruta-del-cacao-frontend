<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ruta del Cacao — Frontend

Sistema de trazabilidad de la producción de cacao en Norte de Santander (proyecto
académico UFPS). Este repo es la aplicación **Next.js 16** (App Router) + TypeScript +
Tailwind v4, un repo hermano de `ruta-del-cacao-backend` (Django). **Este archivo no depende
de ningún otro repo**: quien clone solo este repo debe poder trabajar seguro con lo que
sigue.

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
  (ESLint y Prettier, ya configurados).
- **Nunca commitear secretos** (`.env*`, llaves de API).
- **Seguridad y datos: activa desde el día uno.** Este sistema maneja datos personales
  reales de productores/usuarios y autenticación real — nunca loggear ni exponer en
  consola datos personales reales, ni siquiera en desarrollo.

## Específico de este repo

- **Offline First (RNF-21) ya está definido por arquitectura**, no es un detalle de UI. Las
  pantallas de captura en campo (empezando por fincas/parcelas, Sprint 1) deben funcionar sin
  conexión con el mecanismo aprobado: PWA, Service Worker, Dexie/IndexedDB y cola de
  sincronización. La base técnica compartida ya existe; cada dominio de captura debe cablear
  su recurso a ella desde su primera pantalla, sin retroajustar el flujo después.
- **La app abre sin conexión.** El Service Worker es de Serwist (`src/app/sw.ts`, servido por
  `src/app/serwist/[path]/route.ts`): guarda los archivos de cada build con su versión y el HTML
  de las pantallas de `src/config/offline-routes.ts`, y nunca guarda nada de otro origen (API,
  teselas). Una pantalla de captura nueva **no lleva parámetros en la ruta** (`/x/editar?id=`,
  no `/x/[id]/editar`) y se suma a esa lista; si no, no abre sin conexión. La sesión entra con la
  copia del dispositivo (`lib/offline/session-snapshot.ts`) cuando el servidor no responde,
  dentro de la ventana de 7 días. En `next dev` el Service Worker no se registra: lo sin conexión
  se prueba con `pnpm build && pnpm start` y la red cortada en las herramientas del navegador.

### Stack y estructura

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui, con pnpm. Estado
del servidor con TanStack Query, formularios con react-hook-form + zod, filtros de lista en
la URL con `nuqs`, fechas con `date-fns`. Pruebas con Vitest + Testing Library + MSW. ESLint
y Prettier; Husky + lint-staged corrigen y formatean lo que se va a commitear.

```
src/
  app/                 rutas y layouts, delgados: solo montan una pantalla de features/
    (auth)/            sin sesión: / (inicio de sesión), /recuperar-contrasena,
                       /restablecer-contrasena
    (app)/             con sesión (lo garantiza SessionGuard en su layout): /panel,
                       /productores, /productores/nuevo, /productores/[id],
                       /productores/[id]/editar
    providers.tsx      QueryClientProvider + NuqsAdapter
  features/<dominio>/  un dominio (hoy auth y producers): api.ts, schemas.ts, hooks propios
                       y components/ (pantallas y piezas de ese dominio)
  components/          piezas compartidas entre dominios; ui/ = shadcn/ui, brand/ = marca
  hooks/               hooks de React compartidos entre dominios (sin JSX; si el hook es de
                       un solo dominio, vive en features/<dominio>/ en vez de aquí)
  config/              configuración de la app sin lógica de dominio (hoy el registro del menú
                       de navegación: cada sección nueva suma una entrada)
  lib/                 código sin interfaz: api/ (cliente HTTP), offline/ (Dexie, cola de
                       sincronización), format/ (dates, mask), validation/ (is-email), env,
                       query-client, document-types, permissions
  types/               types que cruzan más de un dominio o módulo (NavItem, SyncStatus); un
                       type usado por un solo módulo se queda junto a ese módulo, no aquí
  test/                utilidades de pruebas
```

- Las rutas visibles y los parámetros de la URL van en español (`/productores`,
  `?buscar=`); todo lo demás (carpetas de dominio, componentes, funciones, tipos) en
  inglés, y los comentarios en español. Las rutas viejas `/producers…` redirigen a las
  nuevas desde `next.config.ts`.
- Componentes en **tres niveles**: (1) `components/ui/`, primitivas de shadcn/ui con las
  variantes del sistema de diseño, sin conocer el dominio; (2) `components/`, piezas
  compartidas con el aspecto de la app (`TextField`, `SelectField`, `PasswordField`,
  `FormField`, `SubmitButton`, `PageHeader`, `Pagination`, `EmptyState`, `ErrorState`,
  `MaskedValue`...) que solo reciben props y no conocen la API; (3)
  `features/<dominio>/components/`, pantallas (`*-screen.tsx`) y piezas de un dominio: la
  pantalla compone y obtiene los datos de los hooks de `features/<dominio>/api.ts`.

### Capa de API

- **`fetch` solo existe en `src/lib/api/client.ts`**: `apiFetch<T>(path, { method, body })`
  es el único punto de salida a la red y ESLint prohíbe `fetch` en cualquier otro archivo
  de `src/` (los tests y `src/test/` quedan fuera de la regla). Envía JSON, cookies
  (`credentials: 'include'`) y `cache: 'no-store'` a `API_URL`.
- **Tipos de la API generados, nunca escritos a mano.** `src/lib/api/schema.d.ts` sale de
  `pnpm gen:api`, que lee `http://localhost:8000/api/schema`: el backend debe estar en
  marcha con `DEBUG=True` (ese endpoint solo existe en modo debug). El archivo se commitea
  tal como sale del generador. Las peticiones y respuestas se tipan con alias de
  `components['schemas'][...]`. Si cambia la API, se regenera y se corrigen los errores de
  TypeScript que aparezcan.
- **Errores.** Todo error de la API tiene la forma `{ detail, code, fields }` y llega como
  `ApiError` (`status`, `code`, `fields`, y `detail` como mensaje). Una respuesta sin esa
  forma se convierte en `ApiError` con el código `unexpected_response`. La lógica decide
  por `code` o `status`, **nunca por el texto de `detail`**; `getErrorMessage(error,
  fallback)` da el mensaje para mostrar.
- **Sesión y CSRF.** La sesión vive en cookies `HttpOnly` que pone el backend: el frontend
  nunca guarda tokens. Antes de toda petición que no sea GET/HEAD/OPTIONS, `apiFetch` pide
  un token a `GET /api/auth/csrf` y lo envía en `X-CSRFToken`. Ante un `401` de un endpoint
  que usa el token de acceso (incluido `/api/auth/me`), renueva la sesión **una sola vez**
  con `POST /api/auth/refresh` (la promesa se comparte entre peticiones simultáneas) y
  reintenta; login, renovación, cierre de sesión, csrf y recuperación de contraseña no se
  renuevan (`NO_RENEWAL_PREFIXES`). Si la renovación falla, el `401` llega al `QueryClient`
  (`lib/query-client.ts`), que invalida la consulta de la sesión; `SessionGuard` la vuelve
  a comprobar y lleva a `/`. El cierre de sesión espera a una renovación en vuelo y, mientras
  dura, ninguna petición inicia otra (si no, la respuesta de la renovación devolvería una
  cookie viva después de cerrar). Iniciar y cerrar sesión limpian toda la caché de Query: en
  un equipo compartido no debe quedar nada de la persona anterior.
- **Fetchers y hooks.** En `features/<dominio>/api.ts`: los fetchers son constantes fuera
  de los hooks (`fetchProducers`, `fetchProducer`...) y reciben el `signal`; los hooks
  (`useProducers`, `useUpdateProducer`...) los envuelven con `useQuery`/`useMutation`. Las
  query keys salen solo de `lib/api/query-keys.ts`.
- **`NEXT_PUBLIC_API_URL`** es la URL del backend y se incrusta al compilar. En desarrollo y
  pruebas cae a `http://localhost:8000`; **en producción es obligatoria** y `pnpm build`
  falla sin ella (`lib/env.ts`).

### Datos y formularios

- El estado del servidor vive solo en TanStack Query; no se copia a `useState`. Los valores
  por defecto están en `lib/query-client.ts` (`staleTime` de 30 s, un reintento y solo ante
  errores que no sean 4xx). Tras una mutación se guarda la respuesta en el detalle de la
  caché y se invalidan las listas.
- Formularios con react-hook-form + `zodResolver`. El esquema y los mapeos formulario ↔
  petición viven en el dominio (`features/<dominio>/schemas.ts`). Los errores de campo del
  servidor se vuelcan con `applyApiFieldErrors(error, setError, campos)`, que devuelve
  `{ applied, unmatched }`: lo que no corresponde a ningún campo se muestra en un aviso
  general, no se pierde.
- Los filtros y la página de una lista viven en la URL con `nuqs` (compartibles, sobreviven
  a recargar y el botón atrás los respeta), con claves en español (`buscar`, `estado`,
  `municipio`, `pagina`); un valor malformado cae al valor por defecto. Ver
  `useProducerFilters` como modelo.
- Fechas solo con `lib/format/dates.ts` (`date-fns`, zona `America/Bogota`): los componentes no
  llaman a `Intl` ni a `new Date()` para formatear o comparar fechas de negocio.

### Reglas de diseño del código

- **Una responsabilidad por archivo**, un componente por archivo (kebab-case), ~150 líneas
  como referencia: si crece, se parte.
- **No duplicar.** La segunda vez que aparece algo se extrae: a `components/` si es
  visual y no depende de un dominio, a `lib/` si es lógica.
- **Páginas delgadas.** Un `page.tsx` monta una pantalla de `features/`; no lleva lógica.
- **Capas en una sola dirección**: `app` → `features` → `components` → `lib`. Un dominio
  nunca importa de la carpeta de otro; si dos lo necesitan, sube a `components/` o `lib/`.
- **Elegir la mejor opción, no la librería por defecto.** Ante una necesidad técnica se
  comparan las alternativas reales (lo que trae Next.js, una librería, código propio) y se
  deja escrito en el PR lo elegido y lo descartado.

### Pruebas

- Vitest (jsdom) + Testing Library + MSW: `pnpm test` corre todo una vez, `pnpm test:watch`
  en modo interactivo y `pnpm test:coverage` con cobertura (excluye `components/ui`, `app`,
  `test/` y `schema.d.ts`). Cada test vive junto al archivo que prueba (`x.test.ts(x)`).
  Se escribe primero el test que falla (TDD).
- MSW simula la API (`src/test/server.ts`, levantado en `vitest.setup.ts`): una petición sin
  handler hace fallar el test, así que ninguno toca la red. Los handlers propios de cada
  test se declaran con `server.use(...)`.
- Utilidades de `src/test/`: `renderWithProviders` (QueryClient de pruebas + adaptador de
  `nuqs`; acepta `searchParams` y `onUrlUpdate`), `router` (doble de `useRouter` para
  `vi.mock('next/navigation', ...)`), `factories` (`buildSession`, `buildProducer`,
  `buildPage`, `apiError`, `sessionExpired`...), `handlers` (`apiUrl`, `csrfHandler`,
  `municipalitiesHandler`) y `expectVisibleFocusOutline`.
- Datos inventados (`@example.com`, documentos ficticios): nunca datos personales reales.
  La salida de los tests no debe mostrar advertencias.

### Antes de proponer un PR

El agente corre y deja en verde, y si algo falla lo corrige o lo dice en el PR:

1. `pnpm exec prettier --write . && pnpm exec prettier --check .` (el Markdown, las maquetas
   de `docs/ui/ref/` y `schema.d.ts` están en `.prettierignore`).
2. `pnpm lint`.
3. `pnpm typecheck` (`next typegen && tsc --noEmit`: regenera los tipos de rutas antes de
   compilar los tipos).
4. `pnpm test` (`pnpm test:coverage` si se quiere el porcentaje).
5. `NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm build` (no hace falta `.env`).
6. Si cambió la API, `pnpm gen:api` con el backend en marcha y `DEBUG=True`.
7. Revisar el diff completo buscando bugs: casos borde, código duplicado, datos personales
   en logs o pruebas, tests que no afirman nada.

### Trampas conocidas

- **No excluir `/api/auth/me` de la renovación de sesión.** Es el endpoint que descubre que
  el token de acceso venció; sin renovación la persona saldría al inicio de sesión cada vez
  que vence (hoy, cada 15 minutos).
- **La consulta de la sesión no se invalida a sí misma** ante su propio `401`: `SessionGuard`
  sigue montado mientras redirige y la volvería a pedir en un ciclo sin fin.
- No leer el texto de `detail` para decidir lógica (cambia con el idioma y la redacción):
  usar `code` o `status`.
- No duplicar el estado del servidor en `useState`: se lee de la consulta. Los únicos
  borradores locales aceptables son lo que la persona está escribiendo antes de que llegue a
  la URL o al servidor, y la ficha con la que se abre un formulario de edición: se fija al
  montar (la consulta del editor usa `staleTime: Infinity`) y no adopta lecturas posteriores,
  porque guardar la versión nueva con los valores viejos haría que el servidor aceptara el
  cambio y pisara lo que otra persona guardó (bloqueo optimista por `version`).
- `pnpm dlx shadcn@latest add` escribe `import { cn } from '@/lib/utils'` (así lo dicta
  `components.json`), pero aquí no existe `src/lib/utils.ts`: `cn` viene del paquete `cn`
  (`import { cn } from 'cn'`). Corrige el import del archivo generado.

## Interfaz

La dirección visual aprobada es **Selva Viva**. Antes de crear o modificar cualquier pantalla,
lee `docs/ui/design-system.md`; los tokens están en `src/app/globals.css` y las pantallas de
referencia en `docs/ui/ref/*.html`.

- No inventes colores, tamaños de fuente ni radios: usa las variables CSS. Si falta un token,
  proponlo y agrégalo a `globals.css` y al documento, en el mismo cambio.
- Componentes de shadcn/ui primero. Solo se crea un componente propio si está en la tabla de
  «Componentes propios» del documento o si se justifica ahí antes de escribirlo.
- Tipografía: DM Serif Display (`--font-serif`) para títulos y cifras destacadas; Karla
  (`--font-sans`) para todo lo demás. Las etiquetas de sección van en versalitas color cobre.
- **Dos densidades.** Pantallas de oficina: controles de 44 px, bordes de 1 px, sombra suave.
  Pantallas de captura en campo: controles de 60 px o más (la acción principal 64–76 px, ancho
  completo), bordes de 2.5 px en `--ink`, sin sombras.
- **Estados.** Siempre color + ícono + texto, nunca color solo. Variantes tintadas en oficina y
  sólidas en campo o para avisos críticos.
- **Contraste.** Texto mínimo 4.5:1 (3:1 desde 24 px). Prohibido gris claro para datos
  importantes. `--oro` nunca como color de texto sobre fondo claro.
- **Accesibilidad.** Todo input con `<label>`; íconos solos con `aria-label`; errores con
  `aria-invalid` más mensaje de texto; foco visible con el anillo cobre, nunca `outline: none`.
- **Offline First (RNF-21).** Toda pantalla de captura muestra el estado de la conexión y el
  número de registros en cola, y su botón principal dice qué va a pasar («Guardar en el teléfono»,
  no «Enviar»). La cola de sincronización es parte de la UI, no un detalle oculto. Esto describe
  cómo se ve una vez implementada — no autoriza construir pantallas de campo antes de que el spec
  de arquitectura de Offline First quede `aprobado` (ver arriba).
- **Datos personales (RNF-18).** Documentos y teléfonos se muestran enmascarados en listas
  (`MaskedValue`). Revelarlos es una acción explícita que registra en la bitácora.
- **Auditoría (RF-45/46).** Las fichas incluyen su historial de cambios; toda acción crítica
  (descartar lote, desactivar usuario, cambiar umbrales) confirma nombrando la consecuencia y,
  cuando el dominio lo exige, pide motivo.
- **Sin datos falsos.** No inventes cifras, nombres de productores ni fotos. Lo que falta se
  muestra como estado vacío. Lo que aparece entre `[CORCHETES]` en las referencias es contenido
  real pendiente.
- No hay modo oscuro. La app se usa bajo sol directo.
- **Setup hecho:** las fuentes están en `layout.tsx`, shadcn/ui está inicializado
  (`components.json`, estilo `base-nova` sobre `@base-ui/react`) y `button` y `badge` ya
  tienen las variantes de oficina (`size="office"`; `ok | warn | err | info`). Las variantes
  de campo (`copper`, tamaño `field`, badges sólidos) se agregan con la primera pantalla de
  captura en campo, no antes. Un componente base nuevo se agrega con
  `pnpm dlx shadcn@latest add <nombre>`.


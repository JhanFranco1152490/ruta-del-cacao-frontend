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
  dentro de la ventana de 7 días. **Cerrar sesión siempre se puede, también sin red:** si el servidor
  no responde, `useLogout` cierra en el dispositivo (borra la copia de la sesión y las lecturas, no
  la cola) y deja la marca de `lib/offline/pending-logout.ts`. Con la marca puesta, `fetchSession` y
  `useLogin` envían primero el cierre al servidor (las cookies son `HttpOnly`: solo él las revoca),
  porque si no, al volver la red la persona reaparecería dentro; la guardia muestra "Cerraste sesión
  en este dispositivo" en vez de un fallo de validación. Un error del servidor sí deja la sesión
  abierta para reintentar. En `next dev` el Service Worker no se registra: lo sin conexión
  se prueba con `pnpm build && pnpm start` y la red cortada en las herramientas del navegador.

### Stack y estructura

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui, con pnpm. Estado
del servidor con TanStack Query, formularios con react-hook-form + zod, filtros de lista en
la URL con `nuqs`, fechas con `date-fns`. Pruebas con Vitest + Testing Library + MSW. ESLint
y Prettier; Husky + lint-staged corrigen y formatean lo que se va a commitear.

```
src/
  app/                 rutas y layouts, delgados: solo montan una pantalla de features/
    (auth)/            sin sesión: /iniciar-sesion, /recuperar-contrasena,
                       /restablecer-contrasena, /activar-cuenta
    (app)/             con sesión (lo garantiza SessionGuard en su layout): / (puerta de
                       entrada: lleva a la primera sección permitida), /productores,
                       /fincas, /actividades, /cosechas, /lotes, /usuarios, /roles y sus
                       pantallas hijas. El
                       permiso y la conexión de cada sección se comprueban en el shell a
                       partir de config/navigation.ts: una sección nueva solo se suma ahí
    providers.tsx      QueryClientProvider + NuqsAdapter
  features/<dominio>/  un dominio (hoy auth, producers, farms, plots, crops, inputs, activities,
                       harvests, lots, users y roles): api.ts, schemas.ts, hooks propios
                       y components/ (pantallas y piezas de ese dominio)
  components/          piezas compartidas entre dominios; ui/ = shadcn/ui, brand/ = marca
  hooks/               hooks de React compartidos entre dominios (sin JSX; si el hook es de
                       un solo dominio, vive en features/<dominio>/ en vez de aquí)
  config/              configuración de la app sin lógica de dominio (hoy el registro del menú
                       de navegación: cada sección nueva suma una entrada)
  lib/                 código sin interfaz: api/ (cliente HTTP), offline/ (Dexie, cola de
                       sincronización), format/ (dates, mask, input-quantity), validation/
                       (is-email, messages), env,
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
  `FormField`, `SearchSelect`, `SubmitButton`, `PageHeader`, `Pagination`, `EmptyState`, `ErrorState`,
  `MaskedValue`...) que solo reciben props y no conocen la API; (3)
  `features/<dominio>/components/`, pantallas (`*-screen.tsx`) y piezas de un dominio: la
  pantalla compone y obtiene los datos de los hooks de `features/<dominio>/api.ts`.
- **Un dominio no importa de la carpeta de otro.** Cuando una pantalla junta dos (el detalle de
  una finca muestra sus parcelas), el dominio dueño de la pantalla recibe la sección del otro como
  función (`renderPlots`) y quien las une es la página en `app/`, que sí puede importar de ambos.
  Esa página es de cliente (`'use client'`): una función no pasa de un componente de servidor a
  uno de cliente.
- **Lo que leen o escriben varios dominios vive en `lib/`, no en el dominio que lo creó.** Hoy:
  las fincas, las parcelas y el catálogo de insumos con sus existencias para elegirlos en un
  formulario de otro dominio (`lib/api/farm-options.ts`, `plot-options.ts`, `input-catalog.ts`); y
  cómo se escribe la cantidad de un insumo con su unidad y su equivalente en empaques
  (`lib/format/input-quantity.ts`, `input-units.ts`). También: cómo se nombra una finca o una
  parcela, `F02 · La Esperanza` y `P05 · Lote del río` (`lib/format/place-label.ts`, el código lo
  asigna el servidor y una parcela sin nombre que espera en la cola es «Parcela nueva»); el aviso
  con el código que el servidor dio a lo creado en el dispositivo (`assigned-code-notice.ts`,
  `hooks/use-notify-assigned-codes.ts`, que escucha `assignedCode` de cada adapter); quién puede
  ser responsable o recolector en una finca (`lib/assignable-accounts.ts`); las fichas de varias
  parcelas (`lib/api/plot-characterizations.ts`) y el catálogo de variedades
  (`lib/api/cacao-varieties.ts`); los estados del lote y cómo se lee su código
  (`lib/lot-status.ts`, `lib/format/lot-code.ts`); y los ids de la cola que otro dominio necesita
  como padre (`lib/offline/queue-ids.ts`). El dominio dueño los usa desde ahí.
- **Actividades (`features/activities/`).** Programar, editar y eliminar son en línea; la
  realización pasa siempre por la cola (`completion-queue.ts`, `sync-adapter.ts`) y tiene su vista
  en la bandeja (`queue-view.tsx`). Retrasada y vencida no vienen guardadas: se calculan en el
  dispositivo con la fecha de Bogotá (`activity-state.ts`), porque la copia puede ser de ayer;
  `OVERDUE_AFTER_DAYS` tiene el mismo valor que la constante del servidor, y cada lado lo fija en
  su prueba. Las actividades se leen por mes y cada mes guarda su copia (`activity-cache.ts`).
  - **El calendario** (`/actividades`) tiene cinco vistas (Mes, Semana, Lista, Por parcela y
    Pendientes) y un resumen; la vista, el mes, la semana y los filtros viven en la URL con `nuqs`
    (`use-activity-view.ts`, `use-activity-month.ts`, `use-activity-filters.ts`). `use-calendar-data.ts`
    decide qué se lee según la vista: el mes, los meses que toca la semana (`use-activities-of-range.ts`
    une las copias mensuales, sin endpoint nuevo) o `GET …/pending` para Pendientes, que no tiene el
    límite de 120 días del listado y tiene su propia copia (`agricultural-activities:pending`).
  - **Filtrar, agrupar y contar son funciones puras** sobre `ActivityOfDay` (la actividad con el
    estado de hoy y su realización en cola): `activity-filters.ts`, `activity-plots.ts`,
    `activity-pending.ts`, `activity-summary.ts`. Una realización que espera envío cuenta como
    realizada (`effectiveState`). Las vistas solo pintan; los filtros corren en el dispositivo, así
    que funcionan igual sin conexión.
  - **Cambiar de periodo con el dedo y con el teclado.** Un deslizamiento amplio y horizontal
    (`lib/swipe.ts`, `use-swipe-navigation.ts`: 110 px y el doble de horizontal que de vertical) pasa
    al periodo siguiente o al anterior, y el calendario sigue al dedo, se devuelve si el gesto no se
    completa y entra deslizándose al cambiar de periodo (`activity-period-slider.tsx`, sin
    librerías, con `element.animate` y sin movimiento si el sistema lo pide); lo que se desplaza
    solo lleva `data-no-swipe`. Las flechas
    que se salen del mes o de la semana piden el cambio (`grid-navigation.ts`,
    `use-grid-navigation.ts`) y el día vecino recibe el foco (`focusDate`) cuando llega el periodo
    nuevo. El selector de periodo va junto a los recuentos, pegado al calendario.
  - **Los días de Pendientes** se eligen dentro de su lista (`activity-pending-view.tsx`), en la fila del
    título del primer grupo; esa vista no tiene fila de periodo.
  - **El formulario de programar** (`activity-plot-fields.tsx`) deja empezar por la finca o por la
    parcela: ambas listas se ven completas desde el inicio (hasta 100, ordenadas por productor, finca y
    código), **Finca** es un filtro con «Todas las fincas» y elegir una parcela rellena su finca sin acotar
    la lista (`activity-form-dialog.tsx` guarda la finca elegida aparte, `farmFilter`). La cuenta técnica
    puede acotar por productor (`activity-producer-field.tsx`), pero es opcional: el productor de los
    responsables sale de la parcela o la finca elegida. No viaja en la petición.
  - **Responsables por finca** (`assignees.ts`): se ofrecen las cuentas activas `assignable` que
    trabajan en la finca de la parcela (`farm_ids`) o en todas (`all_farms`, como el Productor). Las tarjetas y
    el detalle marcan **Responsable fuera de la finca** con la lista que el calendario comparte por
    `AssigneesContext`. Al registrar la realización, un empleado elige entre los insumos de la finca de
    la actividad (`useFarmInputs`); el Productor, del catálogo completo.
- **Cosechas (`features/harvests/`).** Registrar pasa siempre por la cola, con la ficha de la
  parcela como padre (`characterizationQueueId`): una cosecha no sale antes que la parcela y la ficha
  que espera. Corregir y eliminar son en línea, con `expected_version`, y solo mientras la cosecha no
  forme un lote. La lista se lee por mes, sin paginar, con copia del mes actual y el anterior
  (`harvest-cache.ts`); filtros y totales corren en el dispositivo (`harvest-filters.ts`, en décimas
  para no arrastrar errores de coma flotante) y lo que espera en la cola sale en su fecha como
  «Pendiente de enviar» (`harvest-rows.ts`). El formulario solo ofrece parcelas con siembras y sus
  variedades (`harvest-rules.ts`, con el tope de `MAX_KG_PER_HECTARE`, igual que el servidor); lo que
  se envía y lo que se corrige sale de `harvest-requests.ts`. Conformar el lote es de `lots`: las
  pantallas reciben `renderFormLot` con un `HarvestLotSource`, y `app/(app)/cosechas/form-lot.tsx` los
  une.
- **Lotes (`features/lots/`).** Todo en línea, sin copia ni cola: el código lo asigna el servidor y
  nunca hay uno provisional. Conformar (`form-lot-dialog.tsx`) genera el `id` una vez por diálogo, así
  que reintentar devuelve el mismo lote; si otra persona lo conformó primero, abre ese. La lista es
  paginada, y sus tarjetas de estado (`lot-status-cards.tsx`) cuentan lotes y kilos con
  `GET /api/lots/summary`, que sigue a los demás filtros pero no al estado.

- **Empleados y fincas.** Un empleado trabaja en una o varias fincas de su productor, o en todas
  (`all_farms`, que incluye las que se registren después), y solo alcanza lo de ellas; el servidor ya
  filtra todo. La sesión trae `farms` y `all_farms` (verdadero para el Productor, la cuenta técnica y
  el empleado con «todas»): la interfaz los usa para decidir qué ofrecer, nunca para autorizar.
  Quién es empleado lo dice `isFarmEmployee` (`lib/farm-scope.ts`): tiene productor y no alcanza todas;
  el Administrador de la asociación no lo es.
  - **Usuarios:** el alcance de un empleado (`account-scope-field.tsx`) es obligatorio para todos,
    tengan o no permisos de campo: «Todas las fincas» o fincas específicas, en casillas o, si un rol
    pide una sola, de una en una. Lo que se ofrece sale de lo que piden sus roles
    (`scopeOfRoles`, `lib/farm-scope.ts`) y de lo que alcanza quien lo da: «todas» solo la ofrece quien
    ya las alcanza todas. El alcance solo viaja al editar si cambió, y quitarle fincas avisa antes de
    guardar qué pasa con sus labores y su cola. La lista filtra por finca (`?finca=`, o `sin-finca`,
    que ahora es «sin alcance») y avisa cuántos empleados no tienen alcance
    (`missing-farms-notice.tsx`).
  - **Alcance del rol** (`role-scope-field.tsx`): el formulario de rol dice si sus cuentas trabajan en
    todas las fincas, en una o en varias (`farm_scope`). Lo trae cada rol, también el de las cuentas.
    Personalizar permisos parte del alcance del rol base.
  - **Personalizar permisos** (`customize-role-dialog.tsx`, `use-role-customization.ts`): desde el
    formulario de la cuenta, parte de un rol predefinido, quita permisos y lo guarda como rol propio,
    que queda elegido en lugar del original. Solo con `accounts.roles_manage`.
  - **Insumos:** un empleado trae a su finca un insumo de otra con «Entrada de otro insumo»
    (`catalog-entry-dialog.tsx`, búsqueda en el catálogo sin cantidades), dice en qué finca queda uno
    nuevo si trabaja en varias y no cambia la unidad.
  - **Selectores de finca:** quien trabaja en una sola (`onlyFarmOf`) los ve fijos en ella, sin «Todas
    las fincas» (insumos, filtro del calendario); en parcelas no se muestra el buscador de finca.
  - **Sin conexión:** si las fincas de la sesión cambiaron desde la copia del dispositivo,
    `saveSessionSnapshot` borra las lecturas guardadas (la cola se conserva) y el marco vuelve a pedir
    todo.
  - Un empleado de campo sin fincas ve un aviso arriba de todas las pantallas (`no-farm-notice.tsx`).
  - **Mes y Por parcela tienen forma de escritorio y de celular** (`useIsDesktop`): cuadrícula grande y
    tabla donde caben; en celular, una cuadrícula compacta con la agenda del día elegido (`?dia=`) y
    tarjetas por parcela. La cuadrícula es `role="grid"` con una sola parada de
    teclado; las fichas dentro de la celda no son paradas (`tabIndex={-1}`) y se alcanzan desde la
    lista del día.

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
  caché y se invalidan las listas, y también toda otra copia que muestre ese dato (el detalle
  de finca tiene la suya, `farms.detailView`, y el mapa las suyas): si no, al volver a esa
  pantalla se ve el valor anterior hasta que vence el `staleTime`.
- **Lo que llega al servidor desde la cola** se refresca con el adapter: `refreshAfterSync(item)`
  devuelve las query keys que ese registro cambia, y `useRefreshAfterSync` (montado en el marco
  de la sesión, que siempre está) las invalida cuando el motor avisa que el envío terminó bien.
  Un recurso nuevo de la cola declara ahí sus consultas; no se escribe un hook por pantalla que
  mire la cola, porque solo funciona si esa pantalla está abierta en el momento del envío.
- **Guardar en la cola no abre una pantalla de confirmación.** Un alta o una edición que pasa por la
  cola termina como cualquier guardado: vuelve al origen y avisa (`useFinishSave`). Lo que le pase
  después al registro lo cuentan la bandeja y el indicador de la cabecera, y, si el servidor lo
  rechaza, `useNotifyRejected` (en el marco de la sesión): un error que no se cierra solo, con
  «Revisar», que abre la bandeja donde se corrige o se descarta. Un recurso nuevo de la cola registra
  su `QueueView` (`kind`, `title`, `Actions`) y con eso ya tiene bandeja y aviso de rechazo.
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

### Avisos y volver al origen al guardar

- **Lo que terminó bien se avisa con `notify`** (`lib/notify.ts`): `notify.success('Finca actualizada')`,
  y `info`, `warning` o `error`. Se puede llamar desde cualquier archivo; el `Toaster`
  (`components/toaster.tsx`, montado en `app/providers.tsx`) los pinta con el Toast de Base UI. Duran
  5 s (8 s si llevan una acción, `{ action: { label, onClick } }`); el de error no se cierra solo. No
  se escribe un banner de éxito en la pantalla: si hay que confirmar algo, es un aviso. Quedan en
  pantalla (no son avisos) lo que sigue pendiente (la bandeja de la cola y el indicador) y la
  validación junto al campo; eliminar y desactivar conservan su diálogo de
  confirmación **antes**, y avisan al terminar. Cada diálogo avisa en la rama que corresponde (un 404
  al borrar algo que ya no existe no es un éxito). Con la cola, `useNotifyAfterSync` da un solo aviso
  («Se enviaron N registros») cuando termina de enviar lo que esperó sin conexión.
- **Un editor de página completa vuelve a donde se abrió.** El enlace que lo abre lleva
  `?origen=<ruta con sus filtros>` (`EditorLink` lo agrega solo; `withOrigin` si hace falta a mano);
  al guardar o cancelar, `useFinishSave(destinoDeSiempre)` (o `useReturnPath` para solo el destino)
  navega a ese origen y avisa; el aviso de un alta puede ofrecer el siguiente paso con `action`
  («Registrar otra parcela»). Cuando ese paso es de otro dominio, la página en `app/` lo entrega
  como función (`FarmForm` recibe `nextStep`). El valor lo puede escribir cualquiera, así que solo se acepta una ruta de
  la app (`isInternalPath` en `lib/navigation/origin.ts`); si no es válida o no hay, va al destino de
  siempre. Una pantalla nueva con editor usa `EditorLink` en lugar de `Link` para abrirlo.
- **Excepción: registrar una cosecha.** Las altas de la cola avisan y vuelven, sin pantalla
  intermedia, salvo la cosecha (`HarvestSaved`): al guardar se queda en la pantalla con «Registrar
  otra cosecha» (conserva la parcela, el recolector y la fecha), «Conformar lote»
  (solo con conexión y ya enviada) y «Listo», que vuelve al origen. En campo se registran varias
  recolecciones seguidas y volver a elegir todo cada vez estorba. Corregir una cosecha sí avisa y
  vuelve, como las demás.
- En pruebas, el aviso es un `role="dialog"` no modal: para afirmar que **no hay diálogo abierto** usa
  `queryDialog()` (`test/dialog.ts`) y no `queryByRole('dialog')`. Los componentes que leen la ruta
  usan el mock `navigation` de `test/router.ts` (`vi.mock('next/navigation', async () =>
  (await import('@/test/router')).navigation)`), con `mockLocation` para fijar ruta y parámetros.

### Reglas de diseño del código

- **Elegir de una lista: `SearchSelect` o el select nativo.** Más de unas 10 opciones o una lista que
  crece (fincas, parcelas, municipios, productores): `SearchSelect`, que se abre con la lista completa y
  se acota al escribir, con una entrada fija «Todas…» si el campo es un filtro, grupos y modo servidor
  (`onSearch`). Una opción puede llevar `detail` (una segunda línea, como el área y las variedades de
  una parcela) y `disabled` (se ve pero no se elige; el `detail` dice por qué). `ProducerFilter` y
  `FarmFilter` se arman con él. Lista corta y fija (tipo, etapa, mes,
  estados): el select nativo con `placeholder` si es obligatorio, sin una opción vacía de relleno.
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
- **Espacio en las listas.** Una tarjeta o fila de lista lleva su acción principal visible y un botón
  de icono por cada atajo frecuente; lo demás va en `ActionsMenu` (el «⋯»), pero solo desde la tercera
  acción: con dos acciones, los dos botones (el menú no ahorra nada). Los botones sobre tarjetas usan
  la variante `action` (borde y texto `--selva` sobre blanco), que se distingue del fondo. La fila de
  filtros es `FilterRow` (buscador siempre visible, el resto detrás de «Filtros» en celular) y una
  tabla pasa a tarjetas compactas en celular con `COMPACT_TABLE_CLASS` (sin «etiqueta: valor» por
  línea; el botón de ver cubre la tarjeta con `ROW_LINK_CLASS`). Los mapas de solo consulta ofrecen
  pantalla completa (`MapFrame expandable`); los editores no, porque sus botones quedarían tapados.
  Una tarjeta con menos de 400 px de contenido (`useNarrowContainer`, mide la tarjeta y no la
  pantalla) deja solo el «⋯» con todo adentro; lo que sume otro dominio entra al menú por
  `renderPlotMenuItems` y se abre con `requestSchedule`/`onScheduleRequest`. Cada dominio arma su
  menú; los diálogos de confirmación que se abren desde él se montan fuera del menú y se controlan
  con `ConfirmControl` (`useConfirmAction(..., control)`). Los filtros van en una fila, sin
  etiquetas visibles (`hideLabel`), y en el celular detrás de «Filtros». Los mapas que acompañan
  una lista (`MunicipalityMapPanel`, `PointsMapPanel`) aceptan `hiddenOnMobile`; el resumen se
  oculta junto con el mapa. Detalle y razones en `docs/ui/design-system.md` §7.
- **Toda ficha termina con «Volver» abajo a la izquierda** (`DetailFooter`; las acciones de la
  ficha, si tiene, van a su derecha). Volver lleva a la pantalla desde la que se abrió la ficha, con
  sus filtros (`readOrigin`; los enlaces que abren una ficha usan `EditorLink`), o a la lista de la
  sección si se entró directo. La ruta de arriba no basta para quien usa poco la web: un botón
  «Volver» sí se entiende. Hoy lo tienen las fichas de cosecha y de lote; las demás lo reciben en la
  pasada de estética.
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


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
- **Los avisos con la app cerrada (push)** también viven en el Service Worker: escucha `push` y
  `notificationclick`, y lo que deciden (qué mostrar, a qué ruta de la app llevar, qué ventana
  enfocar) son funciones de `lib/push/sw-messages.ts`, que se prueban sin un Service Worker. El enlace
  de una push siempre es una ruta de la misma app. Como el Service Worker no se registra en `next
  dev`, las push también se prueban con `pnpm build && pnpm start`, y el backend con sus llaves VAPID
  (sin ellas `push-config` responde `public_key: null` y la app no ofrece activarlas). **Cerrar
  sesión olvida la suscripción** del dispositivo antes de cerrar en el servidor
  (`forgetPushSubscription`): primero el navegador, que no necesita red, y al servidor lo espera a
  lo sumo 3 segundos.

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
                       /fincas, /actividades, /sanidad, /plagas-enfermedades, /cosechas, /lotes,
                       /fermentacion, /infraestructura, /usuarios, /roles y sus pantallas hijas. El
                       permiso y la conexión de cada sección se comprueban en el shell a
                       partir de config/navigation.ts: una sección nueva solo se suma ahí,
                       con su `group` (el menú agrupa por tarea; ver el sistema de diseño)
    providers.tsx      QueryClientProvider + NuqsAdapter
  features/<dominio>/  un dominio (hoy auth, producers, farms, plots, crops, inputs, activities,
                       health, notifications, harvests, lots, fermentation, drying, facilities,
                       postharvest-parameters, users y
                       roles): api.ts, schemas.ts, hooks propios
                       y reglas puras en la raíz, y components/ (pantallas y piezas de ese dominio).
                       La raíz nunca importa de components/: un tipo o una regla que comparten
                       los dos vive en la raíz
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
  compartidas con el aspecto de la app (`TextField`, `TextAreaField`, `SelectField`, `PasswordField`,
  `FormField`, `SearchSelect`, `SubmitButton`, `PageHeader`, `pageContainerClass`, `SummaryStrip`, `Pagination`, `EmptyState`, `ErrorState`,
  `MaskedValue`, la sección de insumos utilizados de `input-usage/`, el descarte de la bandeja
  `sync-tray/queue-discard-dialog.tsx`...) que solo reciben props y no conocen la API; (3)
  `features/<dominio>/components/`, pantallas (`*-screen.tsx`) y piezas de un dominio: la
  pantalla compone y obtiene los datos de los hooks de `features/<dominio>/api.ts`.
- **Piezas comunes antes que copiar** (se usan en vez de escribir lo mismo a mano):
  - formularios: `FormDialog` (diálogo siempre abierto que no se cierra mientras guarda) y
    `FormDialogForm` (el formulario dentro de un diálogo con su botón), con `submitDisabled` cuando
    todavía no hay nada que guardar (faltan las opciones que el formulario necesita); `CatalogItemDialog` con
    `useCatalogItemForm` para los catálogos de la asociación; `SaveConfirmDialog` para confirmar lo
    que no se corrige después; `InlineError` (error de una línea) y `FormMessage` (en caja);
    `serverErrorSummary` para lo que el servidor rechaza y no cae en un campo;
  - pantallas: `LoadingBlock` (esqueleto con su etiqueta), `UnavailablePage` («No fue posible
    abrir…» con el camino de vuelta), `SyncRejectedNotice` y `syncFailureText` (lo que el servidor
    rechazó de la cola), `OfflineCopyNotice` («Sin conexión: estás viendo la copia del…», con lo que
    no se puede hacer así), `CollapsibleGroupList` con `groupInOrder` (listas en grupos plegables),
    `mapPlaceholder` (el mapa mientras carga o si no cargó);
  - API: `apiPath` (ruta con su consulta, sin los vacíos) e `isNotFound` (404);
  - cola sin conexión: `rejectionConflict` y `VALIDATION_ERROR_CODE` en `lib/offline/adapters.ts`.
- **Un dominio no importa de la carpeta de otro.** Cuando una pantalla junta dos (el detalle de
  una finca muestra sus parcelas), el dominio dueño de la pantalla recibe la sección del otro como
  función (`renderPlots`) y quien las une es la página en `app/`, que sí puede importar de ambos.
  Esa página es de cliente (`'use client'`): una función no pasa de un componente de servidor a
  uno de cliente.
- **Lo que leen o escriben varios dominios vive en `lib/`, no en el dominio que lo creó.** Hoy:
  las fincas, las parcelas y el catálogo de insumos con sus existencias para elegirlos en un
  formulario de otro dominio (`lib/api/farm-options.ts`, `plot-options.ts`, `input-catalog.ts`); y
  cómo se escribe la cantidad de un insumo con su unidad y su equivalente en empaques
  (`lib/format/input-quantity.ts`, `input-units.ts`). Desde sanidad también: leer una actividad o una
  parcela suelta con su copia (`lib/api/activity-read.ts`, `plot-read.ts`), los responsables de una
  finca (`activity-assignees.ts`, `lib/assignable-accounts.ts`), los insumos que se ofrecen según
  quién registra (`lib/api/usable-inputs.ts`) y las filas de insumos utilizados
  (`lib/input-usage.ts`), quién registra una actividad (`lib/activity-recorders.ts`), las fechas de
  una labor (`lib/activity-dates.ts`), si una cuenta es de un empleado (`lib/employee.ts`, por sus
  roles y no por `all_farms`, que también tiene el empleado de todas las fincas), la preparación de
  una foto (`lib/images/prepare-photo.ts`), la fecha en la URL (`lib/navigation/iso-date-parser.ts`)
  y la cola por padre (`lib/offline/queued-by-parent.ts`). Desde notificaciones: los nombres de los
  tipos de actividad (`lib/activity-types.ts`), el estado calculado con la fecha de hoy
  (`lib/activity-state.ts`; actividades los reexporta), quién recibe avisos
  (`lib/notification-access.ts`), la suscripción a las push (`lib/push/`, `lib/api/push.ts`,
  `hooks/use-push-notices.ts`) y la tarjeta para activarlas (`components/push/`), que usan el panel y
  **Mi cuenta**. Desde cosechas y lotes también: cómo se nombra una finca o una
  parcela, `F02 · La Esperanza` y `P05 · Lote del río` (`lib/format/place-label.ts`, el código lo
  asigna el servidor y una parcela sin nombre que espera en la cola es «Parcela nueva»); el aviso
  con el código que el servidor dio a lo creado en el dispositivo (`assigned-code-notice.ts`,
  `hooks/use-notify-assigned-codes.ts`, que escucha `assignedCode` de cada adapter: finca, parcela y
  lote); las fichas de varias parcelas (`lib/api/plot-characterizations.ts`) y el catálogo de
  variedades (`lib/api/cacao-varieties.ts`); los estados del lote y su código partido en pedazos con su nombre
  (`lib/lot-status.ts`, `lib/format/lot-code.ts`) y lo que se hace con un lote en cada etapa
  (`lib/lot-actions.ts`: el tipo `LotAction`); y los ids de la cola que otro dominio necesita
  como padre (`lib/offline/queue-ids.ts`: la ficha y la cosecha). Desde fermentación: los campos de
  fecha y hora (`toBogotaLocal`, `fromBogotaLocal`, `formatTime` y `formatShortDateTime` en
  `lib/format/dates.ts`: un `datetime-local` guarda `yyyy-MM-ddTHH:mm` en la hora de Bogotá) y la
  ficha de un lote sin conexión (`lib/offline/postharvest-copies.ts`, ver Lotes). El dominio dueño
  los usa desde ahí.
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
  une. La cosecha de la cola guarda su `lotSource` (nombres de parcela, finca y variedad): con él se
  puede conformar su lote sin conexión desde la lista, mientras la cosecha sigue en el teléfono.
- **Lotes (`features/lots/`).** La lista es en línea, sin copia; bajo el estado de un lote en
  fermentación dice su cajón (el campo `fermentation` de `Lot`). La ficha también es en línea, salvo la
  de un lote que está en la copia de una lista de poscosecha: `useLot` lee con
  `readWithPostharvestCopy` (`lib/offline/postharvest-copies.ts`) y, sin respuesta del servidor, arma
  el lote con esa copia (`lotFromCopy`), con su aviso. La copia no guarda el código de socio ni quién
  conformó el lote: el origen dice **Productor —** y no se muestra **Conformado por…**. Esa función es
  la única que busca en las copias de poscosecha: el secado suma la suya en `COPIES`. La ficha no
  importa de los procesos: recibe sus secciones con `renderSections(lot)`, que pinta junto al
  origen (a su derecha en pantallas anchas, antes que él en celular, donde lo que se viene a hacer
  es la etapa) y que la página (`lot-detail-from-query.tsx`) llena en el orden del proceso. La ficha
  es ancha (`wide`) porque las etapas traen tablas: encabezado `bosque` con el código en pedazos
  (`LotCodeSegments`, dentro del título con `titleVisual`), franja de cifras, indicador de etapas
  (`lot-stages.ts`) y el origen en una `SectionCard`. **El «⋯» de cada fila de la lista** ofrece las
  acciones de la etapa del lote: cada módulo del proceso exporta las suyas (`lot-actions.ts`, p. ej.
  `fermentationLotActions` y `dryingLotActions`) y la página (`app/(app)/lotes/lot-list.tsx`) las junta; cada opción es
  un enlace a la pantalla donde se hace, nunca un formulario dentro de Lotes. Registrar un volteo va
  directo a su pantalla de campo; iniciar y finalizar abren su formulario al llegar a Fermentación
  (`?iniciar=` y `?finalizar=`). **El botón de la cabecera** sigue al estado elegido
  (`fermentationStageAction` y `dryingStageAction`: Generado → «Iniciar fermentación», En
  fermentación → «Ir a Fermentación», Fermentado → «Iniciar secado», En secado → «Ir a Secado»; con
  otro estado o sin el permiso, «Cosechas sin lote» queda como principal) y «Cosechas sin lote» pasa a
  secundario cuando hay uno. La tarjeta de un lote Seco dice su rendimiento. **Conformar** también
  funciona sin conexión: el lote nace en el dispositivo con su `id` (`form-lot-dialog.tsx` lo genera
  una vez por diálogo) y pasa por la cola (`lot-queue.ts`, `sync-adapter.ts`) con la cosecha como
  padre (`harvestQueueId`, en `lib/offline/queue-ids.ts` porque un dominio no importa de otro). El
  código lo asigna el servidor al recibirlo y un aviso dice cuál quedó (`assignedCode`, tipo `lot`);
  mientras tanto no hay código, ni provisional: la cosecha muestra «Lote pendiente de enviar». Con
  conexión y la cosecha ya en el servidor, el diálogo llama directo y abre la ficha del lote. Si otra
  persona lo conformó primero, abre ese; en la cola, ese caso (`harvest_already_in_lot`) y una cosecha
  eliminada (`404`) van a la bandeja solo con «Descartar». La lista es paginada, y sus tarjetas de
  estado (`lot-status-cards.tsx`) cuentan lotes y kilos con `GET /api/lots/summary`, que sigue a los
  demás filtros pero no al estado.

- **Infraestructura (`features/facilities/`).** Los cajones de fermentación y las marquesinas de
  secado, de una finca a la vez: `use-facility-farm.ts` decide si se pregunta la finca, si se entra
  a la recordada (`last-farm.ts`, sobre `lib/device-preference.ts`, el mismo almacenamiento de
  comodidad que usa la última parcela de cosechas) o si la cuenta técnica elige antes el productor.
  La lista se lee completa, con copia en el dispositivo (`useFacilities`); la finca, los filtros y el
  orden natural (`C-2` antes que `C-10`) corren aquí (`facility-filters.ts`, `facility-order.ts`).
  Registrar, editar, activar, desactivar y eliminar son solo en línea y se deshabilitan sin conexión.
  Al registrar, el nombre se propone según el tipo y la finca (`C-01`, `M-01`: `facility-name.ts` y
  `use-facility-name-suggestion.ts`), sobre la lista del dispositivo, y se respeta lo que la persona escriba.
  El estado Ocupado y el lote que ocupa llegan de la API: fermentación y secado no tocan esta
  pantalla. Las etiquetas por tipo y estado, con su concordancia de género, viven en
  `lib/facility-labels.ts` para que otros dominios nombren igual un cajón. Sin conexión o sin permiso
  de lotes, el lote se nombra pero no se enlaza. El aviso de nombre repetido es `DuplicateNotice`
  (`components/`), compartido con insumos, y `isNeverLoaded` (`lib/offline/paused-read.ts`) dice que
  una lectura nunca cargó por falta de red.

- **Fermentación (`features/fermentation/`).** `/fermentacion` es la lista de trabajo del día: dos
  pestañas (**En fermentación** y, con `manage_fermentation`, **Listos para fermentar**), la finca en la
  URL (`use-fermentation-filters.ts`) y las cifras. Las fermentaciones en curso se leen todas, sin
  paginar y con copia (`fermentation`, o `fermentation:producer:{id}` para la cuenta técnica); la finca
  se filtra en el dispositivo. Los listos son `GET /api/lots?status=generated`, todas las páginas y
  solo en línea (`useReadyLots`).
  - **Las horas y el próximo volteo se calculan en el dispositivo** (`fermentation-time.ts`,
    `next-turn.ts`, `fermentation-list.ts`), no se toman de la copia, que puede ser de ayer: el primer
    volteo a las 48 h y luego cada 24 h, las mismas constantes que el servidor. El número de un volteo
    es su posición por hora, también con los de la cola (`turn-rules.ts`), y las horas se comparan por
    minuto (`minuteOf`): el servidor no acepta dos volteos en el mismo minuto (`duplicate-turn.ts`
    avisa antes de guardar).
  - **Registrar un volteo pasa siempre por la cola** (`turn-queue.ts`, `sync-adapter.ts`,
    `queue-view.tsx`), sin padre: la fermentación se inicia solo en línea. La pantalla de campo es
    `/fermentacion/volteo?lote=` (precargada), que también corrige lo que la bandeja rechazó
    (`&pendiente=`) y, en línea, un volteo del servidor (`&id=`). Saca la fermentación de la copia de la
    lista o, si el lote no está en ella, del servidor (`use-turn-fermentation.ts`).
  - **Iniciar, corregir el inicio, finalizar, corregir y eliminar un volteo son solo en línea.** Iniciar
    pide `start-options` (los cajones libres de la finca del lote y los responsables) y, si el lote pesa
    más que el cajón, la confirmación (`use-start-submit.ts`, con las cifras del servidor si el `422` lo
    dice). Finalizar se deshabilita con su motivo (`finishBlockedReason`: sin volteos, con volteos en la
    cola o sin conexión).
  - **La tarjeta de cada lote** cuenta la fermentación como una **línea de tiempo** (`card-timeline.tsx`,
    con los datos resueltos de `card-details.ts`) en dos colores: verde lo que ya pasó (la barra hasta
    ahora y los volteos hechos) y cobre lo que falta o se atrasó (el próximo volteo y, si venció, el
    tramo de atraso). Cada punto dice su fecha y su medición al pasar el mouse o enfocarlo
    (`components/ui/tooltip.tsx`) y lleva el mismo dato como `aria-label`, porque en el celular no hay
    mouse; el texto de la tarjeta repite lo esencial. **Finalizar** también está en la tarjeta
    (`finish-fermentation-button.tsx`, el mismo botón de la ficha): se hace una vez por lote, pero
    desde donde se trabaja; con Registrar volteo y el ojo que lleva a la ficha quedan en una sola fila,
    también en celular. Las mediciones se escriben con decimales fijos (`measure-text.ts`: 45,0 °C y
    pH 4,90), no con los ceros quitados.
  - **La pantalla de campo del volteo** es una tarjeta con temperatura y pH lado a lado, también en
    celular, en grande y centrados; el título es solo «Volteo 4» y el código del lote va en la línea de
    debajo, para que quepa en una pantalla de celular sin desplazarse.
  - **La sección de la ficha del lote** (`fermentation-section.tsx`) la monta la página de lotes: un lote
    Generado ofrece iniciar; uno en fermentación o más adelante muestra sus datos, sus acciones y la
    tabla de volteos (`turn-rows.ts`, con los de la cola como «Pendiente de enviar»). Sin conexión se
    lee con la misma copia de la lista y lo que escribe en línea se deshabilita.

- **Secado (`features/drying/`).** `/secado` es la lista de trabajo del día y sigue la forma de
  Fermentación: dos pestañas (**En secado** y, con `manage_drying`, **Listos para secar**), la finca en
  la URL (`use-drying-filters.ts`), las cifras (incluye las bitácoras de hoy que faltan) y la lectura
  con copia (`drying`, o `drying:producer:{id}`); los listos son `GET /api/lots?status=fermented`, solo
  en línea. **Lo que comparte con Fermentación vive en `lib/` y `components/`, no se copia:**
  `lib/offline/record-queue.ts` y `hooks/use-record-queue.ts` (la cola de un registro de campo de un
  lote: un volteo, una bitácora), `lib/api/lots-by-status.ts`, `lib/farm-filter.ts`,
  `components/process-toolbar.tsx` (pestañas y finca), `components/finish-process-button.tsx`,
  `components/start-warning.tsx` y `hooks/use-start-from-link.ts`. La copia de la lista se suma a
  `lib/offline/postharvest-copies.ts`, que arma la ficha de un lote sin conexión.
  - **Las reglas que comparten pantalla y servidor son funciones puras con las mismas constantes que
    el backend:** el día de secado (el día 1 es la fecha del inicio en la hora de Bogotá,
    `drying-days.ts`), las horas disponibles de un día (el día 1 cuenta desde la hora de inicio; hoy,
    hasta ahora) para el tope de horas al sol y a la sombra, y el rendimiento (peso seco sobre peso
    en verde, con el mismo redondeo, `yield.ts`). Lo de hoy se calcula en el dispositivo
    (`drying-list.ts`), con las bitácoras de la cola incluidas.
  - **Registrar una bitácora pasa siempre por la cola** (`log-queue.ts`, `log-sync-adapter.ts`,
    `queue-view.tsx`; recurso `drying-logs`, sin padre). La pantalla de campo es
    `/secado/bitacora?lote=` (precargada), que también corrige lo que la bandeja rechazó
    (`&pendiente=`) y, en línea, una bitácora del servidor (`&id=`): ocho campos, el clima con cuatro
    opciones grandes, y la frecuencia de volteo solo se pide si hubo volteos. **Una bitácora por
    fecha:** el formulario avisa con lo que conoce el dispositivo (`duplicate-log.ts`) y el servidor
    decide.
  - **Iniciar, corregir el inicio, finalizar, corregir y eliminar una bitácora son solo en línea.**
    Iniciar pide `start-options` y, si la humedad de entrada cae fuera del rango, la confirmación
    (`use-start-submit.ts`). Finalizar calcula el rendimiento mientras se escribe el peso seco y se
    deshabilita con su motivo (`finishBlockedReason`: sin bitácoras, con bitácoras en la cola o sin
    conexión). La humedad se escribe con un decimal fijo.
  - **La tarjeta de cada lote** dibuja un punto por día de secado (`day-timeline.tsx`): lleno con
    bitácora, punteado sin ella, y hoy con un halo; cada punto dice su fecha y su humedad en un
    tooltip y como `aria-label`. La ilustración de los vacíos es propia (`SunDryingTray`), no la de
    Infraestructura. La sección de la ficha del lote (`drying-section.tsx`) muestra los datos y la
    bitácora día por día (`log-rows.ts`, con los días sin registro como fila tenue) en una tabla que
    cabe sin desplazarse a 1280 px.

- **Parámetros de poscosecha (`features/postharvest-parameters/`).** `/parametros-poscosecha` es un
  formulario de página (sin banner, `narrow`) con los 15 valores con los que se evalúa el secado, en
  dos tarjetas, **Secado** y **Alertas del secado**, que se ven de una en una con pestañas (`?seccion=`,
  `use-parameters-section.ts`): juntas eran demasiado altas, sobre todo en celular. Si guardar falla,
  se abre la pestaña con el primer error y la otra dice cuántos valores hay por revisar. Los
  parámetros son del productor, no de una
  finca. La respuesta trae la línea base (`baseline`), así que el frontend no tiene copia de ella.
  - **Las reglas son funciones puras** (`parameters-form.ts`, con los campos y topes en
    `parameter-fields.ts`): los porcentajes de 0 a 100 con un decimal (`lib/validation/percent.ts`,
    compartido con el secado), los días y las horas enteros y mayores que cero con sus topes (60 días,
    240 horas), el mínimo de cada rango no mayor que el máximo (el error va en el campo **Mínimo**),
    qué campos son **Cambiado** (contra la línea base) y si hay cambios sin guardar (contra lo
    cargado). Los textos de lo que hace cada parámetro están en `parameter-rows.ts`.
  - **Se cambia solo en línea:** guardar reemplaza los 15 valores con `expected_version`;
    **Restablecer línea base** pide confirmar y avisa que los cambios sin guardar se pierden;
    `stale_version` carga los valores vigentes. La lectura tiene copia en el dispositivo
    (`postharvest-parameters`, o `postharvest-parameters:producer:{id}` para la cuenta técnica): sin
    conexión, o con permiso solo de consulta, los valores se ven como datos
    (`parameters-readonly.tsx`). La cuenta técnica elige el productor con `?productor=`.

- **Sanidad (`features/health/`).** El monitoreo y el control fitosanitario **son actividades**:
  sanidad guarda lo suyo (resultado, detecciones, controles, fotos) y no importa de actividades, ni
  actividades de sanidad. La página de `/actividades` (`calendar-with-health.tsx`) es la que los une y
  le entrega al calendario, como props: dónde se registra un monitoreo (`monitoringHref`), qué agrega
  al detalle (`renderActivityDetails`), el aviso de detecciones que esperan un control
  (`renderNotice`), el recurso de la cola que cierra un monitoreo (`closingResources`) y los
  controles programados que esperan en el dispositivo (`queuedActivities`, marcados `queued`). Lo
  mismo hacen las páginas de parcelas con el enlace al historial, junto a la ficha.
  - **La pantalla de Sanidad** (`/sanidad`, `health-screen.tsx`) tiene dos pestañas (`vista=` en la
    URL, `use-history-filters.ts`). Sin `vista` abre en **Pendiente** si hay algo que le toque a quien
    mira (monitoreos por registrar o controles por atender) y en **Historial** si no; la decisión se
    toma una sola vez para que resolver lo último pendiente no cambie la pantalla. Las dos comparten
    los filtros de finca y parcela; Pendiente no muestra plaga ni periodo (`placesOnly`).
    - **Pendiente** (`pending-tab.tsx`, datos de `use-pending-items.ts`): **Por registrar (N)**
      (`GET …/agricultural-activities/pending?activity_type=`, hoy y retrasados o vencidos, con
      **Registrar** que abre la planilla y vuelve a Sanidad, sin tope de filas; no ofrece registrar el
      de un compañero a quien solo registra lo suyo y dice «Guardado en el teléfono» si su resultado
      espera en la cola), **Controles por atender (N)** (las detecciones con un control pedido y sin
      atender, con las mismas decisiones que el aviso del calendario) y **Próximos monitoreos (N)**
      (los programados desde mañana, 120 días: salen del listado de actividades filtrado en el
      cliente por tipo y estado, `upcoming-monitorings.ts`, y cada uno abre su detalle en el
      calendario). Lo de «por registrar» y «controles por atender» cuenta en la pestaña; lo que viene
      no, porque todavía no se puede hacer nada con ello.
      Una fila con enlace (Registrar, Programado) es una tarjeta que se abre tocándola en cualquier
      parte, no solo el botón: el enlace se estira con un `::after` (`pending-row-class.ts`).
    - **Historial** (`history-tab.tsx`, `history-cards.tsx`): una tarjeta por monitoreo con la fecha,
      la parcela y quién lo registró arriba, y una fila por plaga o enfermedad encontrada
      (`history-rows.ts`) con la incidencia en grande y su barra, el estado del control y, si no
      tiene control, sus acciones (en «⋯» por debajo de `xl`); un monitoreo sin hallazgos dice «Sin
      presencia». Desde `xl` lo encontrado y la incidencia tienen ancho fijo para que las barras
      queden alineadas entre tarjetas. El **Detalle** de cada monitoreo (qué se evaluó, quién lo
      registró, observaciones y fotos a pedido, `monitoring-result-parts.tsx`) se abre dentro de su
      tarjeta. De a 20, con filtros de plaga y periodo en la URL
      (`finca`, `parcela`, `plaga`, `desde`, `hasta`, `pagina`, y `productor` para la cuenta
      técnica) y copia en el dispositivo por filtros y página. Con una parcela elegida muestra además
      el resumen por plaga (`pest-summary-cards.tsx`: la última incidencia, si sube o baja en puntos y
      las dos barras); sin ella no, porque comparar parcelas distintas no dice si una plaga
      sube o baja. Desde la tarjeta de una parcela se abre ya filtrado (`plotHistoryPath`, que trae
      `vista=historial`).
    - **Programar monitoreo** (arriba) no programa aquí: lleva al calendario
      (`/actividades?programar=monitoreo&finca=&parcela=&origen=`), que abre su formulario con el
      tipo y la parcela elegidos y vuelve a Sanidad al guardar o cancelar (`use-schedule-link.ts`,
      `linked-schedule-dialog.tsx`).
  - **El monitoreo no está en la lista de tipos de actividad** (`SCHEDULABLE_ACTIVITY_TYPE_OPTIONS`
    tampoco trae el control): se programa con **Programar monitoreo**, un botón junto a «Programar
    actividad» (y uno más chico sobre el flotante en celular) que abre el mismo formulario con el
    tipo elegido y fijo (`preset.activityType`). Editar un monitoreo lo conserva como único tipo.
  - **La planilla** (`/sanidad/monitoreo?id=`) pasa siempre por la cola (`monitoring-results`, con la
    actividad como padre). Cada detección y cada control llevan el `id` que genera el dispositivo;
    el control de una detección tiene cuatro modos (ninguno, hecho en el momento, para después y, para
    quien no programa, pedido a quien programa). Un monitoreo registrado no se corrige: antes de
    guardar se muestra el resumen. Rechazado por una plaga o un insumo inactivos, **Corregir** lo
    reabre con esa elección vacía.
  - **Lo que el catálogo sugiere** (`recommendations.ts`, funciones puras): al elegir una plaga la
    unidad del monitoreo pasa a la que sugiere (`suggested_sampling_unit`) mientras la persona no la
    haya elegido a mano, y al hacer o programar un control llega elegido el recomendado
    (`suggested_control_method`, nunca `other`). Lo precarga `use-suggested-method.ts`, que solo toca
    el campo si está vacío o con lo último que puso él. Son ayudas: nada se bloquea. Los árboles
    evaluados sí tienen tope, los de la ficha de la parcela (`plotTrees`), que lee y entrega
    `monitoring-from-query.tsx` porque la ficha es de `crops`.
  - **El control desde una detección** es un diálogo y pasa por la cola (`phytosanitary-controls`,
    con la detección como padre). Rechazado, solo se descarta y se vuelve a crear desde la detección.
    **No requiere control** es en línea.
  - **Las fotos** (`evidence`) esperan en la cola a lo que respaldan: su padre es el resultado del
    monitoreo o el control, si siguen en ella. Se preparan en el teléfono antes de guardarlas
    (`prepare-photo.ts`: solo JPG o PNG, 1600 px, hasta 5 MB y siempre como JPEG, para que pierdan sus
    metadatos, entre ellos la ubicación). El archivo se pide a la API (`apiFetchBlob`), nunca con
    `<img src>`, y el teléfono guarda su copia (`evidence-file:{id}`). **Tomar foto** usa `capture`
    en un celular o una tableta; en un computador, donde `capture` solo abre el selector de
    archivos, abre la cámara del equipo (`webcam-dialog.tsx`, solo en https o localhost) y, si no
    hay cámara o permiso, ofrece el selector.
  - Los catálogos de la asociación (`/plagas-enfermedades`) se gestionan como **Variedades de cacao**,
    pero con la búsqueda y el estado en la URL; el buscador de la planilla muestra la descripción de
    cada plaga y **Otra** siempre al final (`SearchSelect` con `description` y `pinned`).

- **Notificaciones (`features/notifications/`).** La campana de la cabecera y su panel. La
  cabecera la arma `SessionShell` (de `auth`): la página `app/(app)/layout.tsx` le entrega la campana
  como `headerActions`, igual que las vistas de la bandeja (`queueViews`), y va entre la bandeja y la
  cuenta. Solo la ven las cuentas de un productor que ven actividades (no la cuenta técnica ni la
  asociación).
  - **Lo que dice cada aviso** son funciones puras (`notification-text.ts` y sus partes): el
    título cambia si quien lee es el responsable, los días de retraso son los **de hoy** (la copia
    del dispositivo puede ser de ayer), y si la actividad ya no está en la condición del aviso
    (realizada, reprogramada, el control ya programado) lo dice y se ve atenuado. Un tipo que esta
    versión no conoce dice **Aviso** y no lleva enlace, en vez de fallar.
  - **La bandeja** pide la lista solo con el panel abierto, de a 20 (`useInfiniteQuery`), y el número
    cada 2 minutos. Las dos tienen copia en el dispositivo (solo la primera página). Sin conexión
    se ven las guardadas, abrir una no la marca como leída, y marcar y eliminar quedan deshabilitados
    con su motivo: no hay cola para eso.
  - **Lo que cambia una actividad o una detección** (realizar, reprogramar, eliminar, programar un
    control, **No requiere control**, también al llegar desde la cola) invalida
    `queryKeys.notifications.all()`.
  - **Los enlaces:** `?actividad=` es del calendario (`use-linked-activity.ts`): abre el detalle, pasa
    al mes de la actividad si se reprogramó o avisa **La actividad ya no está disponible**. La
    campana atiende en cualquier pantalla `?notificacion=` (la marca como leída; sin conexión espera)
    y `?notificaciones=abiertas` (abre el panel). Atendidos, salen de la URL. La puerta de entrada
    (`/`) conserva la consulta al redirigir, porque la push de resumen lleva ahí.

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
- **Archivos.** Con un `FormData` en el cuerpo, `apiFetch` no lo convierte a JSON ni pone
  `Content-Type` (el navegador pone el suyo, con el separador de las partes): así se sube una foto,
  la única petición de la API que no es JSON. `apiFetchBlob(path)` devuelve un archivo con la misma
  sesión, renovación y errores.
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
  (también sin conexión: el lote espera en el teléfono con su cosecha) y «Listo», que vuelve al
  origen. En campo se registran varias
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
- **Una pantalla se compone, no se calcula.** Lo que lee y decide va en un hook del dominio
  (`use-<pantalla>.ts`, que devuelve datos ya resueltos); cada decisión (qué acciones aplican, de qué
  finca se ven las existencias, qué muestra el calendario con los filtros) es una función pura con
  nombre y con su test, nunca un ternario anidado en el JSX; cargando, vacío, error y avisos son
  componentes propios; y la pantalla solo compone. Es la forma de `useInputList`/`resolveStockFarm`,
  `plotActions`, `filterCalendar` o `accountActions`. Señales para partir (referencia, no regla
  automática): una función de más de 150 líneas o de complejidad ciclomática mayor de 25. Se mide al
  cerrar cada sprint con
  `pnpm exec eslint src --ignore-pattern "**/*.test.*" --rule '{"max-lines-per-function":["warn",{"max":150,"skipBlankLines":true,"skipComments":true}],"complexity":["warn",25]}'`.
- **Leer la cola y seguirla: `useLiveRead`** (`hooks/use-live-read.ts`), con una clave que nombra a
  la persona y lo que se pide: mientras llega una lectura nueva no devuelve la de otra persona que
  usó el equipo. No se escribe otra suscripción con `liveQuery` a mano (las de actividades,
  caracterización, parcelas y fincas son anteriores y pasan a él cuando se toquen).
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
- **Lo que manda o guarda archivos se prueba en el entorno `node`** (`// @vitest-environment node`
  al inicio del archivo): el `Blob` y el `FormData` de jsdom no los entiende el `fetch` de las pruebas
  y no sobreviven a IndexedDB. Por eso la lectura de un archivo vive en una función sin React
  (`readEvidenceFile`) que se prueba ahí. jsdom tampoco tiene lienzo ni `URL.createObjectURL`: las
  pantallas con fotos simulan `preparePhoto` (que tiene sus pruebas) y esas direcciones.
- **jsdom no tiene Service Worker, push ni permiso de notificaciones.** Lo que se le pide al
  navegador para las push entra como parámetro (`PushBrowser` en `lib/push/subscription.ts`) y se
  prueba con uno simulado; las pantallas simulan ese módulo. Lo del Service Worker se prueba en las
  funciones de `lib/push/sw-messages.ts`.
- MSW simula la API (`src/test/server.ts`, levantado en `vitest.setup.ts`): una petición sin
  handler hace fallar el test, así que ninguno toca la red. Los handlers propios de cada
  test se declaran con `server.use(...)`.
- Utilidades de `src/test/`: `renderWithProviders` (QueryClient de pruebas + adaptador de
  `nuqs`; acepta `searchParams` y `onUrlUpdate`), `router` (doble de `useRouter` para
  `vi.mock('next/navigation', ...)`), `factories` (`buildSession`, `buildProducer`,
  `buildPage`, `apiError`, `sessionExpired`...), `handlers` (`apiUrl`, `csrfHandler`,
  `municipalitiesHandler`) y `expectVisibleFocusOutline`.
- **El test espera lo que lee.** Bajo carga (la suite completa) una tabla o un aviso puede no estar
  cuando el test lo busca: `findBy*`/`waitFor`, y esperar la tabla además del aviso en un test de
  «sin conexión». No se arregla alargando tiempos.
- **jsdom no es un celular ni un navegador completo:** no tiene `matchMedia` y la pantalla que simula
  es la de un celular (`stubWideScreen()` de `src/test/screen-size.ts` para las pruebas de escritorio).
- **Nada deja un temporizador vivo más allá de su componente sin comprobar que su entorno sigue
  ahí.** Un `setTimeout` que usa `window` cuando vence debe tolerar que ya no exista
  (`typeof window === 'undefined'`): el entorno de pruebas se desmonta antes y Vitest sale con código
  1 por un error no capturado aunque todas las pruebas pasen.
- Cada función pura extraída de una pantalla lleva su test, y un caso negativo por flujo.
- Al cerrar un sprint se corre la suite **completa** (`pnpm test`), no solo lo relacionado con lo
  que cambió, y se anota el resultado en el PR.
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
- **Un host externo nuevo necesita permiso de seguridad.** El Service Worker pide los mapas con
  `fetch`, así que la política de seguridad (`connect-src` en `src/config/security-headers.ts`) tiene
  que admitir su host; se agrega en el mismo PR que lo introduce y se prueba con el mapa real.
- **Una animación con `transform` en un contenedor de barras fijas** vuelve a ese contenedor el
  bloque de contención de lo fijo mientras dura: la barra se desplaza. El fundido de pantalla usa solo
  opacidad, y las entradas usan `backwards` (no `forwards`) para no dejar `transform` al terminar.
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
- **Encabezado y ancho, siempre los mismos.** Toda pantalla abre con `PageHeader` (categoría, título y
  descripción). Las listas y los detalles le pasan `tone` y `accent` y se vuelve un banner de color
  (`components/page-blocks/detail-hero.tsx`): `selva` en las de trabajo diario, `bosque` en los detalles
  del campo y `claro` en administración y catálogos; los formularios no llevan banner. Las cifras van
  en una franja suelta (`StatStrip`, `SummaryStrip`), las secciones de un detalle en `SectionCard` (con
  filete del acento solo si hay varias) y los datos en `KeyValues`. Los filtros son todos blancos y de
  40 px (`FILTER_CONTROLS_CLASS`) y siguen un orden: principal, productor, lugar, atributos, estado,
  periodo, «Más filtros». Detalle en el sistema de diseño §7. Cada pantalla envuelve su contenido en
  `pageContainerClass('wide' | 'narrow')`: `wide` para listas, calendarios y lo que lleva mapa o tabla,
  `narrow` (centrado) para formularios y fichas de una columna. No se escribe un `max-w-*` ni un
  `py-*` propio en una pantalla. Toda `grid` con columnas desde un punto de corte lleva `grid-cols-1`
  de base, o una tarjeta con texto largo ensancha la columna y se sale de la pantalla en el celular.
  Los totales de arriba de una lista usan `SummaryStrip`. Una lista con mapa usa `MapBesideList`, y
  las hojas laterales (cuentas, roles) comparten `SidePanelHeader`/`SidePanelSection`/
  `SidePanelActions`. Qué es modal, hoja o página está en el sistema de diseño.
  - **Modales y hojas en celular.** El botón de cerrar (`ModalClose`) va pegado arriba mientras el
    contenido se desplaza, con fondo propio (se ve sobre una franja de color y sobre el contenido);
    el recuadro declara su relleno y su `gap` en `--pad` y `--gap` (una hoja sin relleno los pone en
    0). «Atrás» cierra el modal en vez de salir de la pantalla (`useBackToClose`, dentro de
    `Dialog`); un modal que se abre con la dirección y ya trae su entrada de historial
    (`history: 'push'`, las hojas de cuentas y roles) pasa `closeOnBack={false}`. Mientras se edita
    algo del registro que se veía, la hoja conserva su franja (`SidePanelEditBand`).
  - **Barras y tarjetas.** Una barra fija (`MobileActionBar`) lleva `mb-0!`: el `space-y-*` del
    formulario le pondría margen abajo y quedaría despegada del borde. En la tabla compacta las
    celdas que comparten fila llevan `max-md:col-span-1!` (con `!`) y la fila tiene fondo de tarjeta,
    para distinguirse del fondo crema de la página. Una tarjeta con un enlace principal se abre
    tocándola en cualquier parte (`stretched-link-class`).
- **Ilustraciones.** Cada módulo tiene la suya en `components/illustrations/`, dibujada con las piezas
  de `components/brand/cacao-parts.tsx` y la paleta del sistema (SVG plano de 160 × 140, decorativo,
  `aria-hidden`). Sale en todo estado vacío, también el que dejan los filtros, y en los avisos de
  pantalla completa, pasada con `illustration` a `EmptyState`/`PageNotice`; la mata de cacao queda para
  lo que no es de un módulo y las páginas de error. Nunca en encabezados, tarjetas, tablas,
  formularios, avisos flotantes ni errores. Un módulo nuevo agrega la suya.
- **Movimiento.** Solo CSS, con `motion-fade` (el contenido al navegar, solo opacidad), `motion-rise`
  (los bloques que entran con la pantalla), `motion-pop` (la ilustración de un vacío) y
  `motion-stagger` (los hijos de una lista o grilla de tarjetas; las filas de `TableBody` ya lo
  traen). Menos de 300 ms, curva `--ease-out`, nada se repite ni se anima solo, y con «reducir
  movimiento» todo pasa de inmediato (regla global). Detalle en el sistema de diseño, «Movimiento».
- **Una pantalla nueva nace con todo esto** (la definición de terminado de su parte visual): el
  encabezado, el ancho y los filtros de arriba; formularios con `FormDialog` y error arriba; los seis
  estados cada uno con su pieza (vacío con la ilustración del módulo, `LoadingBlock`, `ErrorState`,
  `OfflineCloud` sin conexión, `SyncRejectedNotice`, `notify.success`); movimiento con las utilidades
  `motion-*`; revisada a 390 y 360 px y en escritorio, con contraste, foco y etiquetas; y sin piezas
  escritas a mano que ya existen (ver «Piezas comunes antes que copiar»).
- **Toda ficha termina con «Volver» abajo a la izquierda** (`DetailFooter`; las acciones de la
  ficha, si tiene, van a su derecha). Volver lleva a la pantalla desde la que se abrió la ficha, con
  sus filtros (`readOrigin`; los enlaces que abren una ficha usan `EditorLink`), o a la lista de la
  sección si se entró directo. La ruta de arriba no basta para quien usa poco la web: un botón
  «Volver» sí se entiende. Hoy lo tienen las fichas de cosecha, de lote, de finca y de productor; el
  historial de la ficha de una parcela ya trae su «Volver» arriba.
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


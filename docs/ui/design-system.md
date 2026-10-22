# Ruta del Cacao — Sistema de diseño «Selva Viva»

Fuente de verdad visual del frontend. Si una pantalla y este documento se contradicen, gana este
documento; si falta algo aquí, se decide y se escribe aquí antes de codificarlo.

- Stack: Next.js + Tailwind CSS + shadcn/ui.
- Los tokens viven en `src/app/globals.css`.
- Referencias visuales: `docs/ui/ref/*.html` (HTML estático, abrir en el navegador).
- Restricciones de producto que condicionan la UI: RNF-02 responsive, RNF-21 Offline First,
  RNF-06/07 roles y permisos, RNF-18 protección de datos personales.

---

## 1. Idea de la dirección

Marca de origen (verde selva + cobre + serif editorial) sobre un producto de datos claro y denso.
Un mismo sistema con **dos densidades**:

| | Oficina (escritorio) | Campo (móvil) |
|---|---|---|
| Objetivo | Leer y comparar muchos datos | Capturar rápido, con sol y guantes |
| Alto de controles | 40–44 px | 60–76 px |
| Bordes | 1 px `--border` / `--input` | 2.5 px `--ink` |
| Radios | 10 / 14 px | 12 px |
| Estados | Píldora tintada (`bg` claro + texto de color) | Bloque sólido (fondo saturado + texto blanco/negro) |
| Sombras | Suaves y difusas | Ninguna (no se ven al sol) |

Regla general: en campo nada depende de un matiz suave. Contraste alto, área táctil grande,
ícono + texto siempre.

---

## 2. Color

### Marca

| Token | Hex | Uso |
|---|---|---|
| `--selva` | `#14362A` | Color primario: encabezados de marca, botón primario, barras oscuras |
| `--selva-2` | `#1F5C45` | Verde medio: enlaces, gráficos, chip activo |
| `--selva-barra` | `#1D4B3B` | Barra lateral y menú móvil: un tono más suave que el encabezado, para que el marco no se sienta tan oscuro |
| `--cobre` | `#9A5220` | Acento de marca: etiquetas de sección, subrayados, botón de acción secundaria fuerte |
| `--oro` | `#C9A24B` | Solo ornamento sobre fondo oscuro (línea botánica, versalitas) |
| `--crema` | `#F7F2EA` | Fondo de la aplicación |
| `--ink` (chocolate) | `#231812` | Texto principal y borde de controles de campo |

Colores de ilustración (mazorcas, estados sanitarios): `--amarillo-mazorca #E3A92B`,
`--morado-cacao #6B2A3A`, `--hoja #3F7A4E`, mazorca negra `#2E211B`, monilia `#C9C58A`.

### Neutros de interfaz

| Token | Hex | Uso |
|---|---|---|
| `--surface` | `#FFFFFF` | Cards, tablas, barra superior |
| `--muted-fg` | `#5A4A40` | Texto secundario (7,6:1 sobre crema) |
| `--border` | `#DDD2C2` | Separadores y bordes decorativos |
| `--input` | `#8F7F70` | Borde de inputs en oficina (3,9:1, cumple para elementos no textuales) |

`--oro` **nunca** se usa para texto sobre fondo claro (no alcanza 4.5:1). Sobre `--selva` sí (5,5:1).

### Mapa por municipios

Escala de verdes para colorear cada municipio según cuántas fincas tiene frente al que más tiene.
El color nunca va solo: cada municipio con fincas lleva su cifra encima, y el mapa del departamento lleva una leyenda (`MapLevelLegend`) y, junto a él, un resumen con el total y las fincas de cada municipio.

| Token | Hex | Uso |
|---|---|---|
| `--map-level-0` | `#EBE3D3` | Municipio sin fincas |
| `--map-level-1` | `#D7E8DC` | Hasta una quinta parte del máximo |
| `--map-level-2` | `#A9CDB5` | Hasta dos quintas partes |
| `--map-level-3` | `#6FA684` | Hasta tres quintas partes |
| `--map-level-4` | `#3D7A58` | Hasta cuatro quintas partes |
| `--map-level-5` | `#14362A` | El máximo (igual a `--selva`) |
| `--map-mask` | `#F6F1E7` | Fondo del mapa del departamento (con puntos y sombra bajo los municipios) y lo que queda fuera del municipio elegido, sobre el mapa base |

### Estados semánticos

Dos juegos con el mismo significado. El *tintado* es para oficina; el *sólido* para campo y para
cualquier aviso crítico.

| Estado | Tintado (texto / fondo) | Ratio | Sólido (texto / fondo) | Ratio | Significado en el dominio |
|---|---|---|---|---|---|
| Éxito | `#1F6B45` / `#E1EFE6` | 5,4:1 | `#FFFFFF` / `#1F6B45` | 6,5:1 | Lote aprobado, grado A, sincronizado, GPS con buena precisión |
| Advertencia | `#7D4E00` / `#F8E7C2` | 5,8:1 | `#231812` / `#F2C037` | 10,2:1 | Volteo pendiente, control fitosanitario por vencer, humedad al límite |
| Error | `#9E1F1F` / `#F6DEDA` | 6,1:1 | `#FFFFFF` / `#A3161B` | 7,8:1 | Lote descartado, alerta vencida, fuera de rango del productor |
| Información | `#20507A` / `#DFE9F2` | 6,9:1 | `#FFFFFF` / `#20507A` | 8,4:1 | Sin conexión, registros en cola, proceso en curso |

Reglas obligatorias:

1. Todo estado se comunica con **ícono + texto**, nunca con color solo.
2. Cada estado tiene su forma de ícono propia: check, triángulo, X en círculo, «i» en círculo.
3. Texto sobre fondo mínimo 4.5:1 (3:1 desde 24 px). Todos los pares de arriba ya cumplen.

---

## 3. Tipografía

- **DM Serif Display** (400, y su itálica): marca, títulos de página y sección, cifras grandes.
  La itálica se usa para una palabra dentro del título, no para frases enteras.
- **Karla** (400, 500, 700, 800): todo el resto de la interfaz, tablas, formularios, etiquetas.

| Rol | Fuente | Tamaño / peso | Notas |
|---|---|---|---|
| Display | DM Serif | 46–52 / 400 | Portadas, página pública del QR |
| H1 de página | DM Serif | 34 / 400 | Una por pantalla |
| H2 de card | DM Serif | 22–24 / 400 | |
| H3 / subtítulo | Karla | 18–20 / 800 | Cuando el serif estorba |
| Cuerpo | Karla | 15–16 / 400-500 | Interlínea 1.45 |
| Etiqueta de sección | Karla | 12 / 800, mayúsculas, `letter-spacing: .14em`, color `--cobre` | El sello del sistema |
| Cifra en tabla | Karla | 15 / 700, `font-variant-numeric: tabular-nums` | Alineada a la derecha |
| Cifra destacada (KPI, área, coordenadas) | DM Serif | 24–40 / 400, color `--selva` | |
| Campo · etiqueta | Karla | 16–18 / 800 | |
| Campo · valor numérico | DM Serif | 26–38 / 400 | Peso, cantidad, área |

En Next.js, con `next/font/google`, expuestas como `--font-serif` y `--font-sans`.

---

## 4. Forma, espacio y elevación

- **Radios:** 8 (chip), 10 (input y botón de oficina), 12 (control de campo, card pequeña),
  14 (card), 18 (card de autenticación), 999 (píldora y avatar). Imágenes y fotos: 0 o 14.
- **Espaciado:** múltiplos de 4; el ritmo habitual es 8 / 12 / 16 / 20 / 24 / 32.
  Padding de card 18–20; de página 24 vertical y 32 horizontal.
- **Sombra (solo oficina):** `0 1px 2px rgba(35,24,18,.06), 0 8px 24px rgba(35,24,18,.07)`.
  Una sola elevación; no hay escala de sombras. Diálogos: la misma más un velo `rgba(20,54,42,.45)`.
- **Bordes:** 1 px `--border` para separar; 2.5 px `--ink` para «esto se toca en el campo».
- **Foco visible siempre:** anillo de 3 px `--cobre` con 2 px de separación
  (`outline: 3px solid var(--cobre); outline-offset: 2px`). No se elimina nunca. Sobre `--selva`
  (encabezado y barra lateral) el cobre no se distingue: ahí el anillo es `--oro`.

---

## 5. Componentes

### Base shadcn/ui (con nuestros tokens)

`button`, `input`, `label`, `badge`, `table`, `card`, `tabs`, `checkbox`, `switch`, `select`,
`radio-group`, `progress`, `dialog`, `dropdown-menu`, `tooltip`, `toast`, `skeleton`, `pagination`.

- **Button:** `default` = fondo `--selva`, texto blanco. `secondary` = fondo blanco, borde `--input`.
  `ghost` = solo texto `--selva-2`. `copper` (variante propia) = fondo `--cobre`.
  Tamaños: `sm` 36, `default` 44, `field` 64 con borde 2.5 px `--ink`.
- **Badge:** variantes `ok | warn | err | info` (tintadas) y `ok-solid | warn-solid | err-solid |
  info-solid`. Siempre reciben un ícono; la variante sólida es la de campo.
- **Input:** 44 px en oficina; 60 px y borde 2.5 px en campo. El error se marca con borde de 2 px
  color error **más** mensaje con ícono debajo.
- **Table:** cabecera con fondo `#FBF8F2` y etiqueta de 11 px en mayúsculas; filas de 44–48 px;
  separador `#EEE7DC`; números a la derecha con `tabular-nums`; la columna de acciones a la derecha.

### Propios del proyecto

| Componente | Qué hace | Dónde se ve |
|---|---|---|
| `StatusBadge` | Estado semántico con ícono; prop `tone` y `solid` | Todas |
| `OfflineBanner` | Aviso de sin conexión con contador de registros en cola | Toda pantalla de captura |
| `SyncQueueItem` | Registro pendiente, con reintento | Cola de sincronización |
| `KpiCard` | Etiqueta, cifra en serif, delta y sparkline | Dashboard |
| `StageFlow` | Cadena de etapas cosecha → venta | Dashboard, página QR |
| `PageHeader` | Categoría en versalitas, H1 en serif de 30 px, subrayado, descripción y acciones. Un solo tamaño y la misma separación de arriba en todas las pantallas | Todas las de oficina |
| `pageContainerClass` | El ancho y los márgenes de una pantalla: `wide` (1440 px) para listas, calendarios y lo que lleva mapa o tabla; `narrow` (896 px, centrado) para formularios y fichas de una columna. Arriba y a los lados no cambian de una pantalla a otra | Todas |
| `SummaryStrip` / `SummaryItem` | Los totales de arriba de una lista: una franja blanca con una línea entre uno y otro (apilados en celular) | Cosechas, Lotes, Infraestructura |
| `DetailHero` / `HeroChip` | El banner de una pantalla: tono `selva`, `bosque` o `claro`, categoría, título, marca opcional, chips y acciones. Lo dibuja `PageHeader` cuando recibe `tone` | Listas y detalles |
| `StatStrip` / `StatCell` | Las cifras de un detalle: franja blanca de celdas pegadas, con ícono en el tinte del acento y una barra opcional | Ficha del productor, detalle de finca |
| `SectionCard` / `KeyValues` | Sección con filete del acento, título y contador; datos en dos niveles | Detalles, Sanidad |
| `SectionLabel` | Etiqueta cobre en versalitas | Todas |
| `MapFrame` | El recuadro del mapa con sus controles encima, arriba a la derecha (mapa base, ocultar, ir a la finca, ir a mi ubicación), una leyenda opcional abajo a la izquierda y la franja «Mapa oculto» cuando se oculta. Los cuatro paneles de mapa lo usan | Todos los mapas |
| `MapPanel` | Mapa con controles propios, capas, escala y lectura de coordenadas | Finca, parcela |
| `PolygonEditor` | Dibujo y lista de vértices con área y perímetro calculados | Parcela |
| `FieldStepper` | Menos / número grande / más, 64 px | Captura en campo |
| `DiseaseTile` | Tarjeta ilustrada de estado sanitario | Monitoreo fitosanitario |
| `PermissionMatrix` | Matriz permisos × roles | Roles y permisos |
| `CheckboxField` | Compone la casilla de shadcn/ui con `FormField`: etiqueta, ayuda o error, explicación de deshabilitado y foco cobre; reutiliza la accesibilidad de Base UI | Selección de roles y permisos |
| `SearchSelect` | Lista que se abre al enfocar y se acota al escribir, en lugar del select nativo, con una entrada fija opcional de «Todas…» y grupos. Se filtra en el navegador (lista cargada) o avisa lo escrito (lista del servidor). `ProducerFilter` y `FarmFilter` se arman con él. Regla: más de unas 10 opciones o lista que crece, `SearchSelect`; lista corta y fija (tipo, etapa, mes, estados), el select nativo | Finca, parcela, productor, municipio |
| `ActionsMenu` | El botón «⋯» (44 px, con `aria-label` «Más acciones de …») que reúne lo que no se hace a diario en una tarjeta o fila: editar, activar, desactivar, eliminar, descartar. Las opciones son `MenuItem`; las que piden confirmación abren su diálogo desde fuera del menú (con `ConfirmControl`), porque el menú se desmonta al cerrarse. Cada dominio arma su propio menú | Tarjetas de fincas y parcelas |
| `Toaster` / `notify` | Aviso flotante de lo que terminó bien («Finca actualizada»), basado en el Toast de Base UI. Se invoca con `notify.success / info / warning / error` desde cualquier archivo. Dura 5 s (8 s con acción, p. ej. «Ver productor»); el de error no se cierra solo. Botón de cerrar de 44 px y cierre deslizando, para usarlo con guantes; sin movimiento si el sistema lo pide. Hasta 3 a la vez: abajo a la derecha en pantallas anchas y abajo, a todo el ancho, en celular. Solo para lo que terminó: lo pendiente de enviar y los errores del servidor siguen en la bandeja y el indicador, y la validación junto al campo | Toda la app |
| `MaskedValue` | Muestra `CC ••••4821` y registra en bitácora al revelar | Productores, usuarios |
| `CacaoPlant` | Ilustración de una mata de cacao (hojas `--hoja`/`--selva-2`, mazorcas amarilla y morada) | Estados vacíos sin módulo, página no encontrada y de error |
| Ilustraciones por módulo (`components/illustrations/`) | Escenas planas de 160×140 con las piezas de la mata (`brand/cacao-parts.tsx`: hoja, mazorca, suelo, marco). `EmptyState` y `PageNotice` reciben la del módulo en `illustration` | Ver la tabla de ilustración y fotografía |
| `BotanicalVine` | Línea botánica en oro, solo sobre fondo oscuro | Inicio de sesión, barra lateral y menú móvil |
| `StatusPage` | Pantalla completa con la mata, título y acciones | Página no encontrada y error inesperado |
| `DetailFooter` | Pie de una ficha: «Volver» (44 px, con flecha) a la izquierda, a la pantalla de origen con sus filtros o a la lista, y las acciones de la ficha, si tiene, a la derecha. En celular, las acciones arriba y Volver al final, a todo el ancho | Fichas de cosecha y de lote; las demás en la pasada de estética |

### Iconografía

Trazo lineal de 2 px, extremos redondeados, 24×24 (18–20 px en oficina, 24–28 en campo).
En oficina pueden ir dentro de un círculo tintado por dominio (cultivo verde, sanidad rojo,
poscosecha cobre, calidad azul). Nunca emojis.

### Ilustración y fotografía

- Mazorcas planas con contorno chocolate: solo para elegir estado sanitario y para estados vacíos.
- Cada estado vacío lleva la ilustración de su módulo; la mata de cacao (`CacaoPlant`) queda para
  lo que no es de un módulo (sin permiso, ya no existe) y las páginas de no encontrado y de error.
  Ninguna lleva información ni reemplaza el texto: son decorativas (`aria-hidden`).
- Solo en estados vacíos (también los que dejan los filtros) y avisos de pantalla completa;
  nunca en encabezados, tarjetas, tablas, formularios, avisos flotantes ni errores.

  | Ilustración | Dónde |
  | --- | --- |
  | `FarmHills` (lomas, árboles y casa) | Fincas, sin fincas al elegir una |
  | `PlotOutline` (contorno con vértices y bandera) | Parcelas e historial de la ficha |
  | `CalendarSprout` (calendario con brote) | Actividades |
  | `LeafInspection` (hoja bajo la lupa) | Historial de Sanidad |
  | `LeafPest` (hoja con plaga) | Catálogo de plagas y enfermedades |
  | `HarvestBasket` (canasto de mazorcas) | Cosechas |
  | `BeanSack` (costal de grano) | Lotes |
  | `DryingShed` (cajón y marquesina) | Infraestructura |
  | `InputSupplies` (abono y aspersora) | Insumos |
  | `PodVarieties` (tres mazorcas) | Variedades |
  | `FarmerHat` (sombrero con rama) | Productores, usuarios y roles |
  | `AllDone` (visto bueno con brote) | Nada pendiente, notificaciones al día |
  | `OfflineCloud` (nube tachada) | Todo «necesitas conexión» |

- Una ilustración nueva usa la misma paleta (`--hoja`, `--selva-2`, `--amarillo-mazorca`,
  `--morado-cacao`, `--cobre`, tallos en `--mazorca-negra`), el marco de 160×140 y el suelo.
- Fotografía y línea botánica en oro: solo marca, autenticación, el marco de la app (al pie de la
  barra lateral y del menú móvil, al 50 % de opacidad) y página pública del QR.
- Ninguna textura detrás de texto corrido.

---

## 6. Reglas de accesibilidad y de campo (no negociables)

1. Texto ≥ 4.5:1 (≥ 3:1 desde 24 px). Sin grises claros para información importante.
2. Estado = color + ícono + texto.
3. Área táctil ≥ 44 px en oficina, ≥ 60 px en campo; el botón principal de una pantalla de
   captura ocupa el ancho completo y mide 64–76 px.
4. Todo input tiene `<label>` asociado; los íconos solos llevan `aria-label`.
5. Error de validación: mensaje en texto junto al campo, más `aria-invalid`. Nunca solo el borde rojo.
6. Mobile-first en captura de campo; las pantallas de oficina asumen 1280 px o más.
7. Toda pantalla de captura muestra el estado de conexión y cuántos registros están en cola.
8. Datos personales: documentos y teléfonos enmascarados en listas; revelarlos es una acción
   explícita que queda en la bitácora (RNF-18).
9. No se inventan datos en la interfaz: lo que falta se muestra como vacío con explicación.

---

## 7. Patrones de pantalla

- **Marco de la app:** encabezado en `--selva`, como el panel del inicio de sesión, y barra
  lateral un tono más suave (`--selva-barra`); el contenido va sobre `--crema`. En la barra, la entrada activa es una píldora `--crema`
  con texto `--selva`; las demás, texto `--crema` con ícono `--oro`; arriba, la etiqueta «Menú» en
  versalitas oro. La marca del encabezado lleva la mazorca en `--amarillo-mazorca` y «Cacao» en
  itálica. Los botones del encabezado siguen siendo claros (fondo blanco, texto oscuro).
- **Título de página:** categoría en versalitas, H1 en serif y una descripción de una o dos líneas.
  En las listas y los detalles es un **banner de color** (`PageHeader` con `tone`, que dibuja
  `DetailHero`), con su tono según la pantalla:
  - **`selva`** (verde muy oscuro) en las pantallas de trabajo diario: Actividades, Sanidad,
    Cosechas, Lotes, Infraestructura, Insumos, Fincas y Parcelas;
  - **`bosque`** (`--selva-2`) en los detalles del campo: finca, cosecha, lote, historial de la ficha;
  - **`claro`** (blanco con un filete del acento del módulo a la izquierda) en administración y
    catálogos: Productores y su ficha, Usuarios, Roles, Variedades, Plagas.
  Sobre los oscuros el texto va en blanco (13:1 en selva, 7.9:1 en bosque) y la categoría en un
  dorado claro (`#e8c873`, 8.1:1 y 4.8:1): el `--oro` no alcanza en bosque. Los botones del banner se
  adaptan solos por su variante (el principal a blanco, los de contorno a contorno claro, los que
  piden confirmación a fondo sólido). Los **formularios no llevan banner**: conservan el título con
  el subrayado `--cobre` de 48 × 4 px, porque ahí la atención va a los campos. Un detalle con un
  código propio (la finca) lo muestra como marca junto al título (oculta en celular, donde va con la
  categoría) y el lector de pantalla lo oye con el título.
- **Acento de cada módulo** (`components/page-blocks/accent.ts`): productores, administración, cosecha y
  poscosecha en `--cobre`; fincas, parcelas, actividades y variedades en `--hoja`; sanidad y plagas en
  `--morado-cacao`, cada uno con su tinte claro (`--cobre-tint`, `--hoja-tint`, `--cacao-tint`).
  Pinta los íconos de las cifras, las barras y los filetes.
- **Cifras de una pantalla** (`StatStrip` / `StatCell` en un detalle, `SummaryStrip` en una lista):
  una franja blanca, suelta debajo del banner, con las celdas pegadas y una línea entre ellas; en
  un detalle cada cifra lleva su ícono en el tinte del acento.
- **Secciones** (`SectionCard`): tarjeta blanca con un filete de 4 px del acento arriba, que se
  recorta con las esquinas, y el título en Karla 800 de 16 px con el contador en un chip. El filete
  va solo donde hay **varias secciones en una pantalla** (detalles, Pendiente de Sanidad, resumen por
  plaga); la tarjeta única de una lista no lo lleva, porque ya va bajo un banner de color.
- **Datos de un registro** (`KeyValues` / `KeyValue`): la etiqueta pequeña y tenue, el valor firme;
  nunca los dos en negrita.
- **Filtros de una lista:** todos blancos y de 40 px con texto de 14 px (`FILTER_CONTROLS_CLASS`), en
  este orden: el filtro principal (el que queda a la vista en celular), el productor, el lugar
  (finca, parcela o municipio), los atributos (tipo, rol, plaga, responsable), el estado, el periodo
  y al final «Más filtros» o «Limpiar». Un productor que hace falta elegir para ver algo (cosechas,
  lotes e infraestructura de la cuenta técnica) va arriba con su etiqueta, no en la fila.
- **Columnas que se repiten en varias tablas o tarjetas** (los grupos de Roles, las detecciones del
  historial de Sanidad, las fincas de un productor) tienen ancho fijo, para que queden alineadas
  entre un grupo y otro.
- **Menú de navegación por grupos:** las entradas (`NAV_ITEMS`) llevan un `group`: Administración
  (Productores, Usuarios, Roles y permisos), Finca, Manejo agrícola, Cosecha y poscosecha y
  Catálogos. El grupo sale donde aparece la primera entrada que la persona ve: para la asociación,
  Administración va primero (empieza con Productores); para el productor, que solo ve Usuarios y
  Roles, va al final. Los encabezados solo se dibujan si la persona ve entradas de dos o más grupos;
  con uno el menú queda plano, y una entrada sin grupo va suelta arriba. Cada grupo se pliega con su
  flecha y la elección se recuerda en el navegador. Con más de 10 entradas (la cuenta técnica ve 13)
  los grupos empiezan plegados, menos el de la pantalla actual, que nunca se pliega.
- **Modal, hoja lateral o página.** Una alta corta de oficina, de unos seis campos o menos y sin
  listas dentro, es un **modal centrado** (`sm:max-w-lg`; con una lista adentro, como los insumos de
  un control, `sm:max-w-xl`). Un registro con listas o permisos (una cuenta, un rol) es una **hoja
  lateral** (`SidePanelHeader`, `SidePanelSection`, `SidePanelActions`): franja de color arriba,
  secciones en tarjeta y acciones fijas abajo. Una captura de campo (con cola sin conexión, mapa o
  fotos) o un formulario de más de seis campos es una **página**.
- **Una lista con su mapa (`MapBesideList`).** Con espacio, la lista a la izquierda y el mapa a la
  derecha; con el mapa oculto, la franja «Mapa oculto» queda arriba y la lista toma todo el ancho en
  dos o tres columnas, como en la lista de fincas.
- **Totales y agrupación de una lista.** Los filtros arriba; debajo, en una sola fila, el recuento a
  la izquierda y, a la derecha, el cambio de vista y plegar o desplegar los grupos (un botón de
  ícono con su texto en el `title`).
- **Barras de desplazamiento:** una sola, definida en `globals.css`: delgada, con el pulgar redondeado
  y sin pista ni flechas (`scrollbar-on-dark` sobre la barra lateral y el cajón del celular). Solo
  aparece si hay algo que desplazar: ningún contenedor fuerza `overflow: scroll`, y los adornos (la
  rama de la barra lateral) van fuera de lo que se desplaza, porque dentro sumaban alto y hacían
  aparecer la barra aunque el menú cupiera.
- **Ancho de las pantallas:** `pageContainerClass('wide' | 'narrow')`, nunca un `max-w-*` propio. Las
  listas, el calendario y lo que lleva mapa o tabla van a todo el ancho; los formularios y las fichas
  de una sola columna, a 896 px y centrados.
- **Barra de acciones fija del celular (`MobileActionBar`):** en una sola fila, **Cancelar** a la
  izquierda y la acción principal al doble de ancho. Apiladas ocupaban casi la quinta parte de la
  pantalla.
- **Cuadrículas de tarjetas:** toda `grid` con columnas desde un punto de corte lleva `grid-cols-1`
  de base. Sin ella la columna única mide lo que mide su contenido y una tarjeta con texto largo se
  sale de la pantalla.
- **Placeholders de los buscadores:** cortos (`Buscar finca`, `Buscar cuenta`): en el celular el
  campo comparte la fila con «Filtros» y un texto largo se corta.
- **Lista:** PageHeader + buscador + chips de filtro + tabla + paginación + fila de contexto al pie.
- **Tarjeta de lista compacta:** nombre y estado en una fila, los datos en una o dos líneas, y al
  pie la acción principal (ancho completo, p. ej. «Ver detalle»), un botón de icono por cada atajo
  frecuente (ver en el mapa, programar) y el «⋯» con el resto, pero solo si el resto son al menos
  dos acciones: con dos acciones en total van las dos como botones. Lo que necesita atención (corregir
  un registro que no llegó al servidor) queda a la vista, no en el menú. Con ancho, 2 o 3 columnas.
- **Tabla en celular:** cada fila se vuelve una tarjeta compacta de dos o tres líneas (nombre y estado
  arriba, los datos debajo sin etiquetas, y toda la tarjeta abre el registro con una flecha). La
  versión «etiqueta: valor» por línea hacía la lista cuatro veces más larga.
- **Botones de acción:** variante `action` (borde y texto `--selva` sobre blanco) para los botones de
  tarjetas y cabeceras, que el `outline` beige no distinguía de la tarjeta.
- **Mapa a pantalla completa:** los mapas de consulta lo ofrecen con un botón junto a «ocultar». Es una
  capa fija sobre la página (no la API nativa, que no funciona en iPhone) que se cierra con el botón o
  con Esc; los editores no la tienen porque sus botones están fuera del recuadro.
- **Tarjeta de parcela:** código, área y estado a la izquierda y, a la derecha, un botón de icono por
  cada atajo (ver en el mapa, programar una actividad) y el «⋯». La caracterización va en su franja,
  con «Editar» y el historial dentro: lo de la ficha vive con la ficha. «Ver en el mapa» está
  siempre también en el «⋯».
- **Tarjeta angosta:** lo que cabe depende del ancho de la tarjeta y no del de la pantalla (con un
  mapa al lado, la misma pantalla da tarjetas anchas y angostas). Con menos de 400 px de contenido
  (`useNarrowContainer`) la tarjeta deja solo el «⋯», sin la etiqueta «Área:», y los atajos pasan a su
  menú. Un atajo de otro dominio (programar una actividad) entra al menú por `renderPlotMenuItems`
  y se pide con `requestSchedule`, para que el diálogo viva en su dominio.
- **Detalle de una cuenta:** franja `--selva` con nombre, correo, estado y tipo de cuenta, y debajo
  tarjetas por sección (datos, roles con su alcance, fincas en las que trabaja). El alcance es un
  campo en tarjeta, con opciones separadas y seleccionables en toda su superficie.
- **Detalle de un registro en hoja:** al costado en pantallas anchas y desde abajo en celular, con una
  franja `--selva` arriba (nombre, tipo y recuentos) y el contenido agrupado en secciones plegables
  (los permisos de un rol, por área).
- **Filtros de lista:** una sola fila con la búsqueda y los selects (los poco usados, tras «Más filtros»), sin etiquetas visibles (el
  placeholder dice qué se filtra; la etiqueta sigue ahí para los lectores de pantalla). En el
  celular, la búsqueda y un botón «Filtros» con el número de filtros activos que despliega el resto. Los filtros llevan el ancho de
  fila solo desde `sm` (`w-full sm:min-w-40 sm:flex-1 sm:basis-44`): en celular van en columna, y
  `basis` en una columna es el alto, de modo que cada uno ocuparía 11 rem.
- **Mapa junto a una lista:** el mapa y su resumen se ocultan juntos («Mapa y resumen ocultos»); en
  el celular empiezan ocultos para que la lista quede arriba, y pedir ver una forma en el mapa lo
  muestra. Con ancho, el mapa de una finca va al lado de sus parcelas y se queda a la vista
  mientras se recorre la lista.
- **Ficha:** dos columnas (2/3 contenido, 1/3 relaciones e historial de cambios). Termina con
  `DetailFooter`: **Volver** abajo a la izquierda, y las acciones de la ficha, si tiene, a su
  derecha. La ruta de arriba no se lee como un botón para quien usa poco la web; en campo, con una
  tablet, se busca un «Volver» donde termina lo que se estaba leyendo.
- **Formulario de oficina:** columna de 520 px con cards por sección; el mapa o la vista previa
  ocupa el resto.
- **Captura de campo:** cabecera verde con paso actual, aviso de conexión, contenido de un solo
  foco, y barra inferior fija con la acción principal.
- **Estado vacío:** ilustración o bloque de color, una frase de qué falta y el botón que lo resuelve.
- **Confirmación destructiva** (descartar lote, desactivar usuario): diálogo que nombra la
  consecuencia y pide el motivo cuando el dominio lo exige.

---

## 8. Pantallas ya diseñadas

Sprint 1, en `docs/ui/ref/`:

| Archivo | Pantalla |
|---|---|
| `s1-01-login.html` | Ingreso (escritorio) |
| `s1-02-recuperar.html` | Recuperar contraseña + confirmación |
| `s1-03-usuarios.html` | Usuarios y accesos |
| `s1-04-roles.html` | Roles y permisos (matriz) |
| `s1-05-productores.html` | Lista de productores |
| `s1-06-productor-ficha.html` | Ficha de productor con parámetros y umbrales |
| `s1-07-finca-mapa.html` | Registro de finca con mapa |
| `s1-08-parcela-poligono.html` | Parcela con polígono, área y perímetro |
| `s1-09-login-movil.html` | Ingreso en celular |
| `s1-10-finca-campo.html` | Registro de finca en campo con GPS, sin conexión |
| `s1-11-parcela-campo.html` | Recorrido del perímetro en campo |

Sprint 2, en `docs/ui/ref/`. La numeración sigue la del Sprint 1, sin volver a empezar: el
prefijo dice el sprint y el número no se repite entre sprints. Cada módulo trae:

- su pantalla principal en escritorio;
- la vista principal de su formulario;
- una hoja con los estados del formulario (errores y confirmaciones);
- la vista en celular, con el caso sin conexión.

Cada archivo lleva sus notas para implementar debajo del dibujo. Lo que aparece entre
`[corchetes]` es una pregunta abierta que decide algo de la pantalla.

| Archivo | Pantalla |
|---|---|
| `s2-12-insumos-lista.html` | Catálogo de insumos (escritorio) con filtros y menú de acciones |
| `s2-13-insumo-registrar.html` | Registrar insumo: vista principal del formulario, sus listas desplegables y la versión en celular |
| `s2-14-insumo-estados.html` | Estados del formulario: validaciones, bulto, duplicados, unidad bloqueada, confirmaciones |
| `s2-15-insumos-movil.html` | Insumos en celular: tarjetas, sin conexión, sin resultados y catálogo vacío |
| `s2-16-actividades-calendario.html` | Calendario de actividades del mes (escritorio): filtros, lista del día y una ficha por estado |
| `s2-17-actividad-programar.html` | Programar actividad: diálogo, listas desplegables, selector de fecha y celular |
| `s2-18-actividad-estados.html` | Actividades: errores, edición, detalle por estado, eliminar y sin conexión |
| `s2-19-actividad-realizar-campo.html` | Registrar la realización en campo: insumos, confirmación, cola y bandeja |
| `s2-20-actividades-movil.html` | Actividades en celular: lista por días, filtros, detalle y sin conexión |
| `s2-21-monitoreo-campo.html` | Registrar monitoreo en campo: detecciones, incidencia, sin presencia y sin conexión |
| `s2-22-historial-fitosanitario.html` | Historial fitosanitario de la parcela con su gráfico de incidencia |
| `s2-23-control-fitosanitario.html` | Control fitosanitario desde una detección: programar o registrar como aplicado |
| `s2-24-evidencia-fitosanitaria.html` | Evidencia fotográfica: galería, adjuntar, errores y campo |
| `s2-25-cosechas-lista.html` | Cosechas (escritorio) con la selección para crear un lote |
| `s2-26-cosecha-campo.html` | Registrar cosecha en campo |
| `s2-27-lotes.html` | Lotes por etapa, crear lote y código de trazabilidad |
| `s2-28-cosechas-lotes-movil.html` | Cosechas y lotes en celular |
| `s2-29-infraestructura-lista.html` | Infraestructura de poscosecha: cajones y marquesinas |
| `s2-30-infraestructura-estados.html` | Infraestructura: formulario, desactivar, activar y celular |
| `s2-31-lote-fermentacion.html` | Ficha del lote en fermentación: volteos y mediciones |
| `s2-32-fermentacion-iniciar-finalizar.html` | Iniciar y finalizar la fermentación |
| `s2-33-volteo-campo.html` | Volteo y finalización de la fermentación en campo |
| `s2-34-lote-secado.html` | Ficha del lote en secado: curva de humedad y bitácora |
| `s2-35-secado-iniciar-finalizar.html` | Iniciar el secado y finalizarlo con el rendimiento |
| `s2-36-bitacora-campo.html` | Bitácora diaria de secado en campo |
| `s2-37-parametros-poscosecha.html` | Parámetros de poscosecha (reemplaza el bloque de parámetros de `s1-06`) |
| `s2-38-parametros-estados.html` | Parámetros: errores, restablecer la línea base y celular |
| `s2-39-notificaciones.html` | Notificaciones: bandeja, panel de la campana y alerta crítica |
| `s2-40-alertas-tipos-movil.html` | Tipos de alerta con su texto y notificaciones en celular |

Base de la dirección: `selvaviva-sistema.html` (hoja de tokens), `selvaviva-dashboard.html`,
`selvaviva-campo.html`, `selvaviva-qr.html`.

Los datos de esos archivos son de ejemplo y lo que aparece entre `[CORCHETES]` es contenido real
pendiente. Nunca copiar esos valores a la base de datos ni a fixtures como si fueran reales.

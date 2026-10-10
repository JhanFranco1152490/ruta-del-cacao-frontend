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
El color nunca va solo: cada municipio con fincas lleva su cifra encima.

| Token | Hex | Uso |
|---|---|---|
| `--map-level-0` | `#F1EBE1` | Municipio sin fincas |
| `--map-level-1` | `#D7E8DC` | Hasta una quinta parte del máximo |
| `--map-level-2` | `#A9CDB5` | Hasta dos quintas partes |
| `--map-level-3` | `#6FA684` | Hasta tres quintas partes |
| `--map-level-4` | `#3D7A58` | Hasta cuatro quintas partes |
| `--map-level-5` | `#14362A` | El máximo (igual a `--selva`) |
| `--map-mask` | `#E7ECE9` | Lo que queda fuera del municipio elegido, sobre el mapa base |

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
`radio-group`, `progress`, `dialog`, `dropdown-menu`, `tooltip`, `sonner`, `skeleton`, `pagination`.

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
| `PageHeader` | Migas, H1 en serif, subtítulo y acciones | Todas las de oficina |
| `SectionLabel` | Etiqueta cobre en versalitas | Todas |
| `MapPanel` | Mapa con controles propios, capas, escala y lectura de coordenadas | Finca, parcela |
| `PolygonEditor` | Dibujo y lista de vértices con área y perímetro calculados | Parcela |
| `FieldStepper` | Menos / número grande / más, 64 px | Captura en campo |
| `DiseaseTile` | Tarjeta ilustrada de estado sanitario | Monitoreo fitosanitario |
| `PermissionMatrix` | Matriz permisos × roles | Roles y permisos |
| `CheckboxField` | Compone la casilla de shadcn/ui con `FormField`: etiqueta, ayuda o error, explicación de deshabilitado y foco cobre; reutiliza la accesibilidad de Base UI | Selección de roles y permisos |
| `MaskedValue` | Muestra `CC ••••4821` y registra en bitácora al revelar | Productores, usuarios |
| `CacaoPlant` | Ilustración de una mata de cacao (hojas `--hoja`/`--selva-2`, mazorcas amarilla y morada) | Estados vacíos, página no encontrada y de error |
| `BotanicalVine` | Línea botánica en oro, solo sobre fondo oscuro | Inicio de sesión, barra lateral y menú móvil |
| `StatusPage` | Pantalla completa con la mata, título y acciones | Página no encontrada y error inesperado |

### Iconografía

Trazo lineal de 2 px, extremos redondeados, 24×24 (18–20 px en oficina, 24–28 en campo).
En oficina pueden ir dentro de un círculo tintado por dominio (cultivo verde, sanidad rojo,
poscosecha cobre, calidad azul). Nunca emojis.

### Ilustración y fotografía

- Mazorcas planas con contorno chocolate: solo para elegir estado sanitario y para estados vacíos.
- La mata de cacao (`CacaoPlant`) acompaña los estados vacíos y las páginas de no encontrado y de
  error; nunca lleva información ni reemplaza el texto.
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
- **Título de página:** H1 en serif con un subrayado `--cobre` de 48 × 4 px debajo.
- **Lista:** PageHeader + buscador + chips de filtro + tabla + paginación + fila de contexto al pie.
- **Ficha:** dos columnas (2/3 contenido, 1/3 relaciones e historial de cambios).
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

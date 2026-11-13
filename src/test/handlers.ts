import { http, HttpResponse, type JsonBodyType } from 'msw';

import { API_URL } from '@/lib/env';

import {
  buildFarm,
  buildMunicipalities,
  buildPage,
  buildProfile,
  buildClosedSummary,
  buildQualitySummary,
  buildExitSummary,
  buildAssociationIndicators,
  buildProducerIndicators,
  buildSaleSummary,
  buildStockSummary,
} from './factories';

export const apiUrl = (path: string) => `${API_URL}${path}`;

export const csrfHandler = http.get(apiUrl('/api/auth/csrf'), () =>
  HttpResponse.json({ csrf_token: 'test-csrf' }),
);

// Responde el catálogo de variedades y guarda las búsquedas recibidas.
export const pestsDiseasesHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/pests-diseases'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

export const cacaoVarietiesHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/cacao-varieties'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde las fichas de una finca y guarda las búsquedas recibidas.
export const characterizationsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/plot-characterizations'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Una página de `items` como la arma la API, según `page` y `page_size` de la petición.
function pageOf(items: unknown[], params: URLSearchParams) {
  const page = Number(params.get('page') ?? '1');
  const size = Number(params.get('page_size') ?? '20');
  const start = (page - 1) * size;
  return {
    count: items.length,
    next: start + size < items.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: items.slice(start, start + size),
  };
}

// Responde el historial de una ficha, paginado como la API, y guarda las búsquedas recibidas.
export const characterizationHistoryHandler = (
  events: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(
    apiUrl('/api/plot-characterizations/:plotId/history'),
    ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      return HttpResponse.json(pageOf(events, params));
    },
  );

// Responde el catálogo de insumos y guarda las búsquedas recibidas.
export const agriculturalInputsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/agricultural-inputs'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde las existencias de una finca y guarda las búsquedas recibidas.
export const inputStocksHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/input-stocks'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde los movimientos de un insumo en una finca, paginados como la API.
export const inputMovementsHandler = (
  movements: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/input-movements'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    requests.push(params);
    return HttpResponse.json(pageOf(movements, params));
  });

// Responde las actividades de un periodo y guarda las búsquedas recibidas.
export const agriculturalActivitiesHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/agricultural-activities'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde las actividades pendientes y guarda las búsquedas recibidas.
export const pendingActivitiesHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/agricultural-activities/pending'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde las cuentas a las que se puede asignar una labor y guarda las búsquedas recibidas.
export const activityAssigneesHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/agricultural-activities/assignees'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde las cosechas de un periodo y guarda las búsquedas recibidas.
export const harvestsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/harvests'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde las cuentas que pueden recolectar y guarda las búsquedas recibidas.
export const harvestCollectorsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/harvests/collectors'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde una página de lotes y guarda las búsquedas recibidas.
export const lotsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/lots'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(buildPage(results));
  });

// Responde el recuento de lotes por estado y guarda las búsquedas recibidas.
export const lotSummaryHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/lots/summary'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde las fermentaciones en curso, sin paginar, y guarda las búsquedas recibidas.
export const fermentationsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/fermentation'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde los secados en curso, sin paginar, y guarda las búsquedas recibidas.
export const dryingsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/drying'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Responde una página de lotes de calidad y guarda las búsquedas recibidas (la pestaña va en `view`).
export const qualityListHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/quality'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(buildPage(results));
  });

export const qualitySummaryHandler = (
  summary: JsonBodyType = buildQualitySummary(),
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/quality/summary'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(summary);
  });

export const closedSummaryHandler = (
  summary: JsonBodyType = buildClosedSummary(),
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/quality/closed-summary'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(summary);
  });

export const qualityDetailHandler = (detail: JsonBodyType) =>
  http.get(apiUrl('/api/quality/:id'), () => HttpResponse.json(detail));

// Registrar o corregir la evaluación, clasificar y descartar: responde `response` (un
// HttpResponse para los errores) o el lote con 201/200, y guarda los cuerpos recibidos.
export const qualityWriteHandler = (
  action: 'evaluation' | 'evaluation-correction' | 'classification' | 'discard',
  response: JsonBodyType | Response,
  bodies: unknown[] = [],
) => {
  const method = action === 'evaluation-correction' ? http.patch : http.post;
  const segment = action === 'evaluation-correction' ? 'evaluation' : action;
  return method(apiUrl(`/api/quality/:id/${segment}`), async ({ request }) => {
    bodies.push(await request.json());
    if (response instanceof Response) return response;
    return HttpResponse.json(response, {
      status: method === http.post ? 201 : 200,
    });
  });
};

// Las lecturas paginadas de Bodega (existencias, lotes por ingresar y bodegas): responden una página
// y guardan las búsquedas recibidas.
const warehousePageHandler =
  (path: string) =>
  (results: unknown[] = [], requests: URLSearchParams[] = []) =>
    http.get(apiUrl(path), ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return HttpResponse.json(buildPage(results));
    });

export const stockListHandler = warehousePageHandler('/api/stock');
export const exitListHandler = warehousePageHandler('/api/stock/exits');
export const pendingEntryHandler = warehousePageHandler(
  '/api/stock/pending-entry',
);
export const warehousesHandler = warehousePageHandler('/api/warehouses');

export const stockSummaryHandler = (
  summary: JsonBodyType = buildStockSummary(),
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/stock/summary'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(summary);
  });

export const exitSummaryHandler = (
  summary: JsonBodyType = buildExitSummary(),
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/stock/exits/summary'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(summary);
  });

export const stockLocationsHandler = (
  locations: string[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/stock/locations'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results: locations });
  });

// `/api/stock/:id` también calza con las rutas fijas de existencias: esas siguen a su propio
// handler.
const STOCK_FIXED_PATHS = ['summary', 'locations', 'pending-entry', 'exits'];

export const lotStockHandler = (stock: JsonBodyType) =>
  http.get(apiUrl('/api/stock/:id'), ({ params }) => {
    if (STOCK_FIXED_PATHS.includes(String(params.id))) return undefined;
    return HttpResponse.json(stock);
  });

// Las escrituras de Bodega sobre un lote: responden `response` (un HttpResponse para los errores) o
// el lote con 201 (ingreso y salida) o 200 (corrección y anulación), y guardan los cuerpos recibidos.
const STOCK_WRITES = {
  entry: { method: http.post, path: '/api/stock/:id/entry', status: 201 },
  'entry-correction': {
    method: http.patch,
    path: '/api/stock/:id/entry',
    status: 200,
  },
  exit: { method: http.post, path: '/api/stock/:id/exits', status: 201 },
  move: { method: http.post, path: '/api/stock/:id/move', status: 201 },
  void: {
    method: http.post,
    path: '/api/stock/:id/exits/:exitId/void',
    status: 200,
  },
} as const;

export const stockWriteHandler = (
  action: keyof typeof STOCK_WRITES,
  response: JsonBodyType | Response,
  bodies: unknown[] = [],
) => {
  const { method, path, status } = STOCK_WRITES[action];
  return method(apiUrl(path), async ({ request }) => {
    bodies.push(await request.json());
    if (response instanceof Response) return response;
    return HttpResponse.json(response, { status });
  });
};

// Registrar, editar (también activar y desactivar) y eliminar una bodega: responde `response` o
// la bodega con 201, 200 o 204, y guarda los cuerpos recibidos (el de eliminar es la búsqueda, con
// `expected_version`).
export const warehouseWriteHandler = (
  action: 'create' | 'update' | 'delete',
  response: JsonBodyType | Response = null,
  bodies: unknown[] = [],
) => {
  if (action === 'create') {
    return http.post(apiUrl('/api/warehouses'), async ({ request }) => {
      bodies.push(await request.json());
      if (response instanceof Response) return response;
      return HttpResponse.json(response, { status: 201 });
    });
  }
  if (action === 'update') {
    return http.patch(apiUrl('/api/warehouses/:id'), async ({ request }) => {
      bodies.push(await request.json());
      if (response instanceof Response) return response;
      return HttpResponse.json(response);
    });
  }
  return http.delete(apiUrl('/api/warehouses/:id'), ({ request }) => {
    bodies.push(new URL(request.url).searchParams);
    if (response instanceof Response) return response;
    return new HttpResponse(null, { status: 204 });
  });
};

// Responde los cajones y marquesinas de un productor, sin paginar, y guarda las búsquedas
// recibidas.
export const facilitiesHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/postharvest-facilities'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Una página de ventas; guarda las búsquedas recibidas (llevan el periodo y los filtros).
export const salesHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/sales'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(buildPage(results));
  });

export const saleSummaryHandler = (
  summary: JsonBodyType = buildSaleSummary(),
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/sales/summary'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(summary);
  });

export const producerIndicatorsHandler = (
  indicators: JsonBodyType | Response = buildProducerIndicators(),
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/indicators/producer'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return indicators instanceof Response
      ? indicators.clone()
      : HttpResponse.json(indicators);
  });

export const associationIndicatorsHandler = (
  indicators: JsonBodyType | Response = buildAssociationIndicators(),
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/indicators/association'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return indicators instanceof Response
      ? indicators.clone()
      : HttpResponse.json(indicators);
  });

export const buyerOptionsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/sales/buyer-options'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// `/api/sales/:id` también calza con las rutas fijas de ventas: esas siguen a su propio handler.
const SALE_FIXED_PATHS = ['summary', 'buyer-options'];

export const saleHandler = (sale: JsonBodyType | Response) =>
  http.get(apiUrl('/api/sales/:id'), ({ params }) => {
    if (SALE_FIXED_PATHS.includes(String(params.id))) return undefined;
    if (sale instanceof Response) return sale;
    return HttpResponse.json(sale);
  });

// Registrar (201) o anular (200) una venta: responde `response` (un HttpResponse para los errores)
// o la venta, y guarda los cuerpos recibidos.
export const saleWriteHandler = (
  action: 'create' | 'void',
  response: JsonBodyType | Response,
  bodies: unknown[] = [],
) => {
  const path = action === 'create' ? '/api/sales' : '/api/sales/:id/void';
  return http.post(apiUrl(path), async ({ request }) => {
    bodies.push(await request.json());
    if (response instanceof Response) return response;
    return HttpResponse.json(response, {
      status: action === 'create' ? 201 : 200,
    });
  });
};

// Adjuntar o reemplazar (`PUT`, multipart, responde la venta) y quitar (`DELETE`, 204) el soporte.
// Guarda el archivo recibido al adjuntar.
export const saleInvoiceHandler = (
  action: 'attach' | 'remove',
  response: JsonBodyType | Response = null,
  files: File[] = [],
) => {
  if (action === 'remove') {
    return http.delete(apiUrl('/api/sales/:id/invoice'), () =>
      response instanceof Response
        ? response
        : new HttpResponse(null, { status: 204 }),
    );
  }
  return http.put(apiUrl('/api/sales/:id/invoice'), async ({ request }) => {
    const file = (await request.formData()).get('file');
    if (file instanceof File) files.push(file);
    if (response instanceof Response) return response;
    return HttpResponse.json(response);
  });
};

// Responde el directorio de compradores de un productor, sin paginar, y guarda las búsquedas
// recibidas.
export const buyersHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/buyers'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({ results });
  });

// Registrar, editar (también activar y desactivar) o eliminar un comprador: responde `response`
// (un HttpResponse para los errores) o el comprador con 201/200 (204 al eliminar), y guarda los
// cuerpos recibidos (la URL al eliminar, que lleva `expected_version`).
export const buyerWriteHandler = (
  action: 'create' | 'update' | 'delete',
  response: JsonBodyType | Response = null,
  bodies: unknown[] = [],
) => {
  if (action === 'delete') {
    return http.delete(apiUrl('/api/buyers/:id'), ({ request }) => {
      bodies.push(new URL(request.url).searchParams);
      if (response instanceof Response) return response;
      return new HttpResponse(null, { status: 204 });
    });
  }
  const method = action === 'create' ? http.post : http.patch;
  const path = action === 'create' ? '/api/buyers' : '/api/buyers/:id';
  return method(apiUrl(path), async ({ request }) => {
    bodies.push(await request.json());
    if (response instanceof Response) return response;
    return HttpResponse.json(response, {
      status: action === 'create' ? 201 : 200,
    });
  });
};

export const municipalitiesHandler = (results = buildMunicipalities()) =>
  http.get(apiUrl('/api/catalogs/municipalities'), () =>
    HttpResponse.json({ results }),
  );

// Responde la lista de fincas y guarda las búsquedas recibidas, para comprobar qué se pidió.
export const farmsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/farms'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(buildPage(results));
  });

// Datos del mapa de fincas; guardan lo que se pidió, como `farmsHandler`.
export const farmMapCountsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/farms/map/municipalities'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(results);
  });

export const farmMapPointsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/farms/map/points'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(results);
  });

export const farmHandler = (farm: ReturnType<typeof buildFarm>, id = 'f1') =>
  http.get(apiUrl(`/api/farms/${id}`), () => HttpResponse.json(farm));

// Los conteos de caracterización son del conjunto filtrado: por defecto, todas sin ficha.
export const plotsHandler = (
  results: unknown[] = [],
  requests: URLSearchParams[] = [],
  characterizationCounts = { done: 0, pending: results.length },
) =>
  http.get(apiUrl('/api/plots'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json({
      ...buildPage(results),
      characterization_counts: characterizationCounts,
    });
  });

export const profileHandler = (profile = buildProfile()) =>
  http.get(apiUrl('/api/auth/profile'), () => HttpResponse.json(profile));

// "Mi cuenta" se puede abrir desde cualquier pantalla con sesión: su perfil tiene una respuesta por
// defecto para que las pruebas que no lo miran no fallen por una petición sin atender.
// Las pendientes se piden al guardar la copia sin conexión de las actividades: una prueba que no
// las espera no debe fallar por eso.
// Los municipios y las cuentas asignables los piden filtros y formularios de muchas pantallas que
// no los miran: sin respuesta por defecto cada una llenaba el registro de avisos de peticiones
// sin atender.
export const defaultHandlers = [
  csrfHandler,
  profileHandler(),
  pendingActivitiesHandler(),
  municipalitiesHandler(),
  activityAssigneesHandler(),
];

// Responde los parámetros de poscosecha y guarda las búsquedas recibidas.
export const parametersHandler = (
  parameters: JsonBodyType,
  requests: URLSearchParams[] = [],
) =>
  http.get(apiUrl('/api/postharvest-parameters'), ({ request }) => {
    requests.push(new URL(request.url).searchParams);
    return HttpResponse.json(parameters);
  });

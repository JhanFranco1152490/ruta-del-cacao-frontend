import { http, HttpResponse } from 'msw';

import { API_URL } from '@/lib/env';

import {
  buildFarm,
  buildMunicipalities,
  buildPage,
  buildProfile,
} from './factories';

export const apiUrl = (path: string) => `${API_URL}${path}`;

export const csrfHandler = http.get(apiUrl('/api/auth/csrf'), () =>
  HttpResponse.json({ csrf_token: 'test-csrf' }),
);

// Responde el catálogo de variedades y guarda las búsquedas recibidas.
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

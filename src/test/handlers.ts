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
      const page = Number(params.get('page') ?? '1');
      const size = Number(params.get('page_size') ?? '20');
      const start = (page - 1) * size;
      return HttpResponse.json({
        count: events.length,
        next: start + size < events.length ? `?page=${page + 1}` : null,
        previous: page > 1 ? `?page=${page - 1}` : null,
        results: events.slice(start, start + size),
      });
    },
  );

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
export const defaultHandlers = [csrfHandler, profileHandler()];

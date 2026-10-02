import { http, HttpResponse } from 'msw';

import { API_URL } from '@/lib/env';

import { buildMunicipalities, buildPage, buildProfile } from './factories';

export const apiUrl = (path: string) => `${API_URL}${path}`;

export const csrfHandler = http.get(apiUrl('/api/auth/csrf'), () =>
  HttpResponse.json({ csrf_token: 'test-csrf' }),
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

export const profileHandler = (profile = buildProfile()) =>
  http.get(apiUrl('/api/auth/profile'), () => HttpResponse.json(profile));

// "Mi cuenta" se puede abrir desde cualquier pantalla con sesión: su perfil tiene una respuesta por
// defecto para que las pruebas que no lo miran no fallen por una petición sin atender.
export const defaultHandlers = [csrfHandler, profileHandler()];

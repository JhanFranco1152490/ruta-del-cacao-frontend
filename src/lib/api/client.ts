import { getActingProducer } from '@/lib/acting-producer';
import { API_URL } from '@/lib/env';

import {
  ApiError,
  UNEXPECTED_RESPONSE_CODE,
  isUnauthorized,
  type ApiErrorBody,
} from './errors';
import type { components } from './schema';

export type ApiRequestInit = Omit<RequestInit, 'body'> & {
  body?: unknown;
  // El productor bajo el que opera la cuenta técnica en esta petición. Sin indicar, el de la
  // pestaña; `null`, ninguno; un id, ese (la cola lo usa para enviar un registro bajo el productor
  // con que se guardó, aunque la pestaña haya cambiado de productor mientras esperaba).
  actingProducer?: string | null;
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Endpoints que no usan el token de acceso: un 401 ahí no significa "acceso vencido"
// (en login es credenciales incorrectas; en renovación es la renovación misma), así que
// no se intenta renovar. /api/auth/me sí usa el token de acceso y sí se renueva.
const LOGOUT_PATH = '/api/auth/logout';
const NO_RENEWAL_PREFIXES = [
  '/api/auth/login',
  '/api/auth/refresh',
  LOGOUT_PATH,
  '/api/auth/csrf',
  '/api/auth/password-reset',
  '/api/auth/activation',
];

// Las rutas de la sesión nunca llevan el productor activo: si el elegido ya no existe, el servidor
// respondería 404 a la lectura de la sesión y la pantalla creería que se cerró.
const SESSION_PREFIX = '/api/auth/';
const ACTING_PRODUCER_HEADER = 'X-Acting-Producer';

const UNEXPECTED_DETAIL =
  'No pudimos completar la solicitud. Inténtalo de nuevo.';

let csrfRequest: Promise<string> | undefined;
let refreshRequest: Promise<void> | undefined;
let logoutRequest: Promise<unknown> | undefined;

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.detail === 'string' &&
    typeof body.code === 'string' &&
    typeof body.fields === 'object' &&
    body.fields !== null
  );
}

const unexpectedResponse = (status: number) =>
  new ApiError(status, {
    detail: UNEXPECTED_DETAIL,
    code: UNEXPECTED_RESPONSE_CODE,
    fields: {},
  });

async function toApiError(response: Response) {
  const body: unknown = await response.json().catch(() => undefined);
  if (isApiErrorBody(body)) return new ApiError(response.status, body);
  return unexpectedResponse(response.status);
}

async function request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { body, actingProducer, ...rest } = init;
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const acting =
    actingProducer === undefined ? getActingProducer() : actingProducer;
  if (acting && !path.startsWith(SESSION_PREFIX)) {
    headers.set(ACTING_PRODUCER_HEADER, acting);
  }
  if (!SAFE_METHODS.has(method))
    headers.set('X-CSRFToken', await getCsrfToken());

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    // Un 2xx que no es JSON (p. ej. la página de un portal cautivo) no es una respuesta del API.
    throw unexpectedResponse(response.status);
  }
}

function getCsrfToken() {
  csrfRequest ??= request<
    Partial<components['schemas']['CsrfToken']> | undefined
  >('/api/auth/csrf')
    .then((body) => {
      // Sin token no se envía la petición: mandar la cabecera vacía o "undefined" solo
      // produciría un 403 confuso.
      if (!body?.csrf_token) throw unexpectedResponse(200);
      return body.csrf_token;
    })
    .finally(() => {
      csrfRequest = undefined;
    });
  return csrfRequest;
}

function renewSession() {
  refreshRequest ??= request<void>('/api/auth/refresh', {
    method: 'POST',
  }).finally(() => {
    refreshRequest = undefined;
  });
  return refreshRequest;
}

// El cierre de sesión revoca la cookie de renovación que envía. Si una renovación sigue en
// vuelo, su respuesta traería una cookie nueva después del cierre y la sesión reviviría en un
// equipo compartido. Por eso el cierre espera a esa renovación, y mientras dura ninguna
// petición inicia otra.
function logout<T>(path: string, init: ApiRequestInit) {
  const pending: Promise<T> = (async () => {
    await refreshRequest?.catch(() => undefined);
    return request<T>(path, init);
  })().finally(() => {
    if (logoutRequest === pending) logoutRequest = undefined;
  });
  logoutRequest = pending;
  return pending;
}

export async function apiFetch<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  if (path.startsWith(LOGOUT_PATH)) return logout<T>(path, init);
  try {
    return await request<T>(path, init);
  } catch (error) {
    const canRenew =
      !logoutRequest &&
      !NO_RENEWAL_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (!isUnauthorized(error) || !canRenew) throw error;
    await renewSession();
    return request<T>(path, init);
  }
}

/* eslint-disable no-restricted-globals */
export type User = {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
};

type LoginResponse = { user: User };

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseError(response: Response, fallback: string) {
  try {
    const text = await response.text();
    if (!text) return fallback;
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== 'object') return fallback;
    const errors = body as Record<string, unknown>;
    for (const key of ['detail', 'message', 'error']) {
      if (typeof errors[key] === 'string') return errors[key];
    }
    const messages = Object.values(errors)
      .flat()
      .filter((value): value is string => typeof value === 'string');
    return messages.join(' ') || fallback;
  } catch {
    return fallback;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('Content-Type', 'application/json');
  if (init?.method && !['GET', 'HEAD', 'OPTIONS'].includes(init.method)) {
    headers.set('X-CSRFToken', await getCsrfToken());
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers,
  });

  if (!response.ok) {
    throw new ApiError(
      await parseError(response, 'No pudimos completar la solicitud.'),
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

let csrfRequest: Promise<string> | undefined;

function getCsrfToken() {
  csrfRequest ??= request<{ csrf_token: string }>('/api/auth/csrf')
    .then((body) => {
      if (!body?.csrf_token || typeof body.csrf_token !== 'string') {
        throw new Error('No pudimos validar la seguridad de la solicitud.');
      }
      return body.csrf_token;
    })
    .finally(() => {
      csrfRequest = undefined;
    });
  return csrfRequest;
}

let refreshRequest: Promise<void> | undefined;

function refreshSession() {
  refreshRequest ??= request<void>('/api/auth/refresh', {
    method: 'POST',
  }).finally(() => {
    refreshRequest = undefined;
  });
  return refreshRequest;
}

async function authenticatedRequest<T>(path: string, init?: RequestInit) {
  try {
    return await request<T>(path, init);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    await refreshSession();
    return request<T>(path, init);
  }
}

export type DocumentType = 'CC' | 'CE' | 'PPT' | 'NIT';

export async function login(
  credentials:
    | { loginMethod: 'email'; email: string; password: string }
    | {
        loginMethod: 'document';
        documentType: DocumentType;
        identityDocument: string;
        password: string;
      },
) {
  const body =
    credentials.loginMethod === 'email'
      ? {
          login_method: 'email',
          email: credentials.email,
          password: credentials.password,
        }
      : {
          login_method: 'document',
          document_type: credentials.documentType,
          identity_document: credentials.identityDocument,
          password: credentials.password,
        };
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function requestPasswordReset(email: string) {
  return request<void>('/api/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(token: string, password: string) {
  return request<void>('/api/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({
      token,
      new_password: password,
      new_password_confirmation: password,
    }),
  });
}

export async function getCurrentUser() {
  return authenticatedRequest<LoginResponse>('/api/auth/me');
}

export function logout() {
  return authenticatedRequest<void>('/api/auth/logout', { method: 'POST' });
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 429)
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    return error.message;
  }
  return fallback;
}

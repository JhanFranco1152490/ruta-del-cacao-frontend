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
    const body = JSON.parse(text) as {
      detail?: string;
      message?: string;
      error?: string;
    };
    return body.detail ?? body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
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

export async function login(identifier: string, password: string) {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
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
  try {
    return await request<LoginResponse>('/api/auth/me');
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    await request<void>('/api/auth/refresh', { method: 'POST' });
    return request<LoginResponse>('/api/auth/me');
  }
}

export function logout() {
  return request<void>('/api/auth/logout', { method: 'POST' });
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 429)
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    return error.message;
  }
  return fallback;
}

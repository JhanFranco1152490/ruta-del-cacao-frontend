import type { components } from './schema';

export type ApiErrorBody = components['schemas']['ApiError'];

export const UNEXPECTED_RESPONSE_CODE = 'unexpected_response';
export const RATE_LIMIT_MESSAGE =
  'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string[]>;
  // Cuerpo completo: algunos errores traen claves propias (p. ej. existing_producer_id).
  readonly body: ApiErrorBody & Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody & Record<string, unknown>) {
    super(body.detail);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
    this.body = body;
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;

// fetch rechaza con TypeError cuando no llega ninguna respuesta: sin red, señal débil, wifi sin
// internet o servidor caído.
export const isNetworkFailure = (error: unknown) => error instanceof TypeError;

export const isUnauthorized = (error: unknown) =>
  isApiError(error) && error.status === 401;

export function getErrorMessage(error: unknown, fallback: string) {
  if (!isApiError(error)) return fallback;
  return error.code === 'throttled' ? RATE_LIMIT_MESSAGE : error.message;
}

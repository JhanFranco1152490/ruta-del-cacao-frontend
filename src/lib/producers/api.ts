/* eslint-disable no-restricted-globals */
import type {
  ApiErrorBody,
  Municipality,
  Producer,
  ProducerInput,
  ProducerListFilters,
  ProducerListResponse,
  ProducerStatus,
} from './types';

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? 'No fue posible completar la operación.');
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...init.headers,
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json')
    ? ((await response.json()) as ApiErrorBody)
    : {};

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}

function queryString(filters: ProducerListFilters) {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.municipalityCode) {
    params.set('municipality_code', filters.municipalityCode);
  }
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('page_size', String(filters.pageSize));

  const value = params.toString();
  return value ? `?${value}` : '';
}

let csrfRequest: Promise<string> | undefined;

function getCsrfToken() {
  csrfRequest ??= request<{ csrf_token: string }>('/api/auth/csrf')
    .then((response) => {
      if (!response.csrf_token) {
        throw new Error('No fue posible obtener un token CSRF válido.');
      }
      return response.csrf_token;
    })
    .finally(() => {
      csrfRequest = undefined;
    });
  return csrfRequest;
}

async function mutationRequest<T>(path: string, init: RequestInit) {
  const token = await getCsrfToken();

  return request<T>(path, {
    ...init,
    headers: {
      ...init.headers,
      'X-CSRFToken': token,
    },
  });
}

export function getMunicipalities(signal?: AbortSignal) {
  return request<{ results: Municipality[] }>('/api/catalogs/municipalities', {
    signal,
  }).then((response) => response.results);
}

export function getProducers(
  filters: ProducerListFilters,
  signal?: AbortSignal,
) {
  return request<ProducerListResponse>(
    `/api/producers/${queryString(filters)}`,
    { signal },
  );
}

export function getProducer(id: string, signal?: AbortSignal) {
  return request<Producer>(`/api/producers/${id}`, { signal });
}

function requestBody(body: object) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function createProducer(input: ProducerInput) {
  return mutationRequest<Producer>('/api/producers/', requestBody(input));
}

export function updateProducer(
  id: string,
  input: ProducerInput,
  expectedVersion: number,
) {
  return mutationRequest<Producer>(`/api/producers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, expected_version: expectedVersion }),
  });
}

export function changeProducerStatus(
  id: string,
  status: ProducerStatus,
  expectedVersion: number,
) {
  return mutationRequest<Producer>(`/api/producers/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, expected_version: expectedVersion }),
  });
}

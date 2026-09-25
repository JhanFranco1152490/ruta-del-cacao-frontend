import { HttpResponse } from 'msw';

import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];

// Respuesta de error con la forma uniforme del API ({ detail, code, fields }).
export const apiError = (
  status: number,
  code: string,
  detail = 'Error de prueba.',
  fields: Record<string, string[]> = {},
) => HttpResponse.json({ detail, code, fields }, { status });

// El 401 de un token de acceso vencido (o de una renovación rechazada).
export const sessionExpired = () =>
  apiError(401, 'authentication_failed', 'La sesión venció.');

export const buildSession = (
  user: Partial<Schemas['SessionUser']> = {},
): Schemas['Session'] => ({
  user: {
    id: 'u1',
    email: 'persona@example.com',
    roles: ['producer'],
    permissions: [],
    ...user,
  },
});

export const buildProducer = (
  overrides: Partial<Schemas['Producer']> = {},
): Schemas['Producer'] => ({
  id: 'p1',
  member_code: 'PROD-000001',
  document_type: 'CC',
  identity_document: '1234567890',
  first_name: 'Ana',
  last_name: 'Prueba',
  phone: null,
  email: null,
  municipality_code: '54001',
  joined_on: '2026-03-15',
  status: 'active',
  version: 3,
  created_at: '2026-03-15T12:00:00-05:00',
  updated_at: '2026-03-15T12:00:00-05:00',
  ...overrides,
});

export const buildPage = <T>(results: T[], count = results.length) => ({
  count,
  next: null,
  previous: null,
  results,
});

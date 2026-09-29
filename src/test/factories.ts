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

// El 401 de una petición sin cookie de acceso (sesión vencida o ausente): el backend real
// lo responde tanto con este código como con authentication_failed.
export const notAuthenticated = () =>
  apiError(401, 'not_authenticated', 'No autenticado.');

export const buildSessionUser = (
  overrides: Partial<Schemas['SessionUser']> = {},
): Schemas['SessionUser'] => ({
  id: 'u1',
  email: 'persona@example.com',
  roles: [{ id: 'role-producer', code: 'producer', name: 'Productor' }],
  producer_id: 'p1',
  permissions: [],
  ...overrides,
});

export const buildSession = (
  user: Partial<Schemas['SessionUser']> = {},
): Schemas['Session'] => ({
  user: buildSessionUser(user),
});

export const buildProducer = (
  overrides: Partial<Schemas['ProducerDetail']> = {},
): Schemas['ProducerDetail'] => ({
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
  account: null,
  association_access: false,
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

export const buildMunicipalities = (): Schemas['Municipality'][] => [
  { code: '54001', name: 'Cúcuta' },
  { code: '54518', name: 'Pamplona' },
];

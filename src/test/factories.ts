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

// Los datos de la propia cuenta para "Mi cuenta" (inventados).
export const buildProfile = (
  overrides: Partial<Schemas['Profile']> = {},
): Schemas['Profile'] => ({
  email: 'persona@example.com',
  first_name: 'Luis',
  last_name: 'Pérez',
  document_type: 'CC',
  identity_document: '1094000111',
  phone: '3001234567',
  producer: {
    id: 'p1',
    member_code: 'PROD-000001',
    first_name: 'Ana',
    last_name: 'Ejemplo',
  },
  ...overrides,
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

const NORTE_DE_SANTANDER = { code: '54', name: 'Norte de Santander' };

export const buildMunicipality = (
  code: string,
  name: string,
): Schemas['Municipality'] => ({ code, name, department: NORTE_DE_SANTANDER });

export const buildMunicipalities = (): Schemas['Municipality'][] => [
  buildMunicipality('54001', 'Cúcuta'),
  buildMunicipality('54518', 'Pamplona'),
];

export const buildFarm = (
  overrides: Partial<Schemas['Farm']> = {},
): Schemas['Farm'] => ({
  id: 'f1',
  name: 'La Esperanza',
  department: { id: '54', name: 'Norte de Santander' },
  municipality: { id: '54001', name: 'Cúcuta' },
  details: '',
  area_hectares: '12.50',
  allocated_area_hectares: '0.00',
  altitude_masl: 950,
  location: { latitude: '7.8234567', longitude: '-72.5123456' },
  version: 1,
  is_active: true,
  captured_at: null,
  created_at: '2026-09-29T12:00:00-05:00',
  updated_at: '2026-09-29T12:00:00-05:00',
  ...overrides,
});

export const buildFarmMapPoint = (
  overrides: Partial<Schemas['FarmMapPoint']> = {},
): Schemas['FarmMapPoint'] => ({
  id: 's1',
  name: 'La Esperanza',
  is_active: true,
  location: { latitude: '8.6412345', longitude: '-72.7356789' },
  producer: {
    id: 'p1',
    member_code: 'ASO-0001',
    first_name: 'Ana',
    last_name: 'Rojas',
  },
  ...overrides,
});

export const buildVertex = (
  longitude: string,
  latitude: string,
  overrides: Partial<Schemas['Vertex']> = {},
): Schemas['Vertex'] => ({
  latitude,
  longitude,
  accuracy_m: null,
  captured_at: null,
  source: 'map',
  ...overrides,
});

export const buildPlot = (
  overrides: Partial<Schemas['Plot']> = {},
): Schemas['Plot'] => ({
  id: 'pl1',
  farm: { id: 'f1', name: 'La Esperanza' },
  code: 'P1',
  area_hectares: '2.40',
  measured_area_hectares: null,
  boundary: null,
  version: 1,
  is_active: true,
  captured_at: null,
  created_at: '2026-10-01T12:00:00-05:00',
  updated_at: '2026-10-01T12:00:00-05:00',
  ...overrides,
});

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
  roles: [
    {
      id: 'role-producer',
      code: 'producer',
      name: 'Productor',
      farm_scope: null,
    },
  ],
  producer_id: 'p1',
  permissions: [],
  is_superuser: false,
  // El Productor alcanza todas sus fincas; un empleado, solo las suyas (`farms`).
  farms: [],
  all_farms: true,
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
  farms: [],
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
  code: 'F01',
  name: 'La Esperanza',
  producer: {
    id: 'p1',
    member_code: 'PROD-000007',
    first_name: 'Ana',
    last_name: 'Prueba',
  },
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

export const buildCacaoVariety = (
  overrides: Partial<Schemas['CacaoVariety']> = {},
): Schemas['CacaoVariety'] => ({
  id: 'v-ccn-51',
  name: 'CCN-51',
  common_names: [],
  description: 'Procedencia: Ecuador. Autocompatible.',
  is_active: true,
  ...overrides,
});

export const buildPestDisease = (
  overrides: Partial<Schemas['PestDisease']> = {},
): Schemas['PestDisease'] => ({
  id: 'pd-monilia',
  name: 'Monilia',
  kind: 'disease',
  scientific_name: 'Moniliophthora roreri',
  description: 'Solo ataca la mazorca. Empieza con manchas cafés.',
  is_active: true,
  suggested_sampling_unit: null,
  suggested_control_method: null,
  ...overrides,
});

export const buildCharacterization = (
  overrides: Partial<Schemas['PlotCharacterization']> = {},
): Schemas['PlotCharacterization'] => ({
  plot_id: 'pl1',
  plantings: [
    {
      variety: { id: 'v-ccn-51', name: 'CCN-51', is_active: true },
      planting_date: '2021-03',
      tree_count: 1800,
      propagation: 'grafted',
      stage: 'full_production',
    },
    {
      variety: { id: 'v-ics-95', name: 'ICS-95', is_active: true },
      planting_date: '2021-03',
      tree_count: 600,
      propagation: 'grafted',
      stage: 'full_production',
    },
  ],
  total_trees: 2400,
  management_system: 'conventional',
  shade_type: null,
  version: 2,
  captured_at: null,
  created_at: '2026-10-03T12:00:00-05:00',
  updated_at: '2026-10-03T12:00:00-05:00',
  ...overrides,
});

export const buildSnapshotPlanting = (
  overrides: Partial<Schemas['SnapshotPlanting']> = {},
): Schemas['SnapshotPlanting'] => ({
  variety_id: 'v-ccn-51',
  name: 'CCN-51',
  planting_date: '2021-03',
  tree_count: 1800,
  propagation: 'grafted',
  stage: 'full_production',
  ...overrides,
});

export const buildCharacterizationEvent = (
  overrides: Partial<Schemas['PlotCharacterizationEvent']> = {},
): Schemas['PlotCharacterizationEvent'] => ({
  version: 1,
  action: 'created',
  occurred_at: '2026-10-03T14:10:00-05:00',
  actor_name: 'Ana Gómez',
  changed_fields: [],
  snapshot: {
    plantings: [buildSnapshotPlanting()],
    management_system: null,
    shade_type: null,
  },
  ...overrides,
});

export const buildPlot = (
  overrides: Partial<Schemas['Plot']> = {},
): Schemas['Plot'] => ({
  id: 'pl1',
  farm: {
    id: 'f1',
    code: 'F01',
    name: 'La Esperanza',
    is_active: true,
    producer: {
      id: 'p1',
      member_code: 'PROD-000007',
      first_name: 'Ana',
      last_name: 'Prueba',
    },
  },
  code: 'P01',
  name: null,
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

export const buildAgriculturalInput = (
  overrides: Partial<Schemas['AgriculturalInput']> = {},
): Schemas['AgriculturalInput'] => ({
  id: 'in1',
  producer: {
    id: 'p1',
    member_code: 'ASO-001',
    first_name: 'Productora',
    last_name: 'De Prueba',
  },
  name: 'Urea 46 %',
  input_type: 'fertilizer',
  unit: 'kg',
  package_type: 'sack',
  package_size: '50.000',
  is_active: true,
  has_records: false,
  version: 1,
  created_at: '2026-10-06T12:00:00-05:00',
  updated_at: '2026-10-06T12:00:00-05:00',
  ...overrides,
});

export const buildInputStock = (
  overrides: Partial<Schemas['InputStock']> = {},
): Schemas['InputStock'] => ({
  input_id: 'in1',
  farm_id: 'f1',
  quantity: '100.000',
  last_count_date: null,
  updated_at: '2026-10-07T12:00:00-05:00',
  ...overrides,
});

export const buildInputMovement = (
  overrides: Partial<Schemas['InputMovement']> = {},
): Schemas['InputMovement'] => ({
  id: 'mv1',
  kind: 'entry',
  quantity: '100.000',
  counted_quantity: null,
  occurred_on: '2026-10-07',
  note: '',
  actor_name: 'Cuenta de prueba',
  created_at: '2026-10-07T12:00:00-05:00',
  ...overrides,
});

// Una cuenta de la lista de responsables. Sin finca (como el Productor) y asignable: vale para
// cualquier parcela. También sirve como el responsable de una actividad, que lleva menos datos.
export const buildAssignee = (
  overrides: Partial<Schemas['AssigneeOption']> = {},
): Schemas['AssigneeOption'] => ({
  id: 'u1',
  full_name: 'Cuenta de prueba',
  is_active: true,
  farm_ids: [],
  all_farms: true,
  assignable: true,
  ...overrides,
});

export const buildHarvest = (
  overrides: Partial<Schemas['Harvest']> = {},
): Schemas['Harvest'] => ({
  id: 'h1',
  plot: {
    id: 'pl1',
    code: 'P05',
    name: 'Lote del río',
    is_active: true,
    farm: { id: 'f1', code: 'F02', name: 'La Esperanza', is_active: true },
  },
  producer_id: 'p1',
  harvest_date: '2026-10-14',
  green_weight_kg: '120.5',
  variety: { id: 'v1', name: 'CCN-51', is_active: true },
  collector: { id: 'u1', full_name: 'Cuenta de prueba', is_active: true },
  characterization_version: 1,
  registered_by: { id: 'u1', full_name: 'Cuenta de prueba' },
  captured_at: null,
  version: 1,
  created_at: '2026-10-14T15:00:00Z',
  updated_at: '2026-10-14T15:00:00Z',
  lot: null,
  ...overrides,
});

export const buildLot = (
  overrides: Partial<Schemas['Lot']> = {},
): Schemas['Lot'] => {
  // El lote trae su cosecha sin el campo `lot`; el de más no estorba en una prueba.
  const harvest: Schemas['HarvestRepresentation'] = buildHarvest();
  return {
    id: 'l1',
    code: '000123-F02-P05-261014-1',
    status: 'generated',
    harvest,
    producer: { id: 'p1', member_code: 'PROD-000123' },
    green_weight_kg: harvest.green_weight_kg,
    created_by: { id: 'u1', full_name: 'Cuenta de prueba' },
    version: 1,
    created_at: '2026-10-14T16:00:00Z',
    updated_at: '2026-10-14T16:00:00Z',
    fermentation: null,
    drying: null,
    ...overrides,
  };
};

export const buildFermentationTurn = (
  overrides: Partial<Schemas['FermentationTurn']> = {},
): Schemas['FermentationTurn'] => ({
  id: 'ft1',
  number: 1,
  turned_at: '2026-10-17T07:30:00-05:00',
  hours_since_start: '48.5',
  temperature_c: '45.0',
  ph: '4.90',
  notes: '',
  recorded_by: { id: 'u1', full_name: 'Cuenta de prueba' },
  version: 1,
  ...overrides,
});

// Una fermentación en curso en C-01, iniciada el 15 oct. a las 07:00 y todavía sin volteos: el
// primero toca a las 48 h.
export const buildFermentation = (
  overrides: Partial<Schemas['FermentationProcess']> = {},
): Schemas['FermentationProcess'] => {
  const lot = buildLot({ status: 'fermenting' });
  return {
    lot: {
      id: lot.id,
      code: lot.code,
      status: lot.status,
      green_weight_kg: lot.green_weight_kg,
      harvest: lot.harvest,
    },
    farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
    facility: { id: 'fc1', name: 'C-01', capacity_kg: '600.0' },
    started_at: '2026-10-15T07:00:00-05:00',
    over_capacity: false,
    responsible: { id: 'u1', full_name: 'Cuenta de prueba', is_active: true },
    elapsed_hours: '24.0',
    next_turn_due_at: '2026-10-17T07:00:00-05:00',
    parameters: {
      first_turn_hours: 48,
      next_turn_hours: 24,
      temperature_min_c: '40.0',
      temperature_max_c: '50.0',
      ph_min: '4.00',
      ph_max: '5.50',
    },
    turns: [],
    result: null,
    version: 1,
    created_at: '2026-10-15T12:10:00Z',
    updated_at: '2026-10-15T12:10:00Z',
    ...overrides,
  };
};

export const buildDryingLog = (
  overrides: Partial<Schemas['DryingLog']> = {},
): Schemas['DryingLog'] => ({
  id: 'dl1',
  measured_at: '2026-10-23T16:00:00-05:00',
  log_date: '2026-10-23',
  day_number: 2,
  moisture_pct: '12.4',
  sun_hours: '6.0',
  shade_hours: null,
  turn_count: 2,
  turn_frequency_hours: '3.0',
  weather: 'sunny',
  notes: '',
  recorded_by: { id: 'u1', full_name: 'Cuenta de prueba' },
  version: 1,
  ...overrides,
});

// Un secado en curso en M-01, iniciado el 22 oct. a las 14:00 y todavía sin bitácora.
export const buildDrying = (
  overrides: Partial<Schemas['DryingProcess']> = {},
): Schemas['DryingProcess'] => {
  const lot = buildLot({ status: 'drying' });
  return {
    lot: {
      id: lot.id,
      code: lot.code,
      status: lot.status,
      green_weight_kg: lot.green_weight_kg,
      harvest: lot.harvest,
    },
    farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
    facility: { id: 'fc1', name: 'M-01', capacity_kg: '600.0' },
    started_at: '2026-10-22T14:00:00-05:00',
    entry_moisture_pct: '57.0',
    entry_moisture_out_of_range: false,
    responsible: { id: 'u1', full_name: 'Cuenta de prueba', is_active: true },
    estimated_days: { min: 5, max: 7 },
    target_moisture: { min: '6.5', max: '7.5' },
    current_day: 2,
    elapsed_hours: '24.0',
    logs: [],
    result: null,
    version: 1,
    created_at: '2026-10-22T19:10:00Z',
    updated_at: '2026-10-22T19:10:00Z',
    ...overrides,
  };
};

export const buildFacility = (
  overrides: Partial<Schemas['PostharvestFacility']> = {},
): Schemas['PostharvestFacility'] => ({
  id: 'fc1',
  farm: { id: 'f1', code: 'F02', name: 'La Esperanza', is_active: true },
  producer_id: 'p1',
  facility_type: 'fermentation_box',
  name: 'C-01',
  capacity_kg: '600.0',
  is_active: true,
  status: 'available',
  occupied_by: null,
  has_records: false,
  version: 1,
  created_at: '2026-10-16T14:00:00Z',
  updated_at: '2026-10-16T14:00:00Z',
  ...overrides,
});

export const buildCollector = (
  overrides: Partial<Schemas['CollectorOption']> = {},
): Schemas['CollectorOption'] => ({
  id: 'u1',
  full_name: 'Cuenta de prueba',
  is_active: true,
  farm_ids: [],
  all_farms: true,
  assignable: true,
  ...overrides,
});

export const buildAgriculturalActivity = (
  overrides: Partial<Schemas['AgriculturalActivity']> = {},
): Schemas['AgriculturalActivity'] => ({
  id: 'a1',
  plot: {
    id: 'pl1',
    code: 'P03',
    name: null,
    is_active: true,
    farm: { id: 'f1', code: 'F01', name: 'Finca de prueba', is_active: true },
  },
  producer_id: 'p1',
  activity_type: 'fertilization',
  other_description: null,
  scheduled_date: '2026-10-20',
  status: 'scheduled',
  state: 'scheduled',
  days_late: 0,
  assignee: buildAssignee(),
  done_date: null,
  inputs: [],
  completed_by: null,
  completed_at: null,
  version: 1,
  created_at: '2026-10-08T09:00:00-05:00',
  updated_at: '2026-10-08T09:00:00-05:00',
  monitoring: null,
  control_of: null,
  ...overrides,
});

// Una notificación de la bandeja, con la actividad como la devuelve el calendario (inventada).
export const buildNotification = (
  overrides: Partial<Schemas['Notification']> = {},
): Schemas['Notification'] => ({
  id: 'n1',
  kind: 'activity_upcoming',
  severity: 'normal',
  created_at: '2026-10-18T06:05:00-05:00',
  read_at: null,
  condition_date: '2026-10-20',
  detection_id: null,
  activity: buildAgriculturalActivity(),
  ...overrides,
});

const PARAMETER_BASELINE: Schemas['PostharvestValues'] = {
  entry_moisture_min_pct: '55.0',
  entry_moisture_max_pct: '60.0',
  target_moisture_min_pct: '6.5',
  target_moisture_max_pct: '7.5',
  estimated_days_min: 5,
  estimated_days_max: 7,
  slow_stall_window_hours: 48,
  slow_stall_min_drop_pct: '4.0',
  slow_duration_day: 8,
  slow_duration_moisture_pct: '10.0',
  accelerated_day: 3,
  accelerated_moisture_pct: '15.0',
  near_target_min_pct: '7.6',
  near_target_max_pct: '8.5',
  overdried_moisture_pct: '6.0',
  first_turn_hours: 48,
  next_turn_hours: 24,
  temperature_min_c: '40.0',
  temperature_max_c: '50.0',
  ph_min: '4.00',
  ph_max: '5.50',
};

// Los parámetros de un productor que nunca guardó nada: la línea base, versión 0.
export const buildParameters = (
  overrides: Partial<Schemas['PostharvestParameters']> = {},
): Schemas['PostharvestParameters'] => ({
  producer_id: 'p1',
  is_default: true,
  values: { ...PARAMETER_BASELINE },
  baseline: { ...PARAMETER_BASELINE },
  version: 0,
  updated_at: null,
  updated_by: null,
  ...overrides,
});

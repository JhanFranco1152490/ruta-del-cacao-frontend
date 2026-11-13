import { HttpResponse } from 'msw';

import type {
  LotStock,
  StockExit,
  StockExitRow,
} from '@/features/warehouse/api';
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
    quality: null,
    warehouse: null,
    ...overrides,
  };
};

// Un lote Seco de La Esperanza esperando su evaluación: 62,5 kg secos al 7,0 %.
export const buildLotQuality = (
  overrides: Partial<Schemas['LotQuality']> = {},
): Schemas['LotQuality'] => ({
  lot: {
    id: 'l1',
    code: '000123-F02-P05-261014-1',
    status: 'dried',
    version: 4,
  },
  farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
  dry_weight_kg: '62.5',
  final_moisture_pct: '7.0',
  drying_ended_at: '2026-10-29T16:00:00-05:00',
  evaluation: null,
  classification: null,
  discard: null,
  ...overrides,
});

export const buildQualityEvaluation = (
  overrides: Partial<Schemas['QualityEvaluation']> = {},
): Schemas['QualityEvaluation'] => ({
  well_fermented_pct: '85.0',
  moldy_pct: '2.0',
  other_defects_pct: '5.0',
  notes: '',
  evaluated_at: '2026-10-30T09:00:00-05:00',
  evaluated_by: { id: 'u1', full_name: 'Cuenta de prueba' },
  corrected_at: null,
  corrected_by: null,
  version: 1,
  ...overrides,
});

// Los 62,5 kg secos repartidos sin descarte.
export const buildQualityClassification = (
  overrides: Partial<Schemas['QualityClassification']> = {},
): Schemas['QualityClassification'] => ({
  g1_kg: '50.0',
  g2_kg: '12.5',
  discard_kg: '0.0',
  discard_reason: '',
  discard_detail: '',
  classified_at: '2026-10-30T10:00:00-05:00',
  classified_by: { id: 'u1', full_name: 'Cuenta de prueba' },
  ...overrides,
});

export const buildQualityDiscard = (
  overrides: Partial<Schemas['QualityDiscard']> = {},
): Schemas['QualityDiscard'] => ({
  reason: 'mold',
  detail: '',
  discarded_at: '2026-10-30T10:00:00-05:00',
  discarded_by: { id: 'u1', full_name: 'Cuenta de prueba' },
  ...overrides,
});

export const buildQualitySummary = (
  overrides: Partial<Schemas['QualitySummary']> = {},
): Schemas['QualitySummary'] => ({
  to_evaluate: 1,
  to_evaluate_kg: '62.5',
  evaluated: 0,
  discarded_this_month: 0,
  ...overrides,
});

export const buildClosedSummary = (
  overrides: Partial<Schemas['ClosedSummary']> = {},
): Schemas['ClosedSummary'] => ({
  classified: 2,
  discarded: 1,
  g1_kg: '300.0',
  g2_kg: '60.5',
  discarded_kg: '321.2',
  ...overrides,
});

// La Bodega principal de La Esperanza, activa y sin usar.
export const buildWarehouse = (
  overrides: Partial<Schemas['Warehouse']> = {},
): Schemas['Warehouse'] => ({
  id: 'w1',
  farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
  name: 'Bodega principal',
  is_active: true,
  in_use: false,
  version: 1,
  ...overrides,
});

// Un lote Clasificado de La Esperanza, con 250,0 kg de G1 y 55,2 de G2, todavía sin ingresar.
export const buildLotStock = (overrides: Partial<LotStock> = {}): LotStock => ({
  lot: {
    id: 'l1',
    code: '000123-F02-P05-261014-1',
    status: 'classified',
    version: 10,
  },
  farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
  classified: {
    g1_kg: '250.0',
    g2_kg: '55.2',
    classified_at: '2026-10-29T15:00:00-05:00',
  },
  entry: null,
  balances: [],
  exits: [],
  moves: [],
  ...overrides,
});

// El ingreso del lote de `buildLotStock` a la Bodega principal, sin salidas todavía.
export const buildStockEntry = (
  overrides: Partial<Schemas['StockEntry']> = {},
): Schemas['StockEntry'] => ({
  entry_date: '2026-10-30',
  warehouse: { id: 'w1', name: 'Bodega principal' },
  location: 'Estante 3',
  g1_kg: '250.0',
  g2_kg: '55.2',
  entered_at: '2026-10-30T08:40:00-05:00',
  entered_by: { id: 'u1', full_name: 'Cuenta de prueba' },
  corrected_at: null,
  corrected_by: null,
  can_correct: true,
  version: 1,
  ...overrides,
});

// Una muestra de 5,0 kg de G1, vigente.
export const buildStockExit = (
  overrides: Partial<StockExit> = {},
): StockExit => ({
  id: 'e1',
  grade: 'g1',
  quantity_kg: '5.0',
  exit_date: '2026-10-31',
  reason: 'sample',
  detail: '',
  created_at: '2026-10-31T10:05:00-05:00',
  created_by: { id: 'u1', full_name: 'Cuenta de prueba' },
  voided: null,
  can_void: true,
  ...overrides,
});

// Un cambio de lugar, de «Estante 3» a «Estante 9» dentro de la Bodega principal.
export const buildStockMove = (
  overrides: Partial<Schemas['StockMove']> = {},
): Schemas['StockMove'] => ({
  id: 'm1',
  from_warehouse: { id: 'w1', name: 'Bodega principal' },
  from_location: 'Estante 3',
  to_warehouse: { id: 'w1', name: 'Bodega principal' },
  to_location: 'Estante 9',
  moved_at: '2026-11-02T08:30:00-05:00',
  moved_by: { id: 'u1', full_name: 'Cuenta de prueba' },
  ...overrides,
});

// Una fila de la pestaña Salidas: la muestra de 5,0 kg de G1 de `buildStockExit`, con su lote.
export const buildStockExitRow = (
  overrides: Partial<StockExitRow> = {},
): StockExitRow => ({
  ...buildStockExit(),
  lot: { id: 'l1', code: '000123-F02-P05-261014-1' },
  farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
  warehouse: { id: 'w1', name: 'Bodega principal' },
  ...overrides,
});

export const buildExitSummary = (
  overrides: Partial<Schemas['ExitSummary']> = {},
): Schemas['ExitSummary'] => ({
  exits: 2,
  quantity_kg: '25.0',
  by_reason: [
    { reason: 'shrinkage', exits: 1, quantity_kg: '20.0' },
    { reason: 'sample', exits: 1, quantity_kg: '5.0' },
  ],
  ...overrides,
});

export const buildStockRow = (
  overrides: Partial<Schemas['StockRow']> = {},
): Schemas['StockRow'] => ({
  lot: { id: 'l1', code: '000123-F02-P05-261014-1' },
  farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
  grade: 'g1',
  quantity_kg: '250.0',
  warehouse: { id: 'w1', name: 'Bodega principal' },
  location: 'Estante 3',
  entry_date: '2026-10-30',
  ...overrides,
});

export const buildStockSummary = (
  overrides: Partial<Schemas['StockSummary']> = {},
): Schemas['StockSummary'] => ({
  g1_kg: '250.0',
  g2_kg: '55.2',
  lots: 1,
  ...overrides,
});

export const buildPendingEntry = (
  overrides: Partial<Schemas['PendingEntry']> = {},
): Schemas['PendingEntry'] => ({
  lot: { id: 'l1', code: '000123-F02-P05-261014-1' },
  farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
  g1_kg: '250.0',
  g2_kg: '55.2',
  classified_at: '2026-10-29T15:00:00-05:00',
  ...overrides,
});

// El campo `warehouse` de un lote En bodega, con 5,0 kg de G1 ya sacados.
export const buildLotWarehouseDetail = (
  overrides: Partial<Schemas['LotWarehouseDetail']> = {},
): Schemas['LotWarehouseDetail'] => ({
  entry_date: '2026-10-30',
  warehouse_name: 'Bodega principal',
  location: 'Estante 3',
  g1_entered_kg: '250.0',
  g2_entered_kg: '55.2',
  g1_available_kg: '245.0',
  g2_available_kg: '55.2',
  ...overrides,
});

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

// Nombre, documento y contacto inventados: un comprador puede ser una persona natural.
export const buildBuyer = (
  overrides: Partial<Schemas['Buyer']> = {},
): Schemas['Buyer'] => ({
  id: 'b1',
  producer: {
    id: 'p1',
    member_code: '000123',
    first_name: 'Productora',
    last_name: 'De Ejemplo',
  },
  name: 'Chocolates del Oriente S.A.S.',
  document_type: 'NIT',
  identity_document: '900000001',
  buyer_type: 'chocolate_industry',
  contact_name: 'Persona de Ejemplo',
  phone: '3000000001',
  email: 'compras@example.com',
  is_active: true,
  has_records: false,
  version: 1,
  created_at: '2026-10-23T14:00:00Z',
  updated_at: '2026-10-23T14:00:00Z',
  ...overrides,
});

export const buildSaleLine = (
  overrides: Partial<Schemas['SaleLine']> = {},
): Schemas['SaleLine'] => ({
  id: 'sl1',
  lot: { id: 'l1', code: '000123-F02-P05-261014-1' },
  grade: 'g1',
  quantity_kg: '150.0',
  price_per_kg: 18500,
  subtotal: 2775000,
  ...overrides,
});

// Una venta registrada de La Esperanza, sin soporte, como llega en la lista (sin sus líneas).
export const buildSaleListItem = (
  overrides: Partial<Schemas['SaleListItem']> = {},
): Schemas['SaleListItem'] => ({
  id: 's1',
  code: 'V-0001',
  farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
  buyer: {
    id: 'b1',
    name: 'Chocolates del Oriente S.A.S.',
    buyer_type: 'chocolate_industry',
    is_active: true,
  },
  sale_date: '2026-11-20',
  notes: '',
  g1_kg: '150.0',
  g2_kg: '40.0',
  total: 3375000,
  invoice: null,
  status: 'registered',
  created_at: '2026-11-20T15:11:40Z',
  created_by: { id: 'u1', full_name: 'Persona Comercializadora' },
  voided: null,
  version: 1,
  ...overrides,
});

// La misma venta en su ficha, con una línea de G1 y una de G2 que suman sus kilos y su total.
export const buildSale = (
  overrides: Partial<Schemas['Sale']> = {},
): Schemas['Sale'] => ({
  ...buildSaleListItem(),
  lines: [
    buildSaleLine(),
    buildSaleLine({
      id: 'sl2',
      grade: 'g2',
      quantity_kg: '40.0',
      price_per_kg: 15000,
      subtotal: 600000,
    }),
  ],
  ...overrides,
});

export const buildSaleSummary = (
  overrides: Partial<Schemas['SaleSummary']> = {},
): Schemas['SaleSummary'] => ({
  total: 3375000,
  g1_kg: '150.0',
  g2_kg: '40.0',
  sales: 1,
  ...overrides,
});

export const buildBuyerOption = (
  overrides: Partial<Schemas['BuyerOption']> = {},
): Schemas['BuyerOption'] => ({
  id: 'b1',
  name: 'Chocolates del Oriente S.A.S.',
  buyer_type: 'chocolate_industry',
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
  condition_at: null,
  resolved_at: null,
  detection_id: null,
  activity: buildAgriculturalActivity(),
  lot: null,
  fermentation_turn: null,
  drying_log: null,
  ...overrides,
});

// El lote como viene en un aviso de poscosecha: en fermentación en C-02 desde el 19 oct. a las 8:00.
export const buildLotBrief = (
  overrides: Partial<Schemas['LotBrief']> = {},
): Schemas['LotBrief'] => ({
  id: 'l1',
  code: '000123-F02-P05-261014-1',
  status: 'fermenting',
  farm: { id: 'f1', name: 'La Esperanza' },
  fermentation: {
    started_at: '2026-10-19T08:00:00-05:00',
    ended_at: null,
    facility: 'C-02',
  },
  drying: null,
  quality: null,
  warehouse: null,
  ...overrides,
});

// Un desvío como lo devuelve el registro de un volteo o una bitácora.
export const buildDeviation = (
  overrides: Partial<Schemas['Deviation']> = {},
): Schemas['Deviation'] => ({
  kind: 'drying_overdried',
  severity: 'critical',
  value: '5.8',
  limit: '6.0',
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

// Los paneles de indicadores, con cifras inventadas y las cuentas cuadradas: la parcela río suma
// los 620 kg del periodo y G1 + G2 + descarte da los 380 kg clasificados.
export const buildProducerIndicators = (
  overrides: Partial<Schemas['ProducerIndicators']> = {},
): Schemas['ProducerIndicators'] => ({
  period: { from: '2026-01-01', to: '2026-03-31' },
  production: {
    green_kg: '720.0',
    dry_kg: '166.0',
    green_kg_not_dried: '220.0',
    area_hectares: '5.00',
    green_kg_per_hectare: '144.0',
    dry_kg_per_hectare: '33.2',
    plots: [
      {
        plot_id: 'pl1',
        plot_code: 'P01',
        plot_name: 'Lote del río',
        farm_id: 'f1',
        farm_code: 'F01',
        farm_name: 'La Esperanza',
        is_active: true,
        area_hectares: '2.50',
        green_kg: '620.0',
        dry_kg: '136.0',
        green_kg_per_hectare: '248.0',
        dry_kg_per_hectare: '54.4',
      },
      {
        plot_id: 'pl2',
        plot_code: 'P01',
        plot_name: '',
        farm_id: 'f2',
        farm_code: 'F02',
        farm_name: 'El Mirador',
        is_active: false,
        area_hectares: '1.00',
        green_kg: '100.0',
        dry_kg: '30.0',
        green_kg_per_hectare: '100.0',
        dry_kg_per_hectare: '30.0',
      },
    ],
    months: [
      { month: '2026-01', green_kg: '400.0', dry_kg: '136.0' },
      { month: '2026-02', green_kg: '220.0', dry_kg: '0.0' },
      { month: '2026-03', green_kg: '100.0', dry_kg: '30.0' },
    ],
  },
  quality: {
    classified_kg: '380.0',
    g1_kg: '290.0',
    g2_kg: '70.0',
    discard_kg: '20.0',
    g1_pct: '76.3',
    g2_pct: '18.4',
    discard_pct: '5.3',
    lots_classified: 1,
    lots_discarded: 0,
  },
  inventory: {
    g1_kg: '120.0',
    g2_kg: '35.0',
    total_kg: '155.0',
    farms: [
      {
        farm_id: 'f1',
        farm_code: 'F01',
        farm_name: 'La Esperanza',
        g1_kg: '120.0',
        g2_kg: '35.0',
      },
    ],
  },
  sales: {
    sold_kg: '210.0',
    g1_kg: '170.0',
    g2_kg: '40.0',
    sales: 2,
    months: [
      { month: '2026-01', sold_kg: '190.0' },
      { month: '2026-02', sold_kg: '0.0' },
      { month: '2026-03', sold_kg: '20.0' },
    ],
  },
  ...overrides,
});

export const buildAssociationIndicators = (
  overrides: Partial<Schemas['AssociationIndicators']> = {},
): Schemas['AssociationIndicators'] => ({
  period: { from: '2026-01-01', to: '2026-03-31' },
  totals: {
    producers: 2,
    farms: 2,
    green_kg: '820.0',
    dry_kg: '196.0',
    sold_kg: '260.0',
    classified_kg: '480.0',
    g1_kg: '350.0',
    g2_kg: '100.0',
    discard_kg: '30.0',
    g1_pct: '72.9',
    g2_pct: '20.8',
    discard_pct: '6.3',
  },
  months: [
    { month: '2026-01', green_kg: '500.0', dry_kg: '136.0', sold_kg: '190.0' },
    { month: '2026-02', green_kg: '220.0', dry_kg: '30.0', sold_kg: '0.0' },
    { month: '2026-03', green_kg: '100.0', dry_kg: '30.0', sold_kg: '70.0' },
  ],
  farms: [
    {
      farm_id: 'f1',
      farm_code: 'F01',
      farm_name: 'La Esperanza',
      municipality_code: '54001',
      producer: {
        id: 'p1',
        member_code: 'PROD-000001',
        first_name: 'Ana',
        last_name: 'Ejemplo',
      },
      green_kg: '720.0',
      dry_kg: '166.0',
      sold_kg: '210.0',
      classified_kg: '380.0',
      g1_kg: '290.0',
      g2_kg: '70.0',
      discard_kg: '20.0',
      g1_pct: '76.3',
      g2_pct: '18.4',
      discard_pct: '5.3',
    },
    {
      farm_id: 'f2',
      farm_code: 'F01',
      farm_name: 'Villa Rosa',
      municipality_code: '54518',
      producer: {
        id: 'p2',
        member_code: 'PROD-000002',
        first_name: 'Luis',
        last_name: 'Ejemplo',
      },
      green_kg: '100.0',
      dry_kg: '30.0',
      sold_kg: '50.0',
      classified_kg: '100.0',
      g1_kg: '60.0',
      g2_kg: '30.0',
      discard_kg: '10.0',
      g1_pct: '60.0',
      g2_pct: '30.0',
      discard_pct: '10.0',
    },
  ],
  ...overrides,
});

// Los reportes, con nombres y cifras inventados. El del productor es de producción, como el ejemplo
// de la API: dos cosechas, una con lote seco y otra sin lote todavía.
export const buildReportColumn = (
  overrides: Partial<Schemas['ReportColumn']> = {},
): Schemas['ReportColumn'] => ({
  key: 'green_kg',
  label: 'Kg en baba',
  kind: 'kg',
  ...overrides,
});

export const buildReportTotal = (
  overrides: Partial<Schemas['ReportTotal']> = {},
): Schemas['ReportTotal'] => ({
  key: 'green_kg',
  label: 'Kg en baba',
  kind: 'kg',
  value: '150.0',
  ...overrides,
});

export const buildReport = (
  overrides: Partial<Schemas['Report']> = {},
): Schemas['Report'] => ({
  type: 'production',
  title: 'Producción',
  generated_at: '2026-03-31T10:15:00-05:00',
  generated_by: 'Ana Ejemplo',
  filters: [
    {
      key: 'period',
      label: 'Periodo',
      text: '01/01/2026 – 31/03/2026',
      id: null,
    },
    { key: 'farm', label: 'Finca', text: 'F01 · La Esperanza', id: 'f1' },
  ],
  columns: [
    buildReportColumn({ key: 'harvest_date', label: 'Fecha', kind: 'date' }),
    buildReportColumn({ key: 'plot', label: 'Parcela', kind: 'text' }),
    buildReportColumn(),
    buildReportColumn({ key: 'lot_code', label: 'Lote', kind: 'text' }),
    buildReportColumn({ key: 'dry_kg', label: 'Kg seco', kind: 'kg' }),
    buildReportColumn({
      key: 'yield_pct',
      label: 'Rendimiento %',
      kind: 'pct',
    }),
  ],
  rows: [
    {
      harvest_date: '2026-02-03',
      plot: 'P01 · Lote del río',
      green_kg: '120.0',
      lot_code: '000001-F01-P01-260203-1',
      dry_kg: '40.5',
      yield_pct: '33.8',
    },
    {
      harvest_date: '2026-02-04',
      plot: 'P02 · Lote alto',
      green_kg: '30.0',
      lot_code: null,
      dry_kg: null,
      yield_pct: null,
    },
  ],
  totals: [
    buildReportTotal({
      key: 'harvests',
      label: 'Cosechas',
      kind: 'count',
      value: 2,
    }),
    buildReportTotal(),
    buildReportTotal({
      key: 'dry_kg',
      label: 'Kg seco',
      value: '40.5',
    }),
  ],
  ...overrides,
});

// El de la asociación: una fila por finca, también la que no vendió nada.
export const buildAssociationReport = (
  overrides: Partial<Schemas['Report']> = {},
): Schemas['Report'] =>
  buildReport({
    type: 'sales',
    title: 'Comercialización',
    filters: [
      {
        key: 'period',
        label: 'Periodo',
        text: '01/01/2026 – 31/03/2026',
        id: null,
      },
    ],
    columns: [
      buildReportColumn({ key: 'farm', label: 'Finca', kind: 'text' }),
      buildReportColumn({
        key: 'municipality',
        label: 'Municipio',
        kind: 'text',
      }),
      buildReportColumn({ key: 'producer', label: 'Productor', kind: 'text' }),
      buildReportColumn({ key: 'sold_kg', label: 'Kg vendidos', kind: 'kg' }),
    ],
    rows: [
      {
        farm: 'F01 · La Esperanza',
        municipality: 'Cúcuta',
        producer: 'PROD-000001 · Ana Ejemplo',
        sold_kg: '260.0',
      },
      {
        farm: 'F02 · Villa Rosa',
        municipality: 'Tibú',
        producer: 'PROD-000002 · Luis Prueba',
        sold_kg: '0.0',
      },
    ],
    totals: [
      buildReportTotal({
        key: 'sales',
        label: 'Ventas',
        kind: 'count',
        value: 3,
      }),
      buildReportTotal({
        key: 'sold_kg',
        label: 'Kg vendidos',
        value: '260.0',
      }),
    ],
    ...overrides,
  });

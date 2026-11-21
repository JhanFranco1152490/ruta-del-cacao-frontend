import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];
type HistoryStage = Schemas['LotHistory']['stages'][number];
type HistoryKind = HistoryStage['kind'];
type HistoryEntry<K extends HistoryKind> = Extract<HistoryStage, { kind: K }>;
type HistoryData<K extends HistoryKind> = HistoryEntry<K>[K &
  keyof HistoryEntry<K>];
type HistoryWhen = { occurred_on: string; occurred_at: string | null };

// Los datos de cada etapa de un lote de La Esperanza que recorrió todo el proceso hasta venderse.
const HISTORY_DATA: { [K in HistoryKind]: HistoryData<K> } = {
  harvest: {
    harvest_id: 'h1',
    variety: 'CCN-51',
    characterization_version: 3,
    collector: 'Recolector de prueba',
    green_weight_kg: '120.0',
  },
  lot_created: { created_by: 'Cuenta de prueba' },
  fermentation: {
    started_at: '2026-03-15T07:00:00-05:00',
    ended_at: '2026-03-21T07:30:00-05:00',
    days: 6,
    facility: 'C-01',
    responsible: 'Responsable de prueba',
    turn_count: 2,
    temperature_min_c: '38.0',
    temperature_max_c: '47.5',
    ph_min: '4.20',
    ph_max: '5.10',
    last_turn_at: '2026-03-18T08:00:00-05:00',
    turns: [
      {
        turned_at: '2026-03-17T08:00:00-05:00',
        temperature_c: '38.0',
        ph: '5.10',
      },
      {
        turned_at: '2026-03-18T08:00:00-05:00',
        temperature_c: '47.5',
        ph: '4.20',
      },
    ],
  },
  drying: {
    started_at: '2026-03-21T09:00:00-05:00',
    ended_at: '2026-03-28T16:00:00-05:00',
    days: 8,
    facility: 'M-01',
    responsible: 'Responsable de prueba',
    entry_moisture_pct: '55.0',
    log_count: 2,
    last_moisture_pct: '7.5',
    total_sun_hours: '14.0',
    final_moisture_pct: '7.0',
    dry_weight_kg: '45.0',
    yield_pct: '37.5',
    logs: [
      {
        day_number: 1,
        log_date: '2026-03-21',
        moisture_pct: '40.0',
        sun_hours: '6.0',
        weather: 'sunny',
      },
      {
        day_number: 2,
        log_date: '2026-03-22',
        moisture_pct: '7.5',
        sun_hours: '8.0',
        weather: 'partly_cloudy',
      },
    ],
  },
  evaluation: {
    evaluated_by: 'Evaluador de prueba',
    well_fermented_pct: '85.0',
    moldy_pct: '2.0',
    other_defects_pct: '3.0',
    corrected_at: null,
  },
  classification: {
    classified_by: 'Evaluador de prueba',
    dry_weight_kg: '45.0',
    g1_kg: '32.5',
    g2_kg: '8.0',
    discard_kg: '4.5',
    g1_pct: '72.2',
    g2_pct: '17.8',
    discard_pct: '10.0',
    discard_reason: 'mold',
    discard_detail: '',
  },
  discard: {
    discarded_by: 'Evaluador de prueba',
    quantity_kg: '45.0',
    reason: 'mold',
    detail: '',
  },
  stock_entry: {
    entered_by: 'Bodeguero de prueba',
    warehouse: 'Bodega principal',
    location: 'Estante 1',
    g1_kg: '32.5',
    g2_kg: '8.0',
    corrected_at: null,
  },
  stock_move: {
    moved_by: 'Bodeguero de prueba',
    from_warehouse: 'Bodega principal',
    from_location: 'Estante 1',
    to_warehouse: 'Bodega principal',
    to_location: 'Estante 3',
  },
  stock_exit: {
    created_by: 'Bodeguero de prueba',
    grade: 'g2',
    quantity_kg: '0.5',
    reason: 'sample',
    detail: '',
    voided_at: null,
    voided_by: null,
    void_reason: null,
  },
  sale: {
    sale_id: 's1',
    number: 'V-0012',
    buyer: 'Comprador de prueba S.A.S.',
    lines: [{ grade: 'g1', quantity_kg: '20.0' }],
    voided_at: null,
    void_reason: null,
  },
};

const HISTORY_WHEN: { [K in HistoryKind]: HistoryWhen } = {
  harvest: { occurred_on: '2026-03-14', occurred_at: null },
  lot_created: {
    occurred_on: '2026-03-14',
    occurred_at: '2026-03-14T15:20:00-05:00',
  },
  fermentation: {
    occurred_on: '2026-03-15',
    occurred_at: '2026-03-15T07:00:00-05:00',
  },
  drying: {
    occurred_on: '2026-03-21',
    occurred_at: '2026-03-21T09:00:00-05:00',
  },
  evaluation: {
    occurred_on: '2026-04-01',
    occurred_at: '2026-04-01T09:00:00-05:00',
  },
  classification: {
    occurred_on: '2026-04-02',
    occurred_at: '2026-04-02T10:00:00-05:00',
  },
  discard: {
    occurred_on: '2026-04-02',
    occurred_at: '2026-04-02T10:00:00-05:00',
  },
  stock_entry: { occurred_on: '2026-04-03', occurred_at: null },
  stock_move: {
    occurred_on: '2026-04-05',
    occurred_at: '2026-04-05T11:00:00-05:00',
  },
  stock_exit: { occurred_on: '2026-04-10', occurred_at: null },
  sale: { occurred_on: '2026-04-20', occurred_at: null },
};

// Una etapa de la historia con sus datos de prueba y lo que cada prueba cambie de ellos.
export function buildHistoryStage<K extends HistoryKind>(
  kind: K,
  data: Partial<HistoryData<K>> = {},
  when: Partial<HistoryWhen> = {},
): HistoryEntry<K> {
  return {
    kind,
    ...HISTORY_WHEN[kind],
    ...when,
    [kind]: { ...(HISTORY_DATA[kind] as object), ...data },
  } as unknown as HistoryEntry<K>;
}

// La historia de un lote vendido, con todas sus etapas en el orden en que las entrega el servidor.
export const buildLotHistory = (
  overrides: Partial<Schemas['LotHistory']> = {},
): Schemas['LotHistory'] => ({
  lot: {
    id: 'l1',
    code: '000123-F02-P05-260314-1',
    status: 'in_warehouse',
    created_at: '2026-03-14T15:20:00-05:00',
  },
  origin: {
    producer: {
      id: 'p1',
      member_code: '000123',
      full_name: 'Productor de prueba',
    },
    farm: {
      id: 'f1',
      code: 'F02',
      name: 'La Esperanza',
      municipality: 'Arboledas',
    },
    plot: { id: 'pl1', code: 'P05', name: 'Lote del río' },
    harvest: { id: 'h1', harvest_date: '2026-03-14' },
  },
  stages: [
    buildHistoryStage('harvest'),
    buildHistoryStage('lot_created'),
    buildHistoryStage('fermentation'),
    buildHistoryStage('drying'),
    buildHistoryStage('evaluation'),
    buildHistoryStage('classification'),
    buildHistoryStage('stock_entry'),
    buildHistoryStage('stock_move'),
    buildHistoryStage('stock_exit'),
    buildHistoryStage('sale'),
  ],
  current: {
    status: 'in_warehouse',
    g1_available_kg: '12.5',
    g2_available_kg: '7.5',
    sold_kg: '20.0',
  },
  ...overrides,
});

import { describe, expect, it } from 'vitest';

import { FUTURE_DATE_MESSAGE } from '@/lib/activity-dates';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { buildStockRow } from '@/test/factories';

import {
  createSaleFormSchema,
  emptySaleForm,
  NO_LINES_MESSAGE,
  type SaleFormInput,
  STOCK_GONE_MESSAGE,
  toCreateRequest,
  TOO_MANY_LINES_MESSAGE,
} from './sale-schema';
import { stockKey, stockOptions } from './sale-line-options';
import { PRICE_NOT_WHOLE_MESSAGE } from './sale-price';

const today = '2026-11-20';
const LOT = { id: 'l1', code: '000123-F02-P05-261014-1' };
const options = stockOptions([
  buildStockRow({ lot: LOT, grade: 'g1', quantity_kg: '245.0' }),
  buildStockRow({ lot: LOT, grade: 'g2', quantity_kg: '55.2' }),
]);
const G1 = stockKey('l1', 'g1');
const G2 = stockKey('l1', 'g2');

const schema = createSaleFormSchema({ today, options });

const valid = (overrides: Partial<SaleFormInput> = {}): SaleFormInput => ({
  farm_id: 'f1',
  buyer_id: 'b1',
  sale_date: today,
  notes: '',
  lines: [
    { stock: G1, quantity_kg: '150,0', price_per_kg: '18.500' },
    { stock: G2, quantity_kg: '40', price_per_kg: '15000' },
  ],
  ...overrides,
});

// Los mensajes de cada campo, por su ruta («lines.0.quantity_kg»).
function issuesOf(values: SaleFormInput) {
  const result = schema.safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map(({ path, message }) => [path.join('.'), message]),
  );
}

describe('createSaleFormSchema', () => {
  it('accepts a sale with its buyer, date and lines', () => {
    expect(issuesOf(valid())).toEqual({});
  });

  it('marks what is missing', () => {
    expect(
      issuesOf(
        valid({
          farm_id: '',
          buyer_id: '',
          sale_date: '',
          lines: [{ stock: '', quantity_kg: '', price_per_kg: '' }],
        }),
      ),
    ).toEqual({
      farm_id: REQUIRED_FIELD_MESSAGE,
      buyer_id: REQUIRED_FIELD_MESSAGE,
      sale_date: REQUIRED_FIELD_MESSAGE,
      'lines.0.stock': REQUIRED_FIELD_MESSAGE,
      'lines.0.quantity_kg': REQUIRED_FIELD_MESSAGE,
      'lines.0.price_per_kg': REQUIRED_FIELD_MESSAGE,
    });
  });

  it('asks for at least one lot and no more than twenty', () => {
    expect(issuesOf(valid({ lines: [] }))).toEqual({ lines: NO_LINES_MESSAGE });
    const line = { stock: G1, quantity_kg: '1', price_per_kg: '1' };
    expect(issuesOf(valid({ lines: Array(21).fill(line) })).lines).toBe(
      TOO_MANY_LINES_MESSAGE,
    );
  });

  it('checks the kilos against what that lot and grade has', () => {
    expect(
      issuesOf(
        valid({
          lines: [{ stock: G2, quantity_kg: '55,3', price_per_kg: '15000' }],
        }),
      ),
    ).toEqual({
      'lines.0.quantity_kg': 'La cantidad supera lo disponible (55,2 kg)',
    });
  });

  it('checks the price of each line', () => {
    expect(
      issuesOf(
        valid({
          lines: [{ stock: G1, quantity_kg: '1', price_per_kg: '18500,5' }],
        }),
      ),
    ).toEqual({ 'lines.0.price_per_kg': PRICE_NOT_WHOLE_MESSAGE });
  });

  it('says when the chosen stock is no longer there', () => {
    expect(
      issuesOf(
        valid({
          lines: [{ stock: 'gone:g1', quantity_kg: '1', price_per_kg: '1' }],
        }),
      ),
    ).toEqual({ 'lines.0.stock': STOCK_GONE_MESSAGE });
  });

  it('checks the date against today and the entry of its lots', () => {
    expect(issuesOf(valid({ sale_date: '2026-11-21' }))).toEqual({
      sale_date: FUTURE_DATE_MESSAGE,
    });
    expect(issuesOf(valid({ sale_date: '2026-10-29' }))).toEqual({
      sale_date: `La fecha no puede ser anterior al ingreso del lote ${LOT.code}`,
    });
  });

  it('limits the notes to 300 characters', () => {
    expect(issuesOf(valid({ notes: 'a'.repeat(301) }))).toEqual({
      notes: 'Máximo 300 caracteres.',
    });
  });
});

describe('emptySaleForm', () => {
  it('starts today, on the given farm, with one empty line', () => {
    expect(emptySaleForm({ today, farmId: 'f1' })).toEqual({
      farm_id: 'f1',
      buyer_id: '',
      sale_date: today,
      notes: '',
      lines: [{ stock: '', quantity_kg: '', price_per_kg: '' }],
    });
  });
});

describe('toCreateRequest', () => {
  it('sends the lot and grade apart, kilos with a point and whole pesos', () => {
    expect(toCreateRequest(valid({ notes: '  Despacho  ' }), options)).toEqual({
      farm_id: 'f1',
      buyer_id: 'b1',
      sale_date: today,
      notes: 'Despacho',
      lines: [
        {
          lot_id: 'l1',
          grade: 'g1',
          quantity_kg: '150.0',
          price_per_kg: 18500,
        },
        { lot_id: 'l1', grade: 'g2', quantity_kg: '40', price_per_kg: 15000 },
      ],
    });
  });
});

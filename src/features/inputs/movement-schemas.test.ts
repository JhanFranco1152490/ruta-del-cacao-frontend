import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  amountInUnit,
  buildMovementRequest,
  createCountSchema,
  createEntrySchema,
  type MovementFormInput,
} from './movement-schemas';
import { REQUIRED_FIELD_MESSAGE } from './schemas';

const tub = { package_size: '100.000' };

const values = (
  overrides: Partial<MovementFormInput> = {},
): MovementFormInput => ({
  occurred_on: '2026-10-08',
  amount: '3',
  amount_in: 'packages',
  note: '',
  ...overrides,
});

const errorsOf = (
  schema:
    ReturnType<typeof createEntrySchema> | ReturnType<typeof createCountSchema>,
  input: MovementFormInput,
) => {
  const result = schema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
};

beforeEach(() => {
  vi.useFakeTimers();
  // 10:00 p. m. del 8 de octubre en Bogotá: en UTC ya es el 9.
  vi.setSystemTime(new Date('2026-10-09T03:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('amountInUnit', () => {
  it('turns packages into the unit', () => {
    expect(amountInUnit('3', 'packages', tub)).toBe('300');
    expect(amountInUnit('2,5', 'packages', tub)).toBe('250');
  });

  it('keeps an amount already in the unit, with a point', () => {
    expect(amountInUnit('300', 'unit', tub)).toBe('300');
    expect(amountInUnit('12,5', 'unit', null)).toBe('12.5');
  });

  it('uses the unit when the input has no package', () => {
    expect(amountInUnit('3', 'packages', null)).toBe('3');
  });

  it('gives nothing for an amount that is not a number', () => {
    expect(amountInUnit('', 'unit', tub)).toBeNull();
    expect(amountInUnit('tres', 'packages', tub)).toBeNull();
  });
});

describe('entry schema', () => {
  const entry = createEntrySchema(tub);

  it('sends the quantity in the unit, the date and the trimmed note', () => {
    expect(entry.parse(values({ note: '  Compra de octubre ' }))).toEqual({
      occurred_on: '2026-10-08',
      quantity: '300',
      note: 'Compra de octubre',
    });
  });

  it('marks the missing date and amount', () => {
    expect(errorsOf(entry, values({ occurred_on: '', amount: '' }))).toEqual({
      occurred_on: REQUIRED_FIELD_MESSAGE,
      amount: REQUIRED_FIELD_MESSAGE,
    });
  });

  it('takes today in Bogotá but not a future date', () => {
    expect(errorsOf(entry, values({ occurred_on: '2026-10-08' }))).toEqual({});
    expect(errorsOf(entry, values({ occurred_on: '2026-10-09' }))).toEqual({
      occurred_on: 'La fecha no puede ser posterior a hoy.',
    });
  });

  it('needs an amount above zero', () => {
    expect(errorsOf(entry, values({ amount: '0' })).amount).toBe(
      'La cantidad debe ser mayor que cero.',
    );
    expect(errorsOf(entry, values({ amount: '-3' })).amount).toBe(
      'La cantidad debe ser mayor que cero.',
    );
    expect(errorsOf(entry, values({ amount: 'tres' })).amount).toBe(
      'Escribe una cantidad válida.',
    );
  });

  it('takes at most three decimals', () => {
    expect(
      errorsOf(entry, values({ amount: '1.2345', amount_in: 'unit' })).amount,
    ).toBe('Usa máximo 3 decimales.');
  });

  it('rejects an amount the server cannot keep', () => {
    expect(
      errorsOf(entry, values({ amount: '10000000', amount_in: 'unit' })).amount,
    ).toBe('La cantidad es demasiado grande.');
    expect(
      errorsOf(entry, values({ amount: '100000', amount_in: 'packages' }))
        .amount,
    ).toBe('La cantidad es demasiado grande.');
  });

  it('keeps the note under 200 characters', () => {
    expect(errorsOf(entry, values({ note: 'n'.repeat(201) })).note).toBe(
      'Usa máximo 200 caracteres.',
    );
  });
});

describe('count schema', () => {
  const count = createCountSchema(tub);

  it('sends what was counted, in the unit', () => {
    expect(count.parse(values({ amount: '2,3' }))).toEqual({
      occurred_on: '2026-10-08',
      counted_quantity: '230',
      note: '',
    });
  });

  it('accepts zero, but not below zero', () => {
    expect(count.parse(values({ amount: '0' })).counted_quantity).toBe('0');
    expect(errorsOf(count, values({ amount: '-1' })).amount).toBe(
      'La cantidad no puede ser negativa.',
    );
  });
});

describe('buildMovementRequest', () => {
  const context = { id: 'm-1', inputId: 'i-1', farmId: 'f-1' };

  it('builds an entry', () => {
    expect(
      buildMovementRequest(context, 'entry', {
        occurred_on: '2026-10-08',
        quantity: '300',
        note: '',
      }),
    ).toEqual({
      id: 'm-1',
      input_id: 'i-1',
      farm_id: 'f-1',
      kind: 'entry',
      occurred_on: '2026-10-08',
      quantity: '300',
      note: '',
    });
  });

  it('builds a count', () => {
    expect(
      buildMovementRequest(context, 'count', {
        occurred_on: '2026-10-08',
        counted_quantity: '230',
        note: 'Se derramó medio pote',
      }),
    ).toMatchObject({ kind: 'count', counted_quantity: '230' });
  });
});

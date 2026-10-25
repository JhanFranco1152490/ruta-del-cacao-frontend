import { describe, expect, it } from 'vitest';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { buildFermentation } from '@/test/factories';

import {
  capacityWarning,
  createStartFormSchema,
  facilityOptionLabel,
  responsibleOptions,
  startChanges,
  startFormOf,
  type StartFormInput,
  toStartRequest,
} from './start-form';

const NOW = new Date('2026-10-17T09:00:00-05:00');
const EARLIEST = '2026-10-14T00:00:00-05:00';
const schema = createStartFormSchema({
  earliestStartAt: EARLIEST,
  now: () => NOW,
});

const VALID: StartFormInput = {
  facility_id: 'fc1',
  started_at: '2026-10-15T07:00',
  responsible_id: 'u1',
};

function errorsOf(input: Partial<StartFormInput>) {
  const result = schema.safeParse({ ...VALID, ...input });
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map(({ path, message }) => [path[0], message]),
  );
}

const options = {
  facilities: [
    { id: 'fc1', name: 'C-01', capacity_kg: '600.0' },
    { id: 'fc2', name: 'C-02', capacity_kg: '900.0' },
  ],
  responsibles: [
    { id: 'u1', full_name: 'Luis', is_active: true, assignable: true },
    { id: 'u2', full_name: 'Ana', is_active: true, assignable: true },
  ],
  green_weight_kg: '820.0',
  earliest_start_at: EARLIEST,
};

describe('start form', () => {
  it('accepts a complete start', () => {
    expect(errorsOf({})).toEqual({});
    expect(errorsOf({ started_at: '2026-10-14T00:00' })).toEqual({});
  });

  it('marks each missing field', () => {
    expect(
      errorsOf({ facility_id: '', started_at: '', responsible_id: '' }),
    ).toEqual({
      facility_id: REQUIRED_FIELD_MESSAGE,
      started_at: REQUIRED_FIELD_MESSAGE,
      responsible_id: REQUIRED_FIELD_MESSAGE,
    });
  });

  it('rejects a start in the future', () => {
    expect(errorsOf({ started_at: '2026-10-17T09:01' })).toEqual({
      started_at: 'No puede ser una fecha futura.',
    });
  });

  it('rejects a start before the day of the harvest', () => {
    expect(errorsOf({ started_at: '2026-10-13T23:59' })).toEqual({
      started_at: 'No puede ser anterior a la cosecha (14 oct.).',
    });
  });
});

describe('startFormOf', () => {
  it('starts now, with the only box and the account that registers when it can respond', () => {
    expect(
      startFormOf({
        options: { ...options, facilities: [options.facilities[0]] },
        userId: 'u2',
        now: NOW,
      }),
    ).toEqual({
      facility_id: 'fc1',
      started_at: '2026-10-17T09:00',
      responsible_id: 'u2',
    });
  });

  it('leaves the box and the responsible to choose when there is more than one', () => {
    expect(startFormOf({ options, userId: 'u9', now: NOW })).toMatchObject({
      facility_id: '',
      responsible_id: '',
    });
  });

  it('opens the correction with what the fermentation has', () => {
    expect(
      startFormOf({
        options,
        userId: 'u9',
        now: NOW,
        fermentation: buildFermentation(),
      }),
    ).toEqual({
      facility_id: 'fc1',
      started_at: '2026-10-15T07:00',
      responsible_id: 'u1',
    });
  });
});

describe('facilityOptionLabel', () => {
  it('says the capacity, and when the lot does not fit', () => {
    expect(facilityOptionLabel(options.facilities[0], '500.0')).toBe(
      'C-01 · 600 kg en baba',
    );
    expect(facilityOptionLabel(options.facilities[0], '820.0')).toBe(
      'C-01 · 600 kg en baba · No alcanza para este lote',
    );
  });
});

describe('capacityWarning', () => {
  it('compares the lot with the box before starting', () => {
    expect(capacityWarning('820.0', options.facilities[0])).toBe(
      'El lote (820 kg) supera la capacidad de C-01 (600 kg). ¿Iniciar de todos modos?',
    );
  });
});

describe('toStartRequest', () => {
  it('sends the time with the offset of Bogota and the confirmation', () => {
    const request = toStartRequest(VALID, 'l1', true);

    expect(request).toEqual({
      lot_id: 'l1',
      facility_id: 'fc1',
      started_at: expect.stringMatching(/^2026-10-15T07:00:00/),
      responsible_id: 'u1',
      confirm_over_capacity: true,
    });
    expect(new Date(request.started_at).toISOString()).toBe(
      '2026-10-15T12:00:00.000Z',
    );
  });
});

describe('startChanges', () => {
  const fermentation = buildFermentation();

  it('finds nothing to send when nothing changed', () => {
    expect(startChanges(VALID, fermentation)).toEqual({});
  });

  it('keeps only what changed', () => {
    expect(
      startChanges(
        { ...VALID, facility_id: 'fc2', started_at: '2026-10-15T08:00' },
        fermentation,
      ),
    ).toEqual({
      facility_id: 'fc2',
      started_at: expect.stringMatching(/^2026-10-15T08:00:00/),
    });
  });
});

describe('responsibleOptions', () => {
  it('offers only who can respond', () => {
    expect(
      responsibleOptions(
        {
          ...options,
          responsibles: [
            ...options.responsibles,
            {
              id: 'u3',
              full_name: 'Sin permiso',
              is_active: true,
              assignable: false,
            },
          ],
        },
        undefined,
      ),
    ).toEqual([
      { id: 'u1', label: 'Luis' },
      { id: 'u2', label: 'Ana' },
    ]);
  });

  it('keeps the current responsible when correcting, marked if the account is inactive', () => {
    const fermentation = buildFermentation({
      responsible: { id: 'u7', full_name: 'Marta', is_active: false },
    });

    expect(responsibleOptions(options, fermentation).at(-1)).toEqual({
      id: 'u7',
      label: 'Marta (Cuenta inactiva)',
    });
  });
});

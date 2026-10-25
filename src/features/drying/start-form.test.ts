import { describe, expect, it } from 'vitest';

import { buildDrying } from '@/test/factories';

import type { StartOptions } from './api';
import {
  createStartFormSchema,
  facilityOptionLabel,
  startChanges,
  startFormOf,
  type StartFormInput,
  toStartRequest,
} from './start-form';

const NOW = new Date('2026-10-24T15:00:00-05:00');
const schema = createStartFormSchema({
  earliestStartAt: '2026-10-22T09:00:00-05:00',
  now: () => NOW,
});
const valid: StartFormInput = {
  facility_id: 'm1',
  started_at: '2026-10-24T14:00',
  entry_moisture_pct: '57,5',
  responsible_id: 'u1',
};
const errorsOf = (input: Partial<StartFormInput>) => {
  const result = schema.safeParse({ ...valid, ...input });
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
};

const options: StartOptions = {
  facilities: [{ id: 'm1', name: 'M-01', capacity_kg: '600.0' }],
  responsibles: [
    {
      id: 'u1',
      full_name: 'Quien registra',
      is_active: true,
      assignable: true,
    },
    { id: 'u2', full_name: 'Otra cuenta', is_active: true, assignable: false },
  ],
  entry_moisture_range: { min: '55.0', max: '60.0' },
  earliest_start_at: '2026-10-22T09:00:00-05:00',
};

describe('createStartFormSchema', () => {
  it('accepts a complete start', () => {
    expect(errorsOf({})).toEqual({});
  });

  it('asks for what is missing', () => {
    expect(
      errorsOf({ facility_id: '', entry_moisture_pct: '', responsible_id: '' }),
    ).toEqual({
      facility_id: 'Campo obligatorio',
      entry_moisture_pct: 'Campo obligatorio',
      responsible_id: 'Campo obligatorio',
    });
  });

  it('keeps the start after the end of the fermentation and not in the future', () => {
    expect(errorsOf({ started_at: '2026-10-22T08:00' }).started_at).toBe(
      'No puede ser anterior al fin de la fermentación (22 oct. 09:00).',
    );
    expect(errorsOf({ started_at: '2026-10-24T16:00' }).started_at).toBe(
      'No puede ser una fecha futura.',
    );
  });

  it('keeps the entry moisture between 0 and 100 with one decimal', () => {
    expect(errorsOf({ entry_moisture_pct: '101' }).entry_moisture_pct).toBe(
      'Debe estar entre 0 % y 100 %.',
    );
    expect(errorsOf({ entry_moisture_pct: '57.55' }).entry_moisture_pct).toBe(
      'Usa máximo 1 decimal.',
    );
  });
});

describe('startFormOf', () => {
  it('opens with now, the only dryer and the one who registers', () => {
    expect(startFormOf({ options, userId: 'u1', now: NOW })).toEqual({
      facility_id: 'm1',
      started_at: '2026-10-24T15:00',
      entry_moisture_pct: '',
      responsible_id: 'u1',
    });
  });

  it('does not choose a responsible who cannot be named', () => {
    expect(
      startFormOf({ options, userId: 'u2', now: NOW }).responsible_id,
    ).toBe('');
  });

  it('does not choose a dryer when there are several', () => {
    const several = {
      ...options,
      facilities: [
        ...options.facilities,
        { id: 'm2', name: 'M-02', capacity_kg: '500.0' },
      ],
    };

    expect(
      startFormOf({ options: several, userId: 'u1', now: NOW }).facility_id,
    ).toBe('');
  });

  it('opens with what the drying has when correcting', () => {
    expect(
      startFormOf({ options, userId: 'u1', now: NOW, drying: buildDrying() }),
    ).toEqual({
      facility_id: 'fc1',
      started_at: '2026-10-22T14:00',
      entry_moisture_pct: '57,0',
      responsible_id: 'u1',
    });
  });
});

describe('start requests', () => {
  it('names the dryer with its capacity', () => {
    expect(facilityOptionLabel(options.facilities[0])).toBe(
      'M-01 · 600 kg en baba',
    );
  });

  it('sends the start with the confirmation of the moisture', () => {
    expect(toStartRequest(schema.parse(valid), 'l1', true)).toEqual({
      lot_id: 'l1',
      facility_id: 'm1',
      started_at: '2026-10-24T14:00:00-05:00',
      entry_moisture_pct: '57.5',
      responsible_id: 'u1',
      confirm_entry_moisture: true,
    });
  });

  it('sends only what changed when correcting', () => {
    const drying = buildDrying();
    const same: StartFormInput = {
      facility_id: 'fc1',
      started_at: '2026-10-22T14:00',
      entry_moisture_pct: '57.0',
      responsible_id: 'u1',
    };

    expect(startChanges(same, drying)).toEqual({});
    expect(
      startChanges(
        { ...same, entry_moisture_pct: '58.5', facility_id: 'fc2' },
        drying,
      ),
    ).toEqual({ entry_moisture_pct: '58.5', facility_id: 'fc2' });
  });
});

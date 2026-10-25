import { describe, expect, it } from 'vitest';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import {
  BEFORE_START_MESSAGE,
  createTurnFormSchema,
  PH_MESSAGE,
  TEMPERATURE_MESSAGE,
  toTurnCreateRequest,
  type TurnFormInput,
} from './turn-form';
import { FUTURE_MOMENT_MESSAGE } from '@/lib/validation/moment';

const STARTED = '2026-10-15T07:00:00-05:00';
const NOW = new Date('2026-10-17T08:05:30-05:00');

const schema = createTurnFormSchema({ startedAt: STARTED, now: () => NOW });

const VALID: TurnFormInput = {
  turned_at: '2026-10-17T07:30',
  temperature_c: '45',
  ph: '4.9',
  notes: '',
};

function errorsOf(input: Partial<TurnFormInput>) {
  const result = schema.safeParse({ ...VALID, ...input });
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map(({ path, message }) => [path[0], message]),
  );
}

describe('turn form', () => {
  it('accepts a complete turn and writes the decimals with a point', () => {
    const result = schema.parse({
      ...VALID,
      temperature_c: '45,5',
      ph: '4,85',
      notes: '  Masa caliente  ',
    });

    expect(result).toEqual({
      turned_at: '2026-10-17T07:30',
      temperature_c: '45.5',
      ph: '4.85',
      notes: 'Masa caliente',
    });
  });

  it('marks each missing field', () => {
    expect(errorsOf({ turned_at: '', temperature_c: '', ph: '' })).toEqual({
      turned_at: REQUIRED_FIELD_MESSAGE,
      temperature_c: REQUIRED_FIELD_MESSAGE,
      ph: REQUIRED_FIELD_MESSAGE,
    });
  });

  describe('time', () => {
    it('asks for a whole date and time', () => {
      expect(errorsOf({ turned_at: '2026-10-17' })).toEqual({
        turned_at: REQUIRED_FIELD_MESSAGE,
      });
    });

    it('accepts the minute of the start and the current minute', () => {
      expect(errorsOf({ turned_at: '2026-10-15T07:00' })).toEqual({});
      expect(errorsOf({ turned_at: '2026-10-17T08:05' })).toEqual({});
    });

    it('rejects a turn before the start', () => {
      expect(errorsOf({ turned_at: '2026-10-15T06:59' })).toEqual({
        turned_at: BEFORE_START_MESSAGE,
      });
    });

    it('rejects a turn in the future', () => {
      expect(errorsOf({ turned_at: '2026-10-17T08:06' })).toEqual({
        turned_at: FUTURE_MOMENT_MESSAGE,
      });
    });
  });

  describe('temperature', () => {
    it.each(['0.1', '80', '45,5'])('accepts %s °C', (value) => {
      expect(errorsOf({ temperature_c: value })).toEqual({});
    });

    it.each(['0', '-3', '80.1', '81', '450', 'cuarenta'])(
      'rejects %s °C with the valid range',
      (value) => {
        expect(errorsOf({ temperature_c: value })).toEqual({
          temperature_c: TEMPERATURE_MESSAGE,
        });
      },
    );

    it('keeps one decimal at most', () => {
      expect(errorsOf({ temperature_c: '45.25' })).toEqual({
        temperature_c: 'Usa máximo 1 decimal.',
      });
    });
  });

  describe('pH', () => {
    it.each(['0', '14', '4,85'])('accepts a pH of %s', (value) => {
      expect(errorsOf({ ph: value })).toEqual({});
    });

    it.each(['-1', '14.01', '14.5', '49'])(
      'rejects a pH of %s with the valid range',
      (value) => {
        expect(errorsOf({ ph: value })).toEqual({ ph: PH_MESSAGE });
      },
    );

    it('keeps two decimals at most', () => {
      expect(errorsOf({ ph: '4.855' })).toEqual({
        ph: 'Usa máximo 2 decimales.',
      });
    });
  });

  it('keeps the notes to 500 characters', () => {
    expect(errorsOf({ notes: 'a'.repeat(500) })).toEqual({});
    expect(errorsOf({ notes: 'a'.repeat(501) })).toEqual({
      notes: 'Máximo 500 caracteres.',
    });
  });
});

describe('toTurnCreateRequest', () => {
  it('sends the time with the offset of Bogota, the id and when it was captured', () => {
    const request = toTurnCreateRequest(
      {
        turned_at: '2026-10-17T07:30',
        temperature_c: '45.0',
        ph: '4.90',
        notes: '',
      },
      { id: 'ft1', capturedAt: '2026-10-17T13:05:30.000Z' },
    );

    expect(request).toEqual({
      id: 'ft1',
      turned_at: expect.stringMatching(/^2026-10-17T07:30:00/),
      temperature_c: '45.0',
      ph: '4.90',
      notes: '',
      captured_at: '2026-10-17T13:05:30.000Z',
    });
    expect(new Date(request.turned_at).toISOString()).toBe(
      '2026-10-17T12:30:00.000Z',
    );
  });
});

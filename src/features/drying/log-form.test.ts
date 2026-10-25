import { describe, expect, it } from 'vitest';

import {
  createLogFormSchema,
  type LogFormInput,
  toLogCreateRequest,
  turnFrequencyVisible,
} from './log-form';

const STARTED = '2026-10-22T14:00:00-05:00';
const NOW = new Date('2026-10-25T09:00:00-05:00');
const schema = createLogFormSchema({ startedAt: STARTED, now: () => NOW });

const valid: LogFormInput = {
  measured_at: '2026-10-24T16:00',
  moisture_pct: '12,4',
  sun_hours: '6',
  shade_hours: '',
  turn_count: '2',
  turn_frequency_hours: '3',
  weather: 'sunny',
  notes: '',
};

const errorsOf = (input: Partial<LogFormInput>) => {
  const result = schema.safeParse({ ...valid, ...input });
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
};

describe('createLogFormSchema', () => {
  it('accepts a complete log and writes the decimals with a point', () => {
    const result = schema.safeParse(valid);

    expect(result.success).toBe(true);
    expect(result.data?.moisture_pct).toBe('12.4');
  });

  it('asks for what is missing', () => {
    expect(errorsOf({ moisture_pct: '', sun_hours: '', weather: '' })).toEqual({
      moisture_pct: 'Campo obligatorio',
      sun_hours: 'Campo obligatorio',
      weather: 'Campo obligatorio',
    });
  });

  it('keeps the moisture between 0 and 100 with one decimal', () => {
    expect(errorsOf({ moisture_pct: '101' }).moisture_pct).toBe(
      'Debe estar entre 0 % y 100 %.',
    );
    expect(errorsOf({ moisture_pct: '-1' }).moisture_pct).toBe(
      'Debe estar entre 0 % y 100 %.',
    );
    expect(errorsOf({ moisture_pct: '12.45' }).moisture_pct).toBe(
      'Usa máximo 1 decimal.',
    );
    expect(errorsOf({ moisture_pct: '100' })).toEqual({});
  });

  it('accepts zero sun hours, a day of rain, and keeps hours within a day', () => {
    expect(errorsOf({ sun_hours: '0' })).toEqual({});
    expect(errorsOf({ sun_hours: '25' }).sun_hours).toBe(
      'Debe estar entre 0 y 24 horas.',
    );
    expect(errorsOf({ shade_hours: '24.5' }).shade_hours).toBe(
      'Debe estar entre 0 y 24 horas.',
    );
  });

  it('wants a whole, non-negative number of turns up to 48', () => {
    expect(errorsOf({ turn_count: '-1' }).turn_count).toBe(
      'No puede ser negativo.',
    );
    expect(errorsOf({ turn_count: '2,5' }).turn_count).toBe(
      'Debe ser un número entero.',
    );
    expect(errorsOf({ turn_count: '49' }).turn_count).toBe(
      'Revisa la cifra: no más de 48 volteos al día.',
    );
  });

  it('asks how often when there were turns, and not when there were none', () => {
    expect(errorsOf({ turn_frequency_hours: '' }).turn_frequency_hours).toBe(
      'Indica cada cuántas horas se volteó.',
    );
    expect(errorsOf({ turn_count: '0', turn_frequency_hours: '' })).toEqual({});
    expect(errorsOf({ turn_frequency_hours: '0.4' }).turn_frequency_hours).toBe(
      'Debe estar entre 0,5 y 24 horas.',
    );
  });

  it('keeps the measurement between the start and now', () => {
    expect(errorsOf({ measured_at: '2026-10-22T13:00' }).measured_at).toBe(
      'No puede ser anterior al inicio del secado.',
    );
    expect(errorsOf({ measured_at: '2026-10-25T10:00' }).measured_at).toBe(
      'No puede ser una fecha futura.',
    );
    expect(errorsOf({ measured_at: '' }).measured_at).toBe('Campo obligatorio');
  });

  it('does not let the day exceed the hours the drying had, saying when it started', () => {
    // Iniciado a las 14:00: ese día tuvo 10 horas.
    expect(
      errorsOf({ measured_at: '2026-10-22T20:00', sun_hours: '12' }).sun_hours,
    ).toBe('Ese día el secado tuvo 10 horas (empezó a las 14:00).');
    expect(
      errorsOf({
        measured_at: '2026-10-22T20:00',
        sun_hours: '6',
        shade_hours: '4',
      }),
    ).toEqual({});
  });

  it('adds the shade hours to the sun hours, and counts today only up to now', () => {
    expect(
      errorsOf({
        measured_at: '2026-10-23T10:00',
        sun_hours: '20',
        shade_hours: '5',
      }).sun_hours,
    ).toBe('Ese día el secado tuvo 24 horas.');
    // Hoy son las 9 de la mañana.
    expect(
      errorsOf({
        measured_at: '2026-10-25T08:30',
        sun_hours: '10',
        turn_count: '0',
      }).sun_hours,
    ).toBe('Ese día el secado tuvo 9 horas.');
  });

  it('limits the notes', () => {
    expect(errorsOf({ notes: 'x'.repeat(501) }).notes).toBe(
      'Máximo 500 caracteres.',
    );
  });
});

describe('turnFrequencyVisible', () => {
  it('shows the frequency only with turns', () => {
    expect(turnFrequencyVisible('0')).toBe(false);
    expect(turnFrequencyVisible('')).toBe(false);
    expect(turnFrequencyVisible('2')).toBe(true);
  });
});

describe('toLogCreateRequest', () => {
  const parsed = schema.parse(valid);
  const meta = { id: 'dl9', capturedAt: '2026-10-24T21:05:00.000Z' };

  it('sends the measurement with its id and the time of the device', () => {
    expect(toLogCreateRequest(parsed, meta)).toEqual({
      id: 'dl9',
      measured_at: '2026-10-24T16:00:00-05:00',
      moisture_pct: '12.4',
      sun_hours: '6',
      shade_hours: null,
      turn_count: 2,
      turn_frequency_hours: '3',
      weather: 'sunny',
      notes: '',
      captured_at: '2026-10-24T21:05:00.000Z',
    });
  });

  it('does not send a frequency when there were no turns', () => {
    const request = toLogCreateRequest(
      { ...parsed, turn_count: '0', turn_frequency_hours: '3' },
      meta,
    );

    expect(request.turn_count).toBe(0);
    expect(request.turn_frequency_hours).toBeNull();
  });
});

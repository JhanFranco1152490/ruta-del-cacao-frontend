import { describe, expect, it } from 'vitest';

import {
  createFinishFormSchema,
  finishBlockedReason,
  finishedMessage,
  type FinishFormInput,
  toFinishRequest,
  yieldLine,
} from './finish-form';

const NOW = new Date('2026-10-27T10:00:00-05:00');
const schema = createFinishFormSchema({
  lastMeasuredAt: '2026-10-26T16:00:00-05:00',
  greenWeightKg: '240.0',
  now: () => NOW,
});
const valid: FinishFormInput = {
  ended_at: '2026-10-27T09:00',
  final_moisture_pct: '7,0',
  dry_weight_kg: '91,7',
};
const errorsOf = (input: Partial<FinishFormInput>) => {
  const result = schema.safeParse({ ...valid, ...input });
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
};

describe('createFinishFormSchema', () => {
  it('accepts a complete finish', () => {
    expect(errorsOf({})).toEqual({});
  });

  it('keeps the end after the last measurement and not in the future', () => {
    expect(errorsOf({ ended_at: '2026-10-26T15:00' }).ended_at).toBe(
      'No puede ser anterior a la última medición (26 oct. 16:00).',
    );
    expect(errorsOf({ ended_at: '2026-10-27T11:00' }).ended_at).toBe(
      'No puede ser una fecha futura.',
    );
  });

  it('allows ending at the same minute as the last measurement', () => {
    expect(errorsOf({ ended_at: '2026-10-26T16:00' })).toEqual({});
  });

  it('keeps the final moisture between 0 and 100', () => {
    expect(errorsOf({ final_moisture_pct: '120' }).final_moisture_pct).toBe(
      'Debe estar entre 0 % y 100 %.',
    );
  });

  it('wants a dry weight above zero and not above the green weight', () => {
    expect(errorsOf({ dry_weight_kg: '0' }).dry_weight_kg).toBe(
      'Debe ser mayor que cero.',
    );
    expect(errorsOf({ dry_weight_kg: '250' }).dry_weight_kg).toBe(
      'No puede ser mayor que el peso en verde (240 kg).',
    );
    expect(errorsOf({ dry_weight_kg: '91.75' }).dry_weight_kg).toBe(
      'Usa máximo 1 decimal.',
    );
    expect(errorsOf({ dry_weight_kg: '' }).dry_weight_kg).toBe(
      'Campo obligatorio',
    );
  });
});

describe('yieldLine', () => {
  it('shows the yield while the dry weight is written', () => {
    expect(yieldLine('91,7', '240.0')).toBe('Rendimiento: 38,2 %');
  });

  it('shows nothing without a valid weight', () => {
    expect(yieldLine('', '240.0')).toBeNull();
    expect(yieldLine('0', '240.0')).toBeNull();
    expect(yieldLine('300', '240.0')).toBeNull();
  });
});

describe('finishBlockedReason', () => {
  it('asks for a log first', () => {
    expect(
      finishBlockedReason({ logCount: 0, queuedCount: 0, online: true }),
    ).toBe('Registra al menos una bitácora para finalizar.');
  });

  it('waits for the logs still on the phone', () => {
    expect(
      finishBlockedReason({ logCount: 2, queuedCount: 1, online: true }),
    ).toBe('Hay bitácoras de este lote sin enviar. Espera a que se envíen.');
  });

  it('needs a connection, and is free otherwise', () => {
    expect(
      finishBlockedReason({ logCount: 2, queuedCount: 0, online: false }),
    ).toBe('Finalizar el secado necesita conexión.');
    expect(
      finishBlockedReason({ logCount: 2, queuedCount: 0, online: true }),
    ).toBeNull();
  });
});

describe('finishing', () => {
  it('sends the end, the final moisture and the dry weight with the version', () => {
    expect(toFinishRequest(schema.parse(valid), 3)).toEqual({
      expected_version: 3,
      ended_at: '2026-10-27T09:00:00-05:00',
      final_moisture_pct: '7.0',
      dry_weight_kg: '91.7',
    });
  });

  it('announces the yield', () => {
    expect(finishedMessage('38.2')).toBe('Rendimiento calculado: 38,2 %');
  });
});

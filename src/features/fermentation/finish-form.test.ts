import { describe, expect, it } from 'vitest';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import {
  createFinishFormSchema,
  finishBlockedReason,
  type FinishFormInput,
  finishedMessage,
  toFinishRequest,
} from './finish-form';

const STARTED = '2026-10-15T07:00:00-05:00';
const LAST_TURN = '2026-10-20T08:00:00-05:00';
const NOW = new Date('2026-10-20T10:00:00-05:00');

const schema = createFinishFormSchema({
  startedAt: STARTED,
  lastTurnedAt: LAST_TURN,
  now: () => NOW,
});

const VALID: FinishFormInput = { ended_at: '2026-10-20T09:00', notes: '' };

function errorsOf(input: Partial<FinishFormInput>) {
  const result = schema.safeParse({ ...VALID, ...input });
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map(({ path, message }) => [path[0], message]),
  );
}

describe('finish form', () => {
  it('accepts the minute of the last turn and the current minute', () => {
    expect(errorsOf({ ended_at: '2026-10-20T08:00' })).toEqual({});
    expect(errorsOf({ ended_at: '2026-10-20T10:00' })).toEqual({});
  });

  it('asks for the end', () => {
    expect(errorsOf({ ended_at: '' })).toEqual({
      ended_at: REQUIRED_FIELD_MESSAGE,
    });
  });

  it('rejects an end before the last turn, saying when it was', () => {
    expect(errorsOf({ ended_at: '2026-10-20T07:00' })).toEqual({
      ended_at: 'No puede ser anterior al último volteo (20 oct. 08:00).',
    });
  });

  it('rejects an end in the future', () => {
    expect(errorsOf({ ended_at: '2026-10-20T10:01' })).toEqual({
      ended_at: 'No puede ser una fecha futura.',
    });
  });

  it('keeps the notes to 500 characters', () => {
    expect(errorsOf({ notes: 'a'.repeat(501) })).toEqual({
      notes: 'Máximo 500 caracteres.',
    });
  });

  it('rejects an end at the very minute of the start', () => {
    const noTurns = createFinishFormSchema({
      startedAt: STARTED,
      lastTurnedAt: null,
      now: () => NOW,
    });

    expect(
      noTurns.safeParse({ ended_at: '2026-10-15T07:00', notes: '' }).success,
    ).toBe(false);
  });
});

describe('finishBlockedReason', () => {
  it('asks for a turn first', () => {
    expect(
      finishBlockedReason({ turnCount: 0, queuedCount: 0, online: true }),
    ).toBe('Registre al menos un volteo para finalizar');
  });

  it('waits for the turns still on the phone', () => {
    expect(
      finishBlockedReason({ turnCount: 2, queuedCount: 1, online: true }),
    ).toBe('Hay volteos de este lote sin enviar. Espera a que se envíen.');
  });

  it('needs a connection', () => {
    expect(
      finishBlockedReason({ turnCount: 2, queuedCount: 0, online: false }),
    ).toBe('Finalizar la fermentación necesita conexión.');
  });

  it('lets it finish otherwise', () => {
    expect(
      finishBlockedReason({ turnCount: 2, queuedCount: 0, online: true }),
    ).toBeNull();
  });
});

describe('toFinishRequest', () => {
  it('sends the end with the offset of Bogota and the version it read', () => {
    const request = toFinishRequest(
      { ended_at: '2026-10-20T09:00', notes: 'Ok' },
      7,
    );

    expect(request).toEqual({
      expected_version: 7,
      ended_at: expect.stringMatching(/^2026-10-20T09:00:00/),
      notes: 'Ok',
    });
  });
});

describe('finishedMessage', () => {
  it('says the duration of the fermentation', () => {
    expect(finishedMessage('122.0')).toBe(
      'Fermentación finalizada · 5 días y 2 h',
    );
  });
});

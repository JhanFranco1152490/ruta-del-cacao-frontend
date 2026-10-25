import { describe, expect, it } from 'vitest';

import { lastTurnedAt, numberTurns, turnNumberAt } from './turn-rules';

const turn = (id: string, turned_at: string) => ({ id, turned_at });

const T17 = turn('t17', '2026-10-17T08:00:00-05:00');
const T18 = turn('t18', '2026-10-18T08:00:00-05:00');
const T19 = turn('t19', '2026-10-19T08:00:00-05:00');

describe('numberTurns', () => {
  it('numbers each turn by its time, not by the order it arrived in', () => {
    const numbered = numberTurns([T19, T17, T18]);

    expect(numbered.map(({ turn: { id }, number }) => [id, number])).toEqual([
      ['t17', 1],
      ['t18', 2],
      ['t19', 3],
    ]);
  });

  // Los del servidor llegan con la zona de Bogotá; los de la cola, como los guardó el dispositivo.
  it('compares the moment, whatever offset each time was written with', () => {
    const queued = turn('q1', '2026-10-17T12:00:00Z');

    expect(numberTurns([T17, queued]).map(({ turn: { id } }) => id)).toEqual([
      'q1',
      't17',
    ]);
  });

  it('gives nothing to number when there are no turns', () => {
    expect(numberTurns([])).toEqual([]);
  });
});

describe('turnNumberAt', () => {
  it('is the first turn when there are none', () => {
    expect(turnNumberAt([], '2026-10-17T08:00:00-05:00')).toBe(1);
  });

  it('goes after the turns made before it', () => {
    expect(turnNumberAt([T17, T18], '2026-10-19T08:00:00-05:00')).toBe(3);
  });

  // Un volteo hecho sin conexión que se registra tarde queda en su lugar.
  it('goes between two turns when it was made between them', () => {
    expect(turnNumberAt([T17, T19], '2026-10-18T08:00:00-05:00')).toBe(2);
  });

  // El volteo del 18 corregido una hora más tarde sigue siendo el 2: no cuenta su propia hora vieja.
  it('leaves out the turn being corrected', () => {
    expect(
      turnNumberAt([T17, T18, T19], '2026-10-18T09:00:00-05:00', 't18'),
    ).toBe(2);
  });
});

describe('lastTurnedAt', () => {
  it('is the latest time, whatever the order of the list', () => {
    expect(lastTurnedAt([T18, T19, T17])).toBe(T19.turned_at);
  });

  it('is null without turns', () => {
    expect(lastTurnedAt([])).toBeNull();
  });
});

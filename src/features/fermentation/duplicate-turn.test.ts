import { describe, expect, it } from 'vitest';

import { duplicateTurnMessage, sameMinuteTurn } from './duplicate-turn';

const turns = [
  { id: 't1', turned_at: '2026-10-17T08:00:00-05:00' },
  { id: 't2', turned_at: '2026-10-18T08:00:00-05:00' },
];

describe('sameMinuteTurn', () => {
  it('finds a turn made in the same minute', () => {
    expect(sameMinuteTurn(turns, '2026-10-17T08:00:40-05:00')?.id).toBe('t1');
  });

  it('compares the moment, whatever offset each time was written with', () => {
    expect(sameMinuteTurn(turns, '2026-10-17T13:00:00Z')?.id).toBe('t1');
  });

  it('finds none in another minute', () => {
    expect(sameMinuteTurn(turns, '2026-10-17T08:01:00-05:00')).toBeUndefined();
  });

  // Al corregir un volteo sin cambiar su hora no choca consigo mismo.
  it('leaves out the turn being corrected', () => {
    expect(
      sameMinuteTurn(turns, '2026-10-17T08:00:00-05:00', 't1'),
    ).toBeUndefined();
  });
});

describe('duplicateTurnMessage', () => {
  it('says the hour of the turn already recorded', () => {
    expect(duplicateTurnMessage('2026-10-17T08:00:00-05:00')).toBe(
      'Ya hay un volteo registrado a las 08:00.',
    );
  });
});

import { describe, expect, it } from 'vitest';

import { buildFermentationTurn } from '@/test/factories';

import { formOfTurn, startTurnForm, turnChanges } from './turn-values';

describe('startTurnForm', () => {
  it('starts at the current minute in Bogota, with nothing measured', () => {
    expect(startTurnForm(new Date('2026-10-17T14:05:40Z'))).toEqual({
      turned_at: '2026-10-17T09:05',
      temperature_c: '',
      ph: '',
      notes: '',
    });
  });
});

describe('formOfTurn', () => {
  it('opens a turn with the time of Bogota and the decimal comma', () => {
    expect(
      formOfTurn({
        turned_at: '2026-10-17T12:30:00Z',
        temperature_c: '45.0',
        ph: '4.90',
        notes: 'Masa caliente',
      }),
    ).toEqual({
      turned_at: '2026-10-17T07:30',
      temperature_c: '45,0',
      ph: '4,90',
      notes: 'Masa caliente',
    });
  });
});

describe('turnChanges', () => {
  const turn = buildFermentationTurn({
    turned_at: '2026-10-17T07:30:00-05:00',
    temperature_c: '45.0',
    ph: '4.90',
    notes: '',
  });
  const same = {
    turned_at: '2026-10-17T07:30',
    temperature_c: '45',
    ph: '4.9',
    notes: '',
  };

  it('finds nothing when the values are the same, written another way', () => {
    expect(turnChanges(same, turn)).toEqual({});
  });

  it('keeps only what changed', () => {
    expect(
      turnChanges(
        { ...same, turned_at: '2026-10-17T07:45', ph: '4.85', notes: 'Ok' },
        turn,
      ),
    ).toEqual({
      turned_at: expect.stringMatching(/^2026-10-17T07:45:00/),
      ph: '4.85',
      notes: 'Ok',
    });
  });
});

import { describe, expect, it } from 'vitest';

import { chosenOption } from './chosen-option';

const OPTIONS = [
  { id: 'pl1', label: 'P01 · Lote del río' },
  { id: 'pl2', label: 'P02 · Lote alto' },
];

describe('chosenOption', () => {
  it('returns the chosen option among the offered ones', () => {
    expect(chosenOption('pl2', OPTIONS, 'Parcela elegida')).toEqual(OPTIONS[1]);
  });

  it('names a chosen option that is not offered', () => {
    expect(chosenOption('pl9', OPTIONS, 'Parcela elegida')).toEqual({
      id: 'pl9',
      label: 'Parcela elegida',
    });
  });

  it('returns none when nothing is chosen', () => {
    expect(chosenOption(null, OPTIONS, 'Parcela elegida')).toBeNull();
    expect(chosenOption(undefined, OPTIONS, 'Parcela elegida')).toBeNull();
    expect(chosenOption('', OPTIONS, 'Parcela elegida')).toBeNull();
  });
});

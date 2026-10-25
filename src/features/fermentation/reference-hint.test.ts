import { describe, expect, it } from 'vitest';

import { phHint, temperatureHint } from './reference-hint';

const TEMPERATURE = { min: '40.0', max: '50.0' };
const PH = { min: '4.00', max: '5.50' };

describe('temperatureHint', () => {
  it('gives the reference while nothing is typed', () => {
    expect(temperatureHint('', TEMPERATURE)).toBe('Referencia: 40,0–50,0 °C.');
  });

  it('keeps the reference for a reading inside it, with a comma or a point', () => {
    expect(temperatureHint('45,5', TEMPERATURE)).toBe(
      'Referencia: 40,0–50,0 °C.',
    );
    expect(temperatureHint('40.0', TEMPERATURE)).toBe(
      'Referencia: 40,0–50,0 °C.',
    );
  });

  it('says a reading outside the reference is outside, in both directions', () => {
    expect(temperatureHint('38,9', TEMPERATURE)).toBe(
      'Fuera de la referencia (40,0–50,0 °C).',
    );
    expect(temperatureHint('51', TEMPERATURE)).toBe(
      'Fuera de la referencia (40,0–50,0 °C).',
    );
  });

  it('ignores what is not a number yet', () => {
    expect(temperatureHint('4a', TEMPERATURE)).toBe(
      'Referencia: 40,0–50,0 °C.',
    );
  });
});

describe('phHint', () => {
  it('writes the pH with two decimals and no unit', () => {
    expect(phHint('', PH)).toBe('Referencia: 4,00–5,50.');
    expect(phHint('6', PH)).toBe('Fuera de la referencia (4,00–5,50).');
    expect(phHint('4,9', PH)).toBe('Referencia: 4,00–5,50.');
  });
});

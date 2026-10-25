import { describe, expect, it } from 'vitest';

import {
  entryMoistureWarning,
  isOutsideRange,
  outOfTargetLine,
  rangeText,
} from './moisture';

const entry = { min: '55.0', max: '60.0' };
const target = { min: '6.5', max: '7.5' };

describe('moisture ranges', () => {
  it('writes a range with the decimal comma and the percent sign', () => {
    expect(rangeText(entry)).toBe('55–60 %');
    expect(rangeText(target)).toBe('6,5–7,5 %');
  });

  it('is outside only beyond the edges, not on them', () => {
    expect(isOutsideRange('55', entry)).toBe(false);
    expect(isOutsideRange('60.0', entry)).toBe(false);
    expect(isOutsideRange('54.9', entry)).toBe(true);
    expect(isOutsideRange(60.1, entry)).toBe(true);
  });

  it('says what is out of range, and asks to confirm', () => {
    expect(entryMoistureWarning('48', entry)).toBe(
      'La humedad de entrada (48,0 %) está fuera del rango esperado (55–60 %). ¿Iniciar de todos modos?',
    );
    expect(outOfTargetLine(target)).toBe('Fuera de la meta (6,5–7,5 %).');
  });
});

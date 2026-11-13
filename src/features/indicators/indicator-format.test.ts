import { describe, expect, it } from 'vitest';

import {
  formatKg,
  formatKgPerHectare,
  formatShare,
  monthTick,
} from './indicator-format';

describe('indicator format', () => {
  it('lee los kilos con coma decimal y sin ceros de más', () => {
    expect(formatKg('620.0')).toBe('620 kg');
    expect(formatKg('144.5')).toBe('144,5 kg');
  });

  it('un porcentaje o un rendimiento sin divisor es una raya, no cero', () => {
    expect(formatShare(null)).toBe('—');
    expect(formatShare('0.0')).toBe('0 %');
    expect(formatKgPerHectare(null)).toBe('—');
    expect(formatKgPerHectare('248.0')).toBe('248 kg/ha');
  });

  it('el mes lleva el año en enero y en el primer mes del gráfico', () => {
    expect(monthTick('2026-03', false)).toBe('mar');
    expect(monthTick('2026-01', false)).toBe('ene 26');
    expect(monthTick('2025-11', true)).toBe('nov 25');
  });
});

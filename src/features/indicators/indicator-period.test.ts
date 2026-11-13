import { describe, expect, it } from 'vitest';

import { daysBetween } from '@/lib/format/dates';

import { INDICATOR_PERIODS, indicatorPeriodBounds } from './indicator-period';

describe('indicatorPeriodBounds', () => {
  it('el año va del 1 de enero a hoy', () => {
    expect(indicatorPeriodBounds('year', '2026-11-13')).toEqual({
      from: '2026-01-01',
      to: '2026-11-13',
    });
  });

  it('los meses empiezan el primer día del mes que abre el rango', () => {
    expect(indicatorPeriodBounds('3m', '2026-11-13')).toEqual({
      from: '2026-09-01',
      to: '2026-11-13',
    });
    expect(indicatorPeriodBounds('6m', '2026-11-13').from).toBe('2026-06-01');
    expect(indicatorPeriodBounds('12m', '2026-11-13').from).toBe('2025-12-01');
  });

  it('cruza el cambio de año', () => {
    expect(indicatorPeriodBounds('3m', '2026-02-10').from).toBe('2025-12-01');
  });

  it.each(['2024-12-31', '2026-03-31', '2026-12-31', '2025-01-31'])(
    'nunca pasa de los 366 días que acepta el servidor (hoy %s)',
    (today) => {
      for (const period of INDICATOR_PERIODS) {
        const { from, to } = indicatorPeriodBounds(period, today);
        expect(daysBetween(from, to) + 1).toBeLessThanOrEqual(366);
      }
    },
  );
});

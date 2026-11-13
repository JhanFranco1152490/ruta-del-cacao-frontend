import { describe, expect, it } from 'vitest';

import { daysBetween } from '@/lib/format/dates';

import { matchingPreset, PERIOD_PRESETS, presetBounds } from './period-presets';

describe('presetBounds', () => {
  it('el año va del 1 de enero a hoy', () => {
    expect(presetBounds('year', '2026-11-13')).toEqual({
      from: '2026-01-01',
      to: '2026-11-13',
    });
  });

  it('los meses empiezan el primer día del mes que abre el rango', () => {
    expect(presetBounds('3m', '2026-11-13')).toEqual({
      from: '2026-09-01',
      to: '2026-11-13',
    });
    expect(presetBounds('6m', '2026-11-13').from).toBe('2026-06-01');
    expect(presetBounds('12m', '2026-11-13').from).toBe('2025-12-01');
  });

  it('cruza el cambio de año', () => {
    expect(presetBounds('3m', '2026-02-10').from).toBe('2025-12-01');
  });

  it.each(['2024-12-31', '2026-03-31', '2026-12-31', '2025-01-31'])(
    'nunca pasa de los 366 días que acepta el servidor (hoy %s)',
    (today) => {
      for (const period of PERIOD_PRESETS) {
        const { from, to } = presetBounds(period, today);
        expect(daysBetween(from, to) + 1).toBeLessThanOrEqual(366);
      }
    },
  );
});

describe('matchingPreset', () => {
  it('names the shortcut whose dates are set', () => {
    expect(matchingPreset('2026-01-01', '2026-11-13', '2026-11-13')).toBe(
      'year',
    );
    expect(matchingPreset('2026-09-01', '2026-11-13', '2026-11-13')).toBe('3m');
  });

  it('names none for dates written by hand', () => {
    expect(matchingPreset('2026-02-01', '2026-11-13', '2026-11-13')).toBeNull();
    expect(matchingPreset(null, null, '2026-11-13')).toBeNull();
  });
});

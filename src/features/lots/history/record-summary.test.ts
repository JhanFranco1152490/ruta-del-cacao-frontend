import { describe, expect, it } from 'vitest';

import { buildHistoryStage } from '@/test/lot-history-factories';

import {
  countText,
  dryingLogText,
  phRangeText,
  showRecordsText,
  temperatureRangeText,
  turnText,
} from './record-summary';

const fermentation = (
  data: Parameters<typeof buildHistoryStage<'fermentation'>>[1] = {},
) => buildHistoryStage('fermentation', data).fermentation;

describe('the measurement ranges of a fermentation', () => {
  it('go from the lowest to the highest reading', () => {
    expect(temperatureRangeText(fermentation())).toBe('38,0–47,5 °C');
    expect(phRangeText(fermentation())).toBe('4,20–5,10');
  });

  it('are a single reading when both ends match', () => {
    expect(
      temperatureRangeText(
        fermentation({ temperature_min_c: '42.0', temperature_max_c: '42.0' }),
      ),
    ).toBe('42,0 °C');
    expect(phRangeText(fermentation({ ph_min: '4.9', ph_max: '4.90' }))).toBe(
      '4,90',
    );
  });

  it('do not exist before the first turn', () => {
    const noTurns = fermentation({
      temperature_min_c: null,
      temperature_max_c: null,
      ph_min: null,
      ph_max: null,
    });
    expect(temperatureRangeText(noTurns)).toBeNull();
    expect(phRangeText(noTurns)).toBeNull();
  });
});

describe('countText', () => {
  it('agrees with the count', () => {
    expect(countText(1, 'volteo', 'volteos')).toBe('1 volteo');
    expect(countText(4, 'volteo', 'volteos')).toBe('4 volteos');
  });
});

describe('showRecordsText', () => {
  it('names one record or how many there are', () => {
    expect(showRecordsText(1, 'volteo', 'volteos')).toBe('Ver el volteo');
    expect(showRecordsText(6, 'día', 'días')).toBe('Ver los 6 días');
  });
});

describe('the records of a stage', () => {
  it('read a turn with its Bogotá time and readings', () => {
    expect(turnText(fermentation().turns[0])).toBe(
      '17 mar. 08:00 · 38,0 °C · pH 5,10',
    );
  });

  it('read a drying day with its moisture, sun and weather', () => {
    const [day] = buildHistoryStage('drying').drying.logs;
    expect(dryingLogText(day)).toBe(
      'Día 1 · 21 mar · 40,0 % · 6,0 h de sol · Soleado',
    );
  });
});

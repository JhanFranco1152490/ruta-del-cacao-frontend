import { describe, expect, it } from 'vitest';

import {
  ageInMonths,
  averageAgeInMonths,
  coherenceWarnings,
  impossibleDensity,
  type CoherenceInput,
  densityPerHectare,
  formatAge,
  formatCount,
  normalizeVarietyName,
  totalTrees,
} from './characterization-rules';

const TODAY = new Date(2026, 9, 3);

const input = (overrides: Partial<CoherenceInput> = {}): CoherenceInput => ({
  density: 1000,
  stage: 'full_production',
  ageMonths: 60,
  varietyNames: ['ICS-95'],
  ...overrides,
});

const codes = (overrides: Partial<CoherenceInput>) =>
  coherenceWarnings(input(overrides)).map((warning) => warning.code);

describe('ageInMonths', () => {
  it('counts the calendar months since the planting month', () => {
    expect(ageInMonths('2021-03', TODAY)).toBe(67);
    expect(ageInMonths('2026-10', TODAY)).toBe(0);
  });

  it('is negative for a future month', () => {
    expect(ageInMonths('2026-11', TODAY)).toBe(-1);
  });

  it('is null when the text is not a month', () => {
    expect(ageInMonths('', TODAY)).toBeNull();
    expect(ageInMonths('2021-13', TODAY)).toBeNull();
    expect(ageInMonths('2021-3', TODAY)).toBeNull();
  });
});

describe('averageAgeInMonths', () => {
  it('weighs the age of each planting by its trees', () => {
    // 1.000 árboles de 2018-10 (96 meses) y 500 de 2024-10 (24 meses): (96·1000 + 24·500) / 1500.
    expect(
      averageAgeInMonths(
        [
          { plantingMonth: '2018-10', trees: 1000 },
          { plantingMonth: '2024-10', trees: 500 },
        ],
        TODAY,
      ),
    ).toBe(72);
  });

  it('rounds to whole months', () => {
    expect(
      averageAgeInMonths(
        [
          { plantingMonth: '2026-09', trees: 1 },
          { plantingMonth: '2026-10', trees: 1 },
        ],
        TODAY,
      ),
    ).toBe(1);
  });

  it('leaves out plantings still without a month or trees', () => {
    expect(
      averageAgeInMonths(
        [
          { plantingMonth: '2021-03', trees: 10 },
          { plantingMonth: '', trees: 50 },
          { plantingMonth: '2025-03', trees: Number.NaN },
        ],
        TODAY,
      ),
    ).toBe(67);
  });

  it('has no age without a complete planting', () => {
    expect(averageAgeInMonths([{ plantingMonth: '', trees: 5 }], TODAY)).toBe(
      null,
    );
  });

  it('has no age when a planting is in the future', () => {
    expect(
      averageAgeInMonths([{ plantingMonth: '2027-01', trees: 5 }], TODAY),
    ).toBe(null);
  });
});

describe('impossibleDensity', () => {
  it('allows up to 10.000 trees per hectare, one square meter per tree', () => {
    expect(impossibleDensity(10_000, '1.00')).toBe(false);
    expect(impossibleDensity(10_001, '1.00')).toBe(true);
  });

  it('compares the exact density, not the rounded one shown', () => {
    expect(impossibleDensity(24_000, '2.40')).toBe(false);
    expect(impossibleDensity(24_001, '2.40')).toBe(true);
    expect(impossibleDensity(2_900, '0.29')).toBe(false);
  });

  it('decides nothing without a valid area', () => {
    expect(impossibleDensity(50_000, '')).toBe(false);
    expect(impossibleDensity(50_000, '0')).toBe(false);
  });
});

describe('formatAge', () => {
  it('reads years and months in Spanish', () => {
    expect(formatAge(55)).toBe('4 años y 7 meses');
    expect(formatAge(12)).toBe('1 año');
    expect(formatAge(13)).toBe('1 año y 1 mes');
    expect(formatAge(24)).toBe('2 años');
    expect(formatAge(5)).toBe('5 meses');
    expect(formatAge(1)).toBe('1 mes');
    expect(formatAge(0)).toBe('menos de un mes');
  });
});

describe('totalTrees', () => {
  it('adds the trees of every variety and skips what is not a number yet', () => {
    expect(totalTrees([1800, 600])).toBe(2400);
    expect(totalTrees([1800, Number.NaN])).toBe(1800);
    expect(totalTrees([])).toBe(0);
  });
});

describe('densityPerHectare', () => {
  it('divides the trees by the declared area', () => {
    expect(densityPerHectare(2400, '2.40')).toBe(1000);
    expect(densityPerHectare(5000, '2.00')).toBe(2500);
  });

  it('is null without a usable area', () => {
    expect(densityPerHectare(2400, '0')).toBeNull();
    expect(densityPerHectare(2400, '')).toBeNull();
    expect(densityPerHectare(2400, 'abc')).toBeNull();
  });
});

describe('formatCount', () => {
  it('groups thousands with a dot, also for four digits', () => {
    expect(formatCount(2400)).toBe('2.400');
    expect(formatCount(950)).toBe('950');
  });
});

describe('normalizeVarietyName', () => {
  it('treats spaces, hyphens, case and accents as the same name', () => {
    const expected = normalizeVarietyName('CCN-51');
    expect(normalizeVarietyName('CCN 51')).toBe(expected);
    expect(normalizeVarietyName('CCN51')).toBe(expected);
    expect(normalizeVarietyName(' ccn-51 ')).toBe(expected);
    expect(normalizeVarietyName('Híbrido común')).toBe(
      normalizeVarietyName('hibrido comun'),
    );
  });

  it('treats the dashes pasted from a document as hyphens, like the server', () => {
    const expected = normalizeVarietyName('CCN-51');
    for (const dash of [
      '\u2010',
      '\u2011',
      '\u2012',
      '\u2013',
      '\u2014',
      '\u2212',
    ]) {
      expect(normalizeVarietyName(`CCN${dash}51`)).toBe(expected);
    }
  });
});

describe('coherenceWarnings', () => {
  it('says nothing for a usual characterization', () => {
    expect(coherenceWarnings(input())).toEqual([]);
  });

  it('warns about a density outside 400 to 1,600 trees per hectare', () => {
    expect(codes({ density: 399 })).toEqual(['density_out_of_range']);
    expect(codes({ density: 400 })).toEqual([]);
    expect(codes({ density: 1600 })).toEqual([]);
    expect(codes({ density: 1601 })).toEqual(['density_out_of_range']);
    expect(codes({ density: null })).toEqual([]);
  });

  it('shows the density in the message', () => {
    const [warning] = coherenceWarnings(input({ density: 2500 }));
    expect(warning.message).toBe(
      'Densidad de siembra fuera de rango habitual (2.500 árboles/ha). Revisa el número de árboles o el área de la parcela.',
    );
  });

  it('warns about a producing stage before two years', () => {
    expect(codes({ stage: 'early_production', ageMonths: 23 })).toEqual([
      'stage_age_mismatch',
    ]);
    expect(codes({ stage: 'full_production', ageMonths: 23 })).toEqual([
      'stage_age_mismatch',
    ]);
    expect(codes({ stage: 'early_production', ageMonths: 24 })).toEqual([]);
  });

  it('warns about establishment after five years', () => {
    expect(codes({ stage: 'establishment', ageMonths: 60 })).toEqual([]);
    expect(codes({ stage: 'establishment', ageMonths: 61 })).toEqual([
      'stage_age_mismatch',
    ]);
  });

  it('never warns about the stage of renovation', () => {
    expect(codes({ stage: 'renovation', ageMonths: 3 })).toEqual([]);
    expect(codes({ stage: 'renovation', ageMonths: 300 })).toEqual([]);
  });

  it('names the age of the crop in the stage message', () => {
    const [warning] = coherenceWarnings(
      input({ stage: 'full_production', ageMonths: 18 }),
    );
    expect(warning.message).toBe(
      'La etapa elegida no es la usual para un cultivo de 1 año y 6 meses.',
    );
  });

  it('does not judge the stage without a stage or with a future month', () => {
    expect(codes({ stage: null, ageMonths: 3 })).toEqual([]);
    expect(codes({ stage: 'full_production', ageMonths: null })).toEqual([]);
    expect(codes({ stage: 'full_production', ageMonths: -2 })).toEqual([]);
  });

  it('warns when CCN-51 shares the plot with other clones', () => {
    expect(codes({ varietyNames: ['CCN-51'] })).toEqual([]);
    expect(codes({ varietyNames: ['CCN-51', 'ICS-95'] })).toEqual([
      'ccn51_mixed',
    ]);
    expect(codes({ varietyNames: ['CCN 51', 'ccn-51'] })).toEqual([]);
    expect(codes({ varietyNames: ['ICS-95', 'TSH-565'] })).toEqual([]);
  });

  it('can give all three warnings at once', () => {
    expect(
      codes({
        density: 3000,
        stage: 'full_production',
        ageMonths: 6,
        varietyNames: ['CCN-51', 'FEAR-5'],
      }),
    ).toEqual(['density_out_of_range', 'stage_age_mismatch', 'ccn51_mixed']);
  });
});

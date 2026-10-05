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
  isSeedVariety,
  normalizeVarietyName,
  suggestStage,
  totalTrees,
} from './characterization-rules';

const TODAY = new Date(2026, 9, 3);

const planting = (
  overrides: Partial<CoherenceInput['plantings'][number]> = {},
): CoherenceInput['plantings'][number] => ({
  stage: 'full_production',
  ageMonths: 60,
  propagation: 'grafted',
  ...overrides,
});

const input = (overrides: Partial<CoherenceInput> = {}): CoherenceInput => ({
  density: 1000,
  plantings: [planting()],
  varietyNames: ['ICS-95'],
  ...overrides,
});

const codes = (overrides: Partial<CoherenceInput>) =>
  coherenceWarnings(input(overrides)).map((warning) => warning.code);

// Una sola siembra con estos datos: lo que se juzga en la mayoría de las pruebas de etapa.
const stageCodes = (overrides: Partial<CoherenceInput['plantings'][number]>) =>
  codes({ plantings: [planting(overrides)] });

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
    expect(stageCodes({ stage: 'early_production', ageMonths: 23 })).toEqual([
      'stage_age_mismatch',
    ]);
    expect(stageCodes({ stage: 'full_production', ageMonths: 23 })).toEqual([
      'stage_age_mismatch',
    ]);
    expect(stageCodes({ stage: 'early_production', ageMonths: 24 })).toEqual(
      [],
    );
  });

  it('expects a seed planting to start producing later, around five years', () => {
    expect(
      stageCodes({
        propagation: 'seed',
        stage: 'early_production',
        ageMonths: 47,
      }),
    ).toEqual(['stage_age_mismatch']);
    expect(
      stageCodes({
        propagation: 'seed',
        stage: 'early_production',
        ageMonths: 48,
      }),
    ).toEqual([]);
  });

  it('warns about establishment after five years', () => {
    expect(stageCodes({ stage: 'establishment', ageMonths: 60 })).toEqual([]);
    expect(stageCodes({ stage: 'establishment', ageMonths: 61 })).toEqual([
      'stage_age_mismatch',
    ]);
  });

  it('never warns about the stage of renovation', () => {
    expect(stageCodes({ stage: 'renovation', ageMonths: 3 })).toEqual([]);
    expect(stageCodes({ stage: 'renovation', ageMonths: 300 })).toEqual([]);
  });

  it('names the planting and the age of the crop in the stage message', () => {
    const [warning] = coherenceWarnings(
      input({
        plantings: [
          planting(),
          planting({ stage: 'full_production', ageMonths: 18 }),
        ],
      }),
    );
    expect(warning.message).toBe(
      'La etapa de la siembra 2 no es la usual para un cultivo de 1 año y 6 meses.',
    );
  });

  it('judges each planting by its own age, not by the average', () => {
    // Una tanda vieja en producción y otra recién sembrada que también dice producción.
    expect(
      codes({
        plantings: [
          planting({ ageMonths: 96 }),
          planting({ stage: 'full_production', ageMonths: 6 }),
        ],
      }),
    ).toEqual(['stage_age_mismatch']);
  });

  it('warns once per planting that does not fit', () => {
    expect(
      codes({
        plantings: [
          planting({ ageMonths: 3 }),
          planting({ ageMonths: 6 }),
          planting({ ageMonths: 96 }),
        ],
      }),
    ).toEqual(['stage_age_mismatch', 'stage_age_mismatch']);
  });

  it('does not judge the stage without a stage or with a future month', () => {
    expect(stageCodes({ stage: null, ageMonths: 3 })).toEqual([]);
    expect(stageCodes({ stage: 'full_production', ageMonths: null })).toEqual(
      [],
    );
    expect(stageCodes({ stage: 'full_production', ageMonths: -2 })).toEqual([]);
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
        plantings: [planting({ ageMonths: 6 })],
        varietyNames: ['CCN-51', 'FEAR-5'],
      }),
    ).toEqual(['density_out_of_range', 'stage_age_mismatch', 'ccn51_mixed']);
  });
});

describe('suggestStage', () => {
  it('suggests establishment before two years', () => {
    expect(suggestStage(0, 'grafted')).toBe('establishment');
    expect(suggestStage(23, 'grafted')).toBe('establishment');
  });

  it('suggests the start of production from two to four years', () => {
    expect(suggestStage(24, 'grafted')).toBe('early_production');
    expect(suggestStage(47, 'grafted')).toBe('early_production');
  });

  it('suggests stable production from four years on', () => {
    expect(suggestStage(48, 'grafted')).toBe('full_production');
    expect(suggestStage(240, 'grafted')).toBe('full_production');
  });

  it('never suggests renovation: it does not come from the age', () => {
    for (const months of [0, 24, 48, 120, 360]) {
      expect(suggestStage(months, 'grafted')).not.toBe('renovation');
    }
  });

  it('suggests nothing for seed, whose stages are not documented', () => {
    expect(suggestStage(12, 'seed')).toBeNull();
    expect(suggestStage(120, 'seed')).toBeNull();
  });

  it('suggests nothing without an age, or with a future month', () => {
    expect(suggestStage(null, 'grafted')).toBeNull();
    expect(suggestStage(-1, 'grafted')).toBeNull();
  });
});

describe('isSeedVariety', () => {
  it('recognizes the unidentified hybrid, however it is written', () => {
    expect(isSeedVariety('Híbrido o común (sin identificar)')).toBe(true);
    expect(isSeedVariety('hibrido o comun (sin identificar)')).toBe(true);
  });

  it('takes every other variety as a clone', () => {
    expect(isSeedVariety('CCN-51')).toBe(false);
    expect(isSeedVariety('FSA-12')).toBe(false);
  });
});

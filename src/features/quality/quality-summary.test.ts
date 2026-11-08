import { describe, expect, it } from 'vitest';

import type { LotQualityDetail } from './api';
import { qualitySummary } from './quality-summary';

const buildLotQuality = (
  overrides: Partial<LotQualityDetail> = {},
): LotQualityDetail => ({
  well_fermented_pct: '85.0',
  moldy_pct: '2.0',
  other_defects_pct: '5.0',
  evaluated_at: '2026-10-30T09:00:00-05:00',
  g1_kg: null,
  g2_kg: null,
  discard_kg: null,
  discard_reason: null,
  discarded_at: null,
  ...overrides,
});

describe('qualitySummary', () => {
  it('says the evaluation is pending when there is none', () => {
    expect(qualitySummary('dried', null)).toBe('Pendiente de evaluación');
  });

  it('says the share of well fermented beans of an evaluated lot', () => {
    const quality = buildLotQuality({ well_fermented_pct: '85.0' });

    expect(qualitySummary('evaluated', quality)).toBe(
      'Evaluado · 85,0 % bien fermentados',
    );
  });

  it('says the kilos of each grade and the discard of a classified lot', () => {
    const quality = buildLotQuality({
      g1_kg: '60.0',
      g2_kg: '50.0',
      discard_kg: '4.0',
    });

    expect(qualitySummary('classified', quality)).toBe(
      'Clasificado · G1 60,0 kg · G2 50,0 kg · descarte 4,0 kg',
    );
  });

  it('leaves the discard out when nothing was discarded', () => {
    const quality = buildLotQuality({
      g1_kg: '60.0',
      g2_kg: '54.0',
      discard_kg: '0.0',
    });

    expect(qualitySummary('classified', quality)).toBe(
      'Clasificado · G1 60,0 kg · G2 54,0 kg',
    );
  });

  it('says the reason of a discarded lot', () => {
    const quality = buildLotQuality({ discard_reason: 'mold' });

    expect(qualitySummary('discarded', quality)).toBe('Descartado · Moho');
  });
});

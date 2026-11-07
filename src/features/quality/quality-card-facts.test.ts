import { describe, expect, it } from 'vitest';

import {
  buildLotQuality,
  buildQualityClassification,
  buildQualityDiscard,
  buildQualityEvaluation,
} from '@/test/factories';

import {
  classificationFacts,
  closedByLine,
  gradeShares,
  discardLine,
  dryLine,
  lotBrief,
  evaluatedByLine,
  evaluationFacts,
} from './quality-card-facts';

describe('quality card facts', () => {
  it('reads the dry lot with fixed decimals', () => {
    expect(dryLine(buildLotQuality({ dry_weight_kg: '62' }))).toBe(
      '62,0 kg secos · 7,0 % de humedad · secado el 29 oct',
    );
  });

  it('sums up the lot for the forms', () => {
    expect(lotBrief(buildLotQuality())).toBe(
      '62,5 kg secos · humedad final 7,0 %',
    );
  });

  it('names the three percentages, and nothing before the evaluation', () => {
    expect(evaluationFacts(buildLotQuality())).toEqual([]);
    expect(
      evaluationFacts(
        buildLotQuality({ evaluation: buildQualityEvaluation() }),
      ).map(({ label, value }) => `${label} ${value}`),
    ).toEqual([
      'Bien fermentados 85,0 %',
      'Con moho 2,0 %',
      'Otros defectos 5,0 %',
    ]);
  });

  it('says who evaluated and, if corrected, who corrected', () => {
    expect(evaluatedByLine(buildLotQuality())).toBeNull();
    expect(
      evaluatedByLine(
        buildLotQuality({ evaluation: buildQualityEvaluation() }),
      ),
    ).toBe('Evaluado por Cuenta de prueba el 30 oct');
    expect(
      evaluatedByLine(
        buildLotQuality({
          evaluation: buildQualityEvaluation({
            corrected_at: '2026-10-31T09:00:00-05:00',
            corrected_by: { id: 'u2', full_name: 'Otra cuenta' },
          }),
        }),
      ),
    ).toBe(
      'Evaluado por Cuenta de prueba el 30 oct · Corregido por Otra cuenta el 31 oct',
    );
  });

  it('lists the grades in kilos', () => {
    expect(
      classificationFacts(buildQualityClassification()).map(
        ({ value }) => value,
      ),
    ).toEqual(['50,0 kg', '12,5 kg', '0,0 kg']);
  });

  it('says the reason of a whole discard or of the discarded kilos', () => {
    expect(discardLine(buildLotQuality())).toBeNull();
    expect(
      discardLine(buildLotQuality({ discard: buildQualityDiscard() })),
    ).toBe('Motivo: Moho');
    expect(
      discardLine(
        buildLotQuality({
          classification: buildQualityClassification({
            discard_kg: '6.0',
            discard_reason: 'insect_damage',
          }),
        }),
      ),
    ).toBe('Motivo del descarte: Daño por insectos');
    expect(
      discardLine(
        buildLotQuality({ classification: buildQualityClassification() }),
      ),
    ).toBeNull();
  });

  it('says who closed the lot and when', () => {
    expect(
      closedByLine(
        buildLotQuality({ classification: buildQualityClassification() }),
      ),
    ).toBe('Clasificado por Cuenta de prueba el 30 oct');
    expect(
      closedByLine(buildLotQuality({ discard: buildQualityDiscard() })),
    ).toBe('Descartado por Cuenta de prueba el 30 oct');
    expect(closedByLine(buildLotQuality())).toBeNull();
  });

  it('splits the grades into shares of what was distributed', () => {
    expect(
      gradeShares(
        buildQualityClassification({
          g1_kg: '50.0',
          g2_kg: '40.0',
          discard_kg: '10.0',
        }),
      ),
    ).toEqual([
      { label: 'G1', width: 50, tone: 'ok' },
      { label: 'G2', width: 40, tone: 'info' },
      { label: 'Descarte', width: 10, tone: 'err' },
    ]);
  });

  it('draws nothing when no kilos were distributed', () => {
    expect(
      gradeShares(
        buildQualityClassification({
          g1_kg: '0.0',
          g2_kg: '0.0',
          discard_kg: '0.0',
        }),
      ),
    ).toEqual([]);
  });
});

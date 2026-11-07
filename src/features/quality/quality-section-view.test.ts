import { describe, expect, it } from 'vitest';

import {
  buildLotQuality,
  buildQualityClassification,
  buildQualityDiscard,
  buildQualityEvaluation,
} from '@/test/factories';

import type { LotQualityDetail } from './api';
import { qualitySectionView } from './quality-section-view';

const summary = (
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

const values = (facts: { label: string; value: string }[]) =>
  facts.map(({ label, value }) => `${label} ${value}`);

describe('qualitySectionView', () => {
  it('shows the evaluation with its sum, without names for whoever cannot evaluate', () => {
    const view = qualitySectionView(summary(), undefined, '62.5');

    expect(values(view.evaluation)).toEqual([
      'Bien fermentados 85,0 %',
      'Con moho 2,0 %',
      'Otros defectos 5,0 %',
      'Suma 92,0 %',
    ]);
    expect(view.evaluatedBy).toBeNull();
    expect(view.notes).toBeNull();
  });

  it('adds who evaluated and the notes with the full detail', () => {
    const full = buildLotQuality({
      evaluation: buildQualityEvaluation({ notes: 'Buen corte' }),
    });

    const view = qualitySectionView(summary(), full, '62.5');

    expect(view.evaluatedBy).toBe('Evaluado por Cuenta de prueba el 30 oct');
    expect(view.notes).toBe('Buen corte');
  });

  it('shows each grade in kilos and as a share of the dry weight', () => {
    const view = qualitySectionView(
      summary({
        g1_kg: '50.0',
        g2_kg: '6.5',
        discard_kg: '6.0',
        discard_reason: 'mold',
      }),
      buildLotQuality({ classification: buildQualityClassification() }),
      '62.5',
    );

    expect(values(view.classification)).toEqual([
      'G1 50,0 kg · 80,0 %',
      'G2 6,5 kg · 10,4 %',
      'Descarte 6,0 kg · 9,6 %',
    ]);
    expect(view.discardReason).toBe('Moho');
    expect(view.classifiedBy).toBe(
      'Clasificado por Cuenta de prueba el 30 oct',
    );
  });

  it('draws each percentage and each grade as a bar of the total', () => {
    const view = qualitySectionView(
      summary({ g1_kg: '50.0', g2_kg: '6.5', discard_kg: '6.0' }),
      undefined,
      '62.5',
    );

    expect(view.evaluation.map(({ bar }) => bar)).toEqual([
      { width: 85, tone: 'ok' },
      { width: 2, tone: 'err' },
      { width: 5, tone: 'warn' },
      undefined,
    ]);
    expect(view.classification.map(({ bar }) => bar?.tone)).toEqual([
      'ok',
      'info',
      'err',
    ]);
    expect(view.classification[0].bar?.width).toBeCloseTo(80);
  });

  it('draws no grade bar without the dry weight to compare against', () => {
    const view = qualitySectionView(
      summary({ g1_kg: '50.0', g2_kg: '6.5', discard_kg: '6.0' }),
      undefined,
      null,
    );

    expect(view.classification.map(({ bar }) => bar)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('says when and why a whole lot was discarded', () => {
    const discarded = summary({
      discard_reason: 'other',
      discarded_at: '2026-10-31T10:00:00-05:00',
    });

    expect(qualitySectionView(discarded, undefined, '62.5')).toMatchObject({
      classification: [],
      discardReason: null,
      discardedNotice: 'Lote descartado el 31 oct. Motivo: Otro.',
    });
    expect(
      qualitySectionView(
        discarded,
        buildLotQuality({
          discard: buildQualityDiscard({
            reason: 'other',
            detail: 'Granos germinados',
          }),
        }),
        '62.5',
      ).discardedNotice,
    ).toBe(
      'Lote descartado el 31 oct por Cuenta de prueba. Motivo: Granos germinados.',
    );
  });
});

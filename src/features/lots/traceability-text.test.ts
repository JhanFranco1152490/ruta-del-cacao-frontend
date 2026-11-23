import { describe, expect, it } from 'vitest';

import type { PublicStage } from './public-traceability';
import { buildPublicTraceability } from '@/test/factories';

import {
  GRADE_NOTES,
  gradeShares,
  percentText,
  publicStageDetail,
  publicStageTitle,
  traceabilityFigures,
  traceabilityHeadline,
  traceabilitySummary,
} from './traceability-text';

const dated = (
  kind: 'harvest' | 'evaluation' | 'classification' | 'stock_entry',
): PublicStage => ({
  kind,
  date: '2026-04-02',
});

const span = (
  kind: 'fermentation' | 'drying',
  overrides: Partial<Extract<PublicStage, { started_on: string }>> = {},
): PublicStage => ({
  kind,
  started_on: '2026-03-15',
  ended_on: '2026-03-21',
  days: 6,
  ...overrides,
});

describe('publicStageTitle', () => {
  it.each([
    [dated('harvest'), 'Cosecha'],
    [span('fermentation'), 'Fermentación'],
    [span('drying'), 'Secado'],
    [dated('evaluation'), 'Evaluación de calidad'],
    [dated('classification'), 'Clasificación'],
    [dated('stock_entry'), 'Ingreso a bodega'],
  ])('names %o in words anyone understands', (stage, title) => {
    expect(publicStageTitle(stage)).toBe(title);
  });
});

describe('publicStageDetail', () => {
  it('gives the date of a stage that happens on a day', () => {
    expect(publicStageDetail(dated('classification'))).toBe(
      '2 de abril de 2026',
    );
  });

  it('gives the days and the period of a stage that takes several', () => {
    expect(publicStageDetail(span('fermentation'))).toBe(
      '6 días, del 15 al 21 de marzo',
    );
  });

  it('says a single day in the singular', () => {
    expect(
      publicStageDetail(span('drying', { ended_on: '2026-03-15', days: 1 })),
    ).toBe('1 día, el 15 de marzo');
  });

  it('says since when a stage is still going', () => {
    expect(publicStageDetail(span('drying', { ended_on: null, days: 3 }))).toBe(
      'En curso desde el 15 de marzo',
    );
  });
});

describe('percentText', () => {
  it('shows one decimal like the server sends it', () => {
    expect(percentText('82.0')).toBe('82,0 %');
    expect(percentText('72.25')).toBe('72,3 %');
  });
});

describe('GRADE_NOTES', () => {
  it('explains each grade to someone who has never heard of it', () => {
    expect(GRADE_NOTES.g1).toBe('Grano grande, primera calidad');
    expect(Object.keys(GRADE_NOTES)).toEqual(['g1', 'g2', 'discard']);
  });
});

describe('traceabilityHeadline', () => {
  it('names the lot by its variety and where it comes from', () => {
    expect(traceabilityHeadline(buildPublicTraceability().origin)).toBe(
      'CCN-51 de Arboledas',
    );
  });
});

describe('traceabilitySummary', () => {
  it('says what the cacao is, where it grew and when it was harvested and stored', () => {
    expect(traceabilitySummary(buildPublicTraceability())).toBe(
      'Cacao CCN-51 de la finca La Esperanza, Arboledas (Norte de Santander). Cosechado el 14 de marzo de 2026 y en bodega desde el 3 de abril de 2026.',
    );
  });

  it('says it was classified when it has not entered the warehouse yet', () => {
    const data = buildPublicTraceability();
    expect(
      traceabilitySummary({ ...data, stages: data.stages.slice(0, 5) }),
    ).toBe(
      'Cacao CCN-51 de la finca La Esperanza, Arboledas (Norte de Santander). Cosechado el 14 de marzo de 2026 y clasificado el 2 de abril de 2026.',
    );
  });
});

describe('traceabilityFigures', () => {
  it('gives the four figures that are read at a glance', () => {
    expect(traceabilityFigures(buildPublicTraceability())).toEqual([
      { key: 'fermentation', label: 'Fermentación', value: '6 días' },
      { key: 'drying', label: 'Secado', value: '8 días' },
      {
        key: 'well_fermented',
        label: 'Bien fermentados',
        value: '82,0 %',
      },
      { key: 'first_grade', label: 'Primera calidad (G1)', value: '72,2 %' },
    ]);
  });

  it('says a dash for what the lot does not have, so the four are always there', () => {
    const data = buildPublicTraceability();
    const figures = traceabilityFigures({
      ...data,
      stages: data.stages.filter((stage) => stage.kind !== 'drying'),
      quality: { ...data.quality, g1_pct: null },
    });
    expect(figures.map((figure) => figure.value)).toEqual([
      '6 días',
      '—',
      '82,0 %',
      '—',
    ]);
  });
});

describe('gradeShares', () => {
  it('lists each grade with its share, in the order of the bar', () => {
    expect(
      gradeShares(buildPublicTraceability().quality).map(
        ({ key, label, value, text }) => ({ key, label, value, text }),
      ),
    ).toEqual([
      { key: 'g1', label: 'G1', value: 72.2, text: '72,2 %' },
      { key: 'g2', label: 'G2', value: 17.8, text: '17,8 %' },
      { key: 'discard', label: 'Descarte', value: 10, text: '10,0 %' },
    ]);
  });

  it('leaves out what is zero or unknown: a bar with nothing is noise', () => {
    const shares = gradeShares({
      well_fermented_pct: '90.0',
      g1_pct: '100.0',
      g2_pct: '0.0',
      discard_pct: null,
    });
    expect(shares.map((share) => share.key)).toEqual(['g1']);
  });
});

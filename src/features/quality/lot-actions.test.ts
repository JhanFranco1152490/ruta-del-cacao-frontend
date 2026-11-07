import { describe, expect, it } from 'vitest';

import { qualityLotActions, qualityStageAction } from './lot-actions';

const ALL = { evaluate: true, classify: true, discard: true };
const NONE = { evaluate: false, classify: false, discard: false };

describe('qualityLotActions', () => {
  it('evaluates a dry lot in Calidad', () => {
    expect(qualityLotActions({ id: 'l1', status: 'dried' }, ALL)).toEqual([
      expect.objectContaining({
        label: 'Evaluar',
        href: '/calidad?lote=l1&accion=evaluar',
      }),
    ]);
  });

  it('classifies or discards an evaluated lot, as the account may', () => {
    expect(
      qualityLotActions({ id: 'l1', status: 'evaluated' }, ALL).map(
        ({ label, href }) => [label, href],
      ),
    ).toEqual([
      ['Clasificar', '/calidad?lote=l1&accion=clasificar'],
      ['Descartar lote', '/calidad?lote=l1&accion=descartar'],
    ]);
    expect(
      qualityLotActions(
        { id: 'l1', status: 'evaluated' },
        { ...ALL, discard: false },
      ).map(({ label }) => label),
    ).toEqual(['Clasificar']);
  });

  it('offers nothing without permission to evaluate, nor on other statuses', () => {
    expect(qualityLotActions({ id: 'l1', status: 'dried' }, NONE)).toEqual([]);
    expect(qualityLotActions({ id: 'l1', status: 'classified' }, ALL)).toEqual(
      [],
    );
    expect(qualityLotActions({ id: 'l1', status: 'drying' }, ALL)).toEqual([]);
  });
});

describe('qualityStageAction', () => {
  it('leads to the tab where each status is worked', () => {
    expect(qualityStageAction('dried', ALL)?.href).toBe(
      '/calidad?vista=por-evaluar',
    );
    expect(qualityStageAction('evaluated', ALL)?.href).toBe(
      '/calidad?vista=evaluados',
    );
    expect(qualityStageAction('discarded', ALL)).toBeNull();
    expect(qualityStageAction('dried', NONE)).toBeNull();
  });
});

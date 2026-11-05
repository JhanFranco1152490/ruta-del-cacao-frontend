import { describe, expect, it } from 'vitest';

import type { LotStatus } from '@/lib/lot-status';

import { qualityActions, type QualityPermissions } from './quality-actions';

const ALL: QualityPermissions = {
  evaluate: true,
  classify: true,
  discard: true,
};

const offered = (
  status: LotStatus,
  can: QualityPermissions = ALL,
  online = true,
) => qualityActions({ status, online, can });

describe('qualityActions', () => {
  it('evaluates a dry lot', () => {
    expect(offered('dried').map(({ label }) => label)).toEqual(['Evaluar']);
  });

  it('classifies first, then corrects or discards an evaluated lot', () => {
    expect(
      offered('evaluated').map(({ label, danger }) => [label, danger]),
    ).toEqual([
      ['Clasificar', false],
      ['Corregir evaluación', false],
      ['Descartar lote', true],
    ]);
  });

  it('offers nothing on a closed lot or before the drying ends', () => {
    expect(offered('classified')).toEqual([]);
    expect(offered('discarded')).toEqual([]);
    expect(offered('drying')).toEqual([]);
  });

  it('offers only what the account may do', () => {
    expect(
      offered('evaluated', {
        evaluate: true,
        classify: false,
        discard: false,
      }).map(({ action }) => action),
    ).toEqual(['corregir']);
    expect(
      offered('dried', { evaluate: false, classify: true, discard: true }),
    ).toEqual([]);
  });

  it('shows the actions disabled with their reason offline', () => {
    expect(
      offered('evaluated', ALL, false).map(
        ({ disabledReason }) => disabledReason,
      ),
    ).toEqual(Array(3).fill('Registrar la calidad necesita conexión.'));
  });
});

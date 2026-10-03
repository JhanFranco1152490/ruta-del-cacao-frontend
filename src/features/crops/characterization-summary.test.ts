import { describe, expect, it } from 'vitest';

import {
  characterizationSummary,
  stageLabel,
} from './characterization-summary';

describe('characterizationSummary', () => {
  it('leads with the variety that has the most trees', () => {
    expect(
      characterizationSummary(
        [
          { varietyName: 'ICS-95', treeCount: 600 },
          { varietyName: 'CCN-51', treeCount: 1800 },
        ],
        'full_production',
      ),
    ).toBe('CCN-51 y 1 más · 2.400 árboles · Producción estable');
  });

  it('names a single variety alone', () => {
    expect(
      characterizationSummary(
        [{ varietyName: 'FEAR-5', treeCount: 950 }],
        'establishment',
      ),
    ).toBe('FEAR-5 · 950 árboles · Establecimiento o formación');
  });

  it('counts how many other varieties there are', () => {
    expect(
      characterizationSummary(
        [
          { varietyName: 'TSH-565', treeCount: 100 },
          { varietyName: 'ICS-95', treeCount: 300 },
          { varietyName: 'FSV-41', treeCount: 200 },
        ],
        'early_production',
      ),
    ).toBe('ICS-95 y 2 más · 600 árboles · Inicio de producción');
  });

  it('breaks a tie in trees by name, so the summary does not jump around', () => {
    expect(
      characterizationSummary(
        [
          { varietyName: 'TSH-565', treeCount: 500 },
          { varietyName: 'ICS-95', treeCount: 500 },
        ],
        'full_production',
      ),
    ).toMatch(/^ICS-95 y 1 más/);
  });

  it('uses the singular for one tree', () => {
    expect(
      characterizationSummary(
        [{ varietyName: 'CCN-51', treeCount: 1 }],
        'renovation',
      ),
    ).toBe('CCN-51 · 1 árbol · Renovación o rehabilitación');
  });
});

describe('stageLabel', () => {
  it('reads every stage in Spanish', () => {
    expect(stageLabel('full_production')).toBe('Producción estable');
    expect(stageLabel('renovation')).toBe('Renovación o rehabilitación');
  });
});

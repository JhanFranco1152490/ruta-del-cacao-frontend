import { describe, expect, it } from 'vitest';

import {
  characterizationSummary,
  stageLabel,
  type SummaryLine,
} from './characterization-summary';

const line = (overrides: Partial<SummaryLine> = {}): SummaryLine => ({
  varietyName: 'CCN-51',
  treeCount: 100,
  stage: 'full_production',
  ...overrides,
});

describe('characterizationSummary', () => {
  it('leads with the variety that has the most trees', () => {
    expect(
      characterizationSummary([
        line({ varietyName: 'ICS-95', treeCount: 600 }),
        line({ varietyName: 'CCN-51', treeCount: 1800 }),
      ]),
    ).toBe('CCN-51 y 1 más · 2.400 árboles · Producción estable');
  });

  it('names a single variety alone', () => {
    expect(
      characterizationSummary([
        line({
          varietyName: 'FEAR-5',
          treeCount: 950,
          stage: 'establishment',
        }),
      ]),
    ).toBe('FEAR-5 · 950 árboles · Establecimiento o formación');
  });

  it('counts how many other varieties there are', () => {
    expect(
      characterizationSummary([
        line({
          varietyName: 'TSH-565',
          treeCount: 100,
          stage: 'early_production',
        }),
        line({
          varietyName: 'ICS-95',
          treeCount: 300,
          stage: 'early_production',
        }),
        line({
          varietyName: 'FSV-41',
          treeCount: 200,
          stage: 'early_production',
        }),
      ]),
    ).toBe('ICS-95 y 2 más · 600 árboles · Inicio de producción');
  });

  it('breaks a tie in trees by name, so the summary does not jump around', () => {
    expect(
      characterizationSummary([
        line({ varietyName: 'TSH-565', treeCount: 500 }),
        line({ varietyName: 'ICS-95', treeCount: 500 }),
      ]),
    ).toMatch(/^ICS-95 y 1 más/);
  });

  it('uses the singular for one tree', () => {
    expect(
      characterizationSummary([line({ treeCount: 1, stage: 'renovation' })]),
    ).toBe('CCN-51 · 1 árbol · Renovación o rehabilitación');
  });

  it('counts two plantings of the same variety as one variety', () => {
    expect(
      characterizationSummary([
        line({ varietyName: 'ICS-95', treeCount: 900 }),
        line({ varietyName: 'CCN-51', treeCount: 600 }),
        line({ varietyName: 'CCN-51', treeCount: 500 }),
      ]),
    ).toBe('CCN-51 y 1 más · 2.000 árboles · Producción estable');
  });

  it('leads with the stage that has the most trees and counts the others', () => {
    expect(
      characterizationSummary([
        line({ treeCount: 1000, stage: 'full_production' }),
        line({ treeCount: 500, stage: 'establishment' }),
      ]),
    ).toBe('CCN-51 · 1.500 árboles · Producción estable y 1 más');
  });

  it('adds the trees of the plantings that share a stage before comparing', () => {
    expect(
      characterizationSummary([
        line({ treeCount: 600, stage: 'establishment' }),
        line({ treeCount: 500, stage: 'establishment' }),
        line({ treeCount: 800, stage: 'full_production' }),
      ]),
    ).toBe('CCN-51 · 1.900 árboles · Establecimiento o formación y 1 más');
  });

  it('does not repeat the count when every planting is in the same stage', () => {
    expect(
      characterizationSummary([
        line({ treeCount: 600 }),
        line({ treeCount: 500 }),
      ]),
    ).not.toMatch(/Producción estable y/);
  });

  it('breaks a tie between stages by the order of the cycle', () => {
    expect(
      characterizationSummary([
        line({ treeCount: 500, stage: 'full_production' }),
        line({ treeCount: 500, stage: 'establishment' }),
      ]),
    ).toMatch(/Establecimiento o formación y 1 más$/);
  });
});

describe('stageLabel', () => {
  it('reads every stage in Spanish', () => {
    expect(stageLabel('full_production')).toBe('Producción estable');
    expect(stageLabel('renovation')).toBe('Renovación o rehabilitación');
  });
});

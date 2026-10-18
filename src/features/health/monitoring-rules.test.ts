import { describe, expect, it } from 'vitest';

import {
  detectionKey,
  incidencePercent,
  incidenceText,
  OTHER_PEST_DISEASE,
  parseUnits,
} from './monitoring-rules';

describe('parseUnits', () => {
  it('reads a whole number above zero', () => {
    expect(parseUnits('50')).toBe(50);
    expect(parseUnits(' 7 ')).toBe(7);
  });

  it('gives nothing for an empty, zero, negative or broken number', () => {
    expect(parseUnits('')).toBeNull();
    expect(parseUnits('0')).toBeNull();
    expect(parseUnits('-3')).toBeNull();
    expect(parseUnits('2.5')).toBeNull();
    expect(parseUnits('abc')).toBeNull();
  });
});

describe('incidencePercent', () => {
  it('is affected over evaluated times 100, with two decimals', () => {
    expect(incidencePercent(12, 50)).toBe('24.00');
    expect(incidencePercent(50, 50)).toBe('100.00');
    expect(incidencePercent(1, 3)).toBe('33.33');
  });

  // Como el servidor: la mitad sube.
  it('rounds the half up', () => {
    expect(incidencePercent(1, 8)).toBe('12.50');
    expect(incidencePercent(1, 16)).toBe('6.25');
    expect(incidencePercent(1, 1600)).toBe('0.06');
    expect(incidencePercent(2, 3)).toBe('66.67');
  });
});

describe('incidenceText', () => {
  it('says how many of how many and the percent, as the person writes', () => {
    expect(incidenceText('12', '50', 'trees')).toBe('12 de 50 árboles · 24 %');
    expect(incidenceText('1', '3', 'pods')).toBe('1 de 3 mazorcas · 33,33 %');
  });

  it('names the unit in singular when only one was evaluated', () => {
    expect(incidenceText('1', '1', 'trees')).toBe('1 de 1 árbol · 100 %');
  });

  it('says nothing while a number is missing or more were affected than evaluated', () => {
    expect(incidenceText('', '50', 'trees')).toBeNull();
    expect(incidenceText('12', '', 'trees')).toBeNull();
    expect(incidenceText('60', '50', 'trees')).toBeNull();
  });
});

describe('detectionKey', () => {
  it('is the pest or disease chosen from the catalog', () => {
    expect(
      detectionKey({ pest_disease_id: 'monilia', other_description: '' }),
    ).toBe('monilia');
  });

  // Como compara el servidor: "Hormigas en hojas" y "hormigas-EN hojas" son la misma.
  it('compares what was written in Other like the catalog names', () => {
    const typed = (text: string) =>
      detectionKey({
        pest_disease_id: OTHER_PEST_DISEASE,
        other_description: text,
      });
    expect(typed('Hormigas en hojas')).toBe(typed(' hormigas-EN hojas '));
    expect(typed('Hormigas en hojas')).not.toBe(typed('Hormigas'));
  });

  it('gives nothing while nothing was chosen or written', () => {
    expect(detectionKey({ pest_disease_id: '', other_description: '' })).toBe(
      null,
    );
    expect(
      detectionKey({
        pest_disease_id: OTHER_PEST_DISEASE,
        other_description: '  ',
      }),
    ).toBeNull();
  });
});

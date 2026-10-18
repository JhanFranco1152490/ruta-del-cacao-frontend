import { describe, expect, it } from 'vitest';

import { buildPestDisease } from '@/test/factories';

import {
  methodHint,
  recommendationFor,
  unitHint,
  unitRecommendation,
} from './recommendations';

const monilia = buildPestDisease({
  id: 'monilia',
  name: 'Monilia',
  suggested_sampling_unit: 'pods',
  suggested_control_method: 'fruit_removal',
});
const broom = buildPestDisease({
  id: 'broom',
  name: 'Escoba de bruja',
  suggested_sampling_unit: 'trees',
  suggested_control_method: 'sanitary_pruning',
});
const ants = buildPestDisease({
  id: 'ants',
  name: 'Hormiga arriera',
  suggested_sampling_unit: 'trees',
  suggested_control_method: null,
});
const odd = buildPestDisease({
  id: 'odd',
  name: 'Otra del catálogo',
  suggested_sampling_unit: null,
  suggested_control_method: 'other',
});
const catalog = [monilia, broom, ants, odd];

describe('recommendationFor', () => {
  it('reads what the catalog suggests for the chosen pest', () => {
    expect(recommendationFor(catalog, 'monilia')).toEqual({
      pestName: 'Monilia',
      unit: 'pods',
      method: 'fruit_removal',
    });
  });

  it('has nothing for Other, for an empty choice or for a catalog never loaded', () => {
    expect(recommendationFor(catalog, 'other')).toBeNull();
    expect(recommendationFor(catalog, '')).toBeNull();
    expect(recommendationFor(undefined, 'monilia')).toBeNull();
    expect(recommendationFor(catalog, 'desconocida')).toBeNull();
  });

  it('never recommends "Other" as the control: it would ask for a description', () => {
    expect(recommendationFor(catalog, 'odd')?.method).toBeNull();
  });
});

describe('unitRecommendation', () => {
  it('is the unit of the first detection that has one', () => {
    const recs = ['ants', 'monilia'].map((id) =>
      recommendationFor(catalog, id),
    );
    expect(unitRecommendation(recs)).toBe('trees');
    expect(
      unitRecommendation([null, recommendationFor(catalog, 'monilia')]),
    ).toBe('pods');
  });

  it('is nothing when no detection suggests one', () => {
    expect(
      unitRecommendation([null, recommendationFor(catalog, 'odd')]),
    ).toBeNull();
  });
});

describe('unitHint', () => {
  const recs = (...ids: string[]) =>
    ids.map((id) => recommendationFor(catalog, id));

  it('says nothing without suggestions', () => {
    expect(unitHint(recs('odd'), 'trees')).toBeUndefined();
    expect(unitHint([], 'trees')).toBeUndefined();
  });

  it('says what the choice follows when it agrees', () => {
    expect(unitHint(recs('monilia'), 'pods')).toBe(
      'Sugerido por Monilia: mazorcas.',
    );
  });

  it('warns about the pests that are usually measured in the other unit', () => {
    expect(unitHint(recs('monilia', 'broom'), 'pods')).toBe(
      'Escoba de bruja se suele evaluar en árboles.',
    );
    expect(unitHint(recs('monilia', 'broom', 'ants'), 'pods')).toBe(
      'Escoba de bruja y Hormiga arriera se suelen evaluar en árboles.',
    );
  });
});

describe('methodHint', () => {
  it('confirms the recommended control while it is the chosen one', () => {
    expect(
      methodHint(recommendationFor(catalog, 'monilia'), 'fruit_removal'),
    ).toBe('Recomendado para Monilia.');
  });

  it('names the recommendation when another control is chosen', () => {
    expect(methodHint(recommendationFor(catalog, 'monilia'), 'other')).toBe(
      'Para Monilia se recomienda Remoción de frutos enfermos.',
    );
  });

  it('says nothing when the pest has no recommended control', () => {
    expect(methodHint(recommendationFor(catalog, 'ants'), '')).toBeUndefined();
    expect(methodHint(null, 'fruit_removal')).toBeUndefined();
  });
});

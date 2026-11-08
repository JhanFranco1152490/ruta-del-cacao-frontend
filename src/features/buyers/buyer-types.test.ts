import { describe, expect, it } from 'vitest';

import { BUYER_TYPE_OPTIONS, buyerTypeLabel, isBuyerType } from './buyer-types';

describe('BUYER_TYPE_OPTIONS', () => {
  it('lists the five buyer types in the order of the user story', () => {
    expect(BUYER_TYPE_OPTIONS.map((option) => option.label)).toEqual([
      'Industria chocolatera',
      'Exportador',
      'Intermediario o acopiador',
      'Cooperativa o asociación',
      'Transformador artesanal',
    ]);
  });
});

describe('buyerTypeLabel', () => {
  it('names a type', () => {
    expect(buyerTypeLabel('intermediary')).toBe('Intermediario o acopiador');
  });
});

describe('isBuyerType', () => {
  it('tells an API value from anything else', () => {
    expect(isBuyerType('exporter')).toBe(true);
    expect(isBuyerType('exportador')).toBe(false);
  });
});

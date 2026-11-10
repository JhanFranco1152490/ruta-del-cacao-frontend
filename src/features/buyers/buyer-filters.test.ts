import { describe, expect, it } from 'vitest';

import { buildBuyer } from '@/test/factories';

import {
  DEFAULT_BUYER_FILTERS,
  matchesBuyerFilters,
  sortBuyers,
} from './buyer-filters';

const buyer = buildBuyer({
  name: 'Chocolates del Oriente S.A.S.',
  contact_name: 'Persona de Ejemplo',
  identity_document: '900000001',
  buyer_type: 'chocolate_industry',
});

const matches = (search: string, overrides = {}) =>
  matchesBuyerFilters(buyer, {
    ...DEFAULT_BUYER_FILTERS,
    search,
    ...overrides,
  });

describe('matchesBuyerFilters', () => {
  it('finds by name without case, accents, spaces, dashes or dots', () => {
    expect(matches('chocolates del oriente sas')).toBe(true);
    expect(matches('ORIENTE')).toBe(true);
    expect(matches('acopio')).toBe(false);
  });

  it('finds by contact person and by document number', () => {
    expect(matches('persona de ejemplo')).toBe(true);
    expect(matches('900-000')).toBe(true);
  });

  it('shows only the active ones by default', () => {
    const inactive = buildBuyer({ is_active: false });
    expect(matchesBuyerFilters(inactive, DEFAULT_BUYER_FILTERS)).toBe(false);
    expect(
      matchesBuyerFilters(inactive, {
        ...DEFAULT_BUYER_FILTERS,
        status: 'inactive',
      }),
    ).toBe(true);
    expect(
      matchesBuyerFilters(inactive, {
        ...DEFAULT_BUYER_FILTERS,
        status: 'all',
      }),
    ).toBe(true);
    expect(
      matchesBuyerFilters(buyer, {
        ...DEFAULT_BUYER_FILTERS,
        status: 'inactive',
      }),
    ).toBe(false);
  });

  it('filters by buyer type', () => {
    expect(matches('', { type: 'chocolate_industry' })).toBe(true);
    expect(matches('', { type: 'exporter' })).toBe(false);
  });
});

describe('sortBuyers', () => {
  it('sorts by name without case or accents, then by id', () => {
    const sorted = sortBuyers([
      buildBuyer({ id: 'b3', name: 'Ñame y Cacao' }),
      buildBuyer({ id: 'b2', name: 'ábaco Exportaciones' }),
      buildBuyer({ id: 'b1', name: 'Acopio' }),
      buildBuyer({ id: 'b0', name: 'acopio' }),
    ]);
    expect(sorted.map((b) => b.id)).toEqual(['b2', 'b0', 'b1', 'b3']);
  });
});

import { describe, expect, it } from 'vitest';

import {
  formatInputUnit,
  INPUT_TYPE_OPTIONS,
  INPUT_UNIT_OPTIONS,
  inputTypeLabel,
  matchesInputFilters,
} from './input-options';

const input = (overrides = {}) => ({
  name: 'Urea 46 %',
  input_type: 'fertilizer',
  is_active: true,
  ...overrides,
});

describe('input options', () => {
  it('lists the input types in the order of the form', () => {
    expect(INPUT_TYPE_OPTIONS.map(({ label }) => label)).toEqual([
      'Fertilizante',
      'Abono',
      'Fungicida',
      'Insecticida',
      'Otro',
    ]);
  });

  it('lists the units in the order of the form', () => {
    expect(INPUT_UNIT_OPTIONS.map(({ value }) => value)).toEqual([
      'kg',
      'g',
      'l',
      'ml',
      'bag',
      'unit',
    ]);
  });

  it('labels a type, and shows an unknown value as it comes', () => {
    expect(inputTypeLabel('organic_fertilizer')).toBe('Abono');
    expect(inputTypeLabel('herbicide')).toBe('herbicide');
  });
});

describe('formatInputUnit', () => {
  it('names the unit', () => {
    expect(formatInputUnit('kg', null)).toBe('Kilogramos');
    expect(formatInputUnit('ml', null)).toBe('Mililitros');
  });

  it('says the weight of a bag', () => {
    expect(formatInputUnit('bag', '50.00')).toBe('Bulto de 50 kg');
    expect(formatInputUnit('bag', '46.50')).toBe('Bulto de 46,5 kg');
  });

  it('says only Bulto when the weight is missing', () => {
    expect(formatInputUnit('bag', null)).toBe('Bulto');
  });
});

describe('matchesInputFilters', () => {
  const all = { search: '', type: '', status: 'all' } as const;

  it('matches everything without filters', () => {
    expect(matchesInputFilters(input(), all)).toBe(true);
  });

  it('searches the name the way the server compares names', () => {
    expect(matchesInputFilters(input(), { ...all, search: 'urea46' })).toBe(
      true,
    );
    expect(matchesInputFilters(input(), { ...all, search: 'ÚREA' })).toBe(true);
    expect(matchesInputFilters(input(), { ...all, search: 'cobre' })).toBe(
      false,
    );
  });

  it('filters by type', () => {
    expect(matchesInputFilters(input(), { ...all, type: 'fertilizer' })).toBe(
      true,
    );
    expect(matchesInputFilters(input(), { ...all, type: 'fungicide' })).toBe(
      false,
    );
  });

  it('filters by status', () => {
    const inactive = input({ is_active: false });
    expect(matchesInputFilters(input(), { ...all, status: 'active' })).toBe(
      true,
    );
    expect(matchesInputFilters(inactive, { ...all, status: 'active' })).toBe(
      false,
    );
    expect(matchesInputFilters(inactive, { ...all, status: 'inactive' })).toBe(
      true,
    );
    expect(matchesInputFilters(input(), { ...all, status: 'inactive' })).toBe(
      false,
    );
  });

  it('needs every filter to match', () => {
    expect(
      matchesInputFilters(input(), {
        search: 'urea',
        type: 'fungicide',
        status: 'active',
      }),
    ).toBe(false);
  });
});

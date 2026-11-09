import { describe, expect, it } from 'vitest';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import {
  parsePrice,
  PRICE_NOT_WHOLE_MESSAGE,
  PRICE_OUT_OF_RANGE_MESSAGE,
  priceIssue,
} from './sale-price';

describe('parsePrice', () => {
  it('reads whole pesos, with or without the thousands point', () => {
    expect(parsePrice('18500')).toBe(18500);
    expect(parsePrice('18.500')).toBe(18500);
    expect(parsePrice(' 1.000.000 ')).toBe(1000000);
  });

  it('refuses decimals and anything that is not a number', () => {
    expect(parsePrice('18,5')).toBeNull();
    expect(parsePrice('18.5')).toBeNull();
    expect(parsePrice('18.50')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('-5')).toBeNull();
  });
});

describe('priceIssue', () => {
  it('accepts from 1 to 1.000.000 pesos', () => {
    expect(priceIssue('1')).toBeNull();
    expect(priceIssue('18.500')).toBeNull();
    expect(priceIssue('1000000')).toBeNull();
  });

  it('asks for the price', () => {
    expect(priceIssue('  ')).toBe(REQUIRED_FIELD_MESSAGE);
  });

  it('asks for whole pesos when it has decimals', () => {
    expect(priceIssue('18500,5')).toBe(PRICE_NOT_WHOLE_MESSAGE);
    expect(priceIssue('18.5')).toBe(PRICE_NOT_WHOLE_MESSAGE);
  });

  it('asks to check a price out of range or not a number', () => {
    expect(priceIssue('0')).toBe(PRICE_OUT_OF_RANGE_MESSAGE);
    expect(priceIssue('1000001')).toBe(PRICE_OUT_OF_RANGE_MESSAGE);
    expect(priceIssue('abc')).toBe(PRICE_OUT_OF_RANGE_MESSAGE);
  });
});

import { describe, expect, it } from 'vitest';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { ONE_DECIMAL_MESSAGE } from '@/lib/validation/percent';

import {
  availableText,
  exceedsAvailableMessage,
  INVALID_QUANTITY_MESSAGE,
  QUANTITY_NOT_POSITIVE_MESSAGE,
  stockQuantityIssue,
} from './stock-quantity';

describe('availableText', () => {
  it('always shows one decimal', () => {
    expect(availableText(2500)).toBe('Disponible: 250,0 kg');
  });
});

describe('stockQuantityIssue', () => {
  it('accepts up to all that is available, with comma or point', () => {
    expect(stockQuantityIssue('5,0', 2500)).toBeNull();
    expect(stockQuantityIssue('250.0', 2500)).toBeNull();
    expect(stockQuantityIssue('250', 2500)).toBeNull();
  });

  it('rejects more than what is available, saying how much there is', () => {
    expect(stockQuantityIssue('300', 2500)).toBe(
      'La cantidad supera lo disponible (250,0 kg)',
    );
    expect(stockQuantityIssue('250,1', 2500)).toBe(
      exceedsAvailableMessage(250),
    );
  });

  it('asks for a positive number with one decimal', () => {
    expect(stockQuantityIssue(' ', 2500)).toBe(REQUIRED_FIELD_MESSAGE);
    expect(stockQuantityIssue('abc', 2500)).toBe(INVALID_QUANTITY_MESSAGE);
    expect(stockQuantityIssue('5,25', 2500)).toBe(ONE_DECIMAL_MESSAGE);
    expect(stockQuantityIssue('0', 2500)).toBe(QUANTITY_NOT_POSITIVE_MESSAGE);
    expect(stockQuantityIssue('-1', 2500)).toBe(QUANTITY_NOT_POSITIVE_MESSAGE);
  });
});

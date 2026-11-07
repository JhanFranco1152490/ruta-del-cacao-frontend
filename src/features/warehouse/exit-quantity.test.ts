import { describe, expect, it } from 'vitest';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { ONE_DECIMAL_MESSAGE } from '@/lib/validation/percent';

import {
  availableText,
  exceedsAvailableMessage,
  exitableGrades,
  exitQuantityIssue,
  INVALID_QUANTITY_MESSAGE,
  QUANTITY_NOT_POSITIVE_MESSAGE,
} from './exit-quantity';

describe('exitableGrades', () => {
  it('offers the grades with stock, G1 first', () => {
    expect(
      exitableGrades([
        { grade: 'g2', quantity_kg: '55.2' },
        { grade: 'g1', quantity_kg: '250.0' },
      ]),
    ).toEqual([
      { grade: 'g1', label: 'G1', availableTenths: 2500 },
      { grade: 'g2', label: 'G2', availableTenths: 552 },
    ]);
  });

  it('leaves out a grade that ran out or was never stored', () => {
    expect(
      exitableGrades([{ grade: 'g1', quantity_kg: '0.0' }]).map(
        ({ grade }) => grade,
      ),
    ).toEqual([]);
    expect(
      exitableGrades([{ grade: 'g2', quantity_kg: '14.0' }]).map(
        ({ grade }) => grade,
      ),
    ).toEqual(['g2']);
  });
});

describe('availableText', () => {
  it('always shows one decimal', () => {
    expect(availableText(2500)).toBe('Disponible: 250,0 kg');
  });
});

describe('exitQuantityIssue', () => {
  it('accepts up to all that is available, with comma or point', () => {
    expect(exitQuantityIssue('5,0', 2500)).toBeNull();
    expect(exitQuantityIssue('250.0', 2500)).toBeNull();
    expect(exitQuantityIssue('250', 2500)).toBeNull();
  });

  it('rejects more than what is available, saying how much there is', () => {
    expect(exitQuantityIssue('300', 2500)).toBe(
      'La cantidad supera lo disponible (250,0 kg)',
    );
    expect(exitQuantityIssue('250,1', 2500)).toBe(exceedsAvailableMessage(250));
  });

  it('asks for a positive number with one decimal', () => {
    expect(exitQuantityIssue(' ', 2500)).toBe(REQUIRED_FIELD_MESSAGE);
    expect(exitQuantityIssue('abc', 2500)).toBe(INVALID_QUANTITY_MESSAGE);
    expect(exitQuantityIssue('5,25', 2500)).toBe(ONE_DECIMAL_MESSAGE);
    expect(exitQuantityIssue('0', 2500)).toBe(QUANTITY_NOT_POSITIVE_MESSAGE);
    expect(exitQuantityIssue('-1', 2500)).toBe(QUANTITY_NOT_POSITIVE_MESSAGE);
  });
});

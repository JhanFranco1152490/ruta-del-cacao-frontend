import { describe, expect, it } from 'vitest';

import { ONE_DECIMAL_MESSAGE, percentField, PERCENT_MESSAGE } from './percent';
import { REQUIRED_FIELD_MESSAGE } from './messages';

const messageOf = (value: string) =>
  percentField.safeParse(value).error?.issues[0]?.message;

describe('percentField', () => {
  it('accepts a percentage with a comma or a point, and gives it with a point', () => {
    expect(percentField.parse('12,4')).toBe('12.4');
    expect(percentField.parse('0')).toBe('0');
    expect(percentField.parse(' 100 ')).toBe('100');
  });

  it('asks for the value when it is empty', () => {
    expect(messageOf('')).toBe(REQUIRED_FIELD_MESSAGE);
  });

  it.each(['-1', '100,1', '101', 'abc'])(
    'rejects %s as out of range',
    (value) => {
      expect(messageOf(value)).toBe(PERCENT_MESSAGE);
    },
  );

  it('rejects more than one decimal', () => {
    expect(messageOf('12,45')).toBe(ONE_DECIMAL_MESSAGE);
  });
});

import { describe, expect, it } from 'vitest';

import { endSentence } from './sentence';

describe('endSentence', () => {
  it('adds the full stop', () => {
    expect(endSentence('Conformado por Ana')).toBe('Conformado por Ana.');
  });

  it('does not double the stop of an abbreviation', () => {
    expect(endSentence('el 24 de octubre de 2026, 1:17 p.m.')).toBe(
      'el 24 de octubre de 2026, 1:17 p.m.',
    );
  });
});

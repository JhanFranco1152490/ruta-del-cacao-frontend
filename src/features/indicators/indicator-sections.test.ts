import { describe, expect, it } from 'vitest';

import { resolveIndicatorSection } from './indicator-sections';

describe('resolveIndicatorSection', () => {
  it('abre la primera macrosección de cada panel', () => {
    expect(resolveIndicatorSection('producer', null)).toBe('production');
    expect(resolveIndicatorSection('association', null)).toBe('farms');
  });

  it('respeta la de la dirección si es del panel', () => {
    expect(resolveIndicatorSection('producer', 'stock-sales')).toBe(
      'stock-sales',
    );
    expect(resolveIndicatorSection('association', 'months')).toBe('months');
  });

  it('una de otro panel o inventada cae a la primera', () => {
    expect(resolveIndicatorSection('producer', 'farms')).toBe('production');
    expect(resolveIndicatorSection('association', 'zzz')).toBe('farms');
  });
});

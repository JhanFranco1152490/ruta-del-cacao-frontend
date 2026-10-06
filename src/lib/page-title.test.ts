import { describe, expect, it } from 'vitest';

import { pageTitle } from './page-title';

describe('pageTitle', () => {
  it('names the section and the app', () => {
    expect(pageTitle('Fincas')).toBe('Fincas · Ruta del Cacao');
  });

  it('puts the producer between the section and the app', () => {
    expect(pageTitle('Fincas', 'Ana Pérez')).toBe(
      'Fincas · Ana Pérez · Ruta del Cacao',
    );
  });

  it('is just the app without a section', () => {
    expect(pageTitle()).toBe('Ruta del Cacao');
  });

  it('ignores the producer when there is no section', () => {
    expect(pageTitle(undefined, 'Ana Pérez')).toBe('Ruta del Cacao');
  });
});

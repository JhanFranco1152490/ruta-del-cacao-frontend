import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDocumentTitle } from './use-document-title';

describe('useDocumentTitle', () => {
  it('sets the title of the tab and follows its inputs', () => {
    const { rerender } = renderHook(
      ({ section, producer }) => useDocumentTitle(section, producer),
      {
        initialProps: {
          section: 'Fincas',
          producer: undefined as string | undefined,
        },
      },
    );
    expect(document.title).toBe('Fincas · Ruta del Cacao');

    rerender({ section: 'Fincas', producer: 'Ana Pérez' });
    expect(document.title).toBe('Fincas · Ana Pérez · Ruta del Cacao');

    rerender({ section: 'Usuarios', producer: 'Ana Pérez' });
    expect(document.title).toBe('Usuarios · Ana Pérez · Ruta del Cacao');
  });
});

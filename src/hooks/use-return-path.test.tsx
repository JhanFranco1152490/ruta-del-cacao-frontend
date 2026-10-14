import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBackLink, useReturnPath } from './use-return-path';

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
  search = '';
});

describe('useReturnPath', () => {
  it('goes back to the screen the editor was opened from, with its filters', () => {
    search = `origen=${encodeURIComponent('/parcelas?finca=f1&pagina=3')}`;

    const { result } = renderHook(() => useReturnPath('/fincas'));

    expect(result.current).toBe('/parcelas?finca=f1&pagina=3');
  });

  it('goes to the usual place when it was not opened from a screen', () => {
    const { result } = renderHook(() => useReturnPath('/fincas'));

    expect(result.current).toBe('/fincas');
  });

  it('goes to the usual place when the origin is not a route of the app', () => {
    search = `origen=${encodeURIComponent('https://otro.sitio/fincas')}`;

    const { result } = renderHook(() => useReturnPath('/fincas'));

    expect(result.current).toBe('/fincas');
  });
});

describe('useBackLink', () => {
  const fallback = {
    href: '/fincas/detalle?id=f1',
    label: 'Volver a la finca',
  };

  it('says only «Volver» when it goes back to the screen of origin', () => {
    search = `origen=${encodeURIComponent('/parcelas?pagina=2')}`;

    const { result } = renderHook(() => useBackLink(fallback));

    expect(result.current).toEqual({
      href: '/parcelas?pagina=2',
      label: 'Volver',
    });
  });

  it('keeps its own link and text without an origin', () => {
    const { result } = renderHook(() => useBackLink(fallback));

    expect(result.current).toEqual(fallback);
  });
});

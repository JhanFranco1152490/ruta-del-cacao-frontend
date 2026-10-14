import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReturnPath } from './use-return-path';

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

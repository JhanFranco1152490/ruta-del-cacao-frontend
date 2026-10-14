import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorLink } from './editor-link';

let pathname = '/parcelas';
let search = '';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
  pathname = '/parcelas';
  search = '';
});

const hrefOf = () => screen.getByRole('link').getAttribute('href')!;

describe('EditorLink', () => {
  it('remembers the screen it is opened from, with its filters and page', () => {
    search = 'finca=f1&pagina=3';

    render(
      <EditorLink href="/fincas/parcelas/editar?id=p1">Editar</EditorLink>,
    );

    const url = new URL(hrefOf(), 'http://x');
    expect(url.pathname).toBe('/fincas/parcelas/editar');
    expect(url.searchParams.get('id')).toBe('p1');
    expect(url.searchParams.get('origen')).toBe('/parcelas?finca=f1&pagina=3');
  });

  it('remembers a screen without filters', () => {
    render(<EditorLink href="/productores/nuevo">Registrar</EditorLink>);

    expect(new URL(hrefOf(), 'http://x').searchParams.get('origen')).toBe(
      '/parcelas',
    );
  });

  it('does not remember a screen that is not a section of the app', () => {
    pathname = '/';

    render(<EditorLink href="/productores/nuevo">Registrar</EditorLink>);

    expect(hrefOf()).toBe('/productores/nuevo');
  });
});

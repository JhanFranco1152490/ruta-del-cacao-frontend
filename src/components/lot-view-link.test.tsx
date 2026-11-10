import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LotViewLink } from './lot-view-link';

vi.mock('next/navigation', () => ({
  usePathname: () => '/bodega',
  useSearchParams: () => new URLSearchParams(),
}));

const CODE = '000123-F02-P05-261014-1';

describe('LotViewLink', () => {
  it('links to the lot detail with its code as the name', () => {
    render(<LotViewLink code={CODE} href="/lotes/detalle?id=l1" />);

    const link = screen.getByRole('link', { name: `Ver el lote ${CODE}` });
    expect(link).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/lotes\/detalle\?id=l1/),
    );
  });

  it('is a disabled button that says why when it cannot open', () => {
    render(
      <LotViewLink
        code={CODE}
        disabledReason="Ver el lote necesita conexión."
        href="/lotes/detalle?id=l1"
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: `Ver el lote ${CODE}` });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Ver el lote necesita conexión.');
  });
});

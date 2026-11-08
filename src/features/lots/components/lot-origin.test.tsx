import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildLot } from '@/test/factories';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { LotOrigin } from './lot-origin';

describe('LotOrigin', () => {
  it('says where the lot comes from in a few lines', () => {
    render(<LotOrigin lot={buildLot()} />);

    const origin = screen.getByRole('region', { name: 'Origen' });
    expect(origin).toHaveTextContent('Finca');
    expect(origin).toHaveTextContent('F02 · La Esperanza');
    expect(origin).toHaveTextContent('Recolector');
    expect(origin).toHaveTextContent('Ficha de la parcelaVersión');
  });

  it('links the harvest and the characterization only when it is given where to', () => {
    const { rerender } = render(<LotOrigin lot={buildLot()} />);
    const origin = () => screen.getByRole('region', { name: 'Origen' });
    expect(within(origin()).queryAllByRole('link')).toHaveLength(0);

    rerender(
      <LotOrigin
        harvestHref="/cosechas/detalle?id=h1"
        historyHref="/parcelas/historial?id=p1"
        lot={buildLot()}
      />,
    );

    const hrefs = within(origin())
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toHaveLength(2);
    expect(hrefs[0]).toMatch(/^\/cosechas\/detalle\?id=h1&origen=/);
    expect(hrefs[1]).toMatch(/^\/parcelas\/historial\?id=p1&origen=/);
  });

  it('writes only the title in the ink color and keeps the labels muted', () => {
    render(<LotOrigin lot={buildLot()} />);

    const origin = screen.getByRole('region', { name: 'Origen' });
    expect(within(origin).getByRole('heading', { name: 'Origen' })).toHaveClass(
      'text-foreground',
    );
    expect(within(origin).getByText('Finca')).toHaveClass(
      'text-muted-foreground',
    );
  });

  it('marks an inactive collector', () => {
    const lot = buildLot();
    render(
      <LotOrigin
        lot={{
          ...lot,
          harvest: {
            ...lot.harvest,
            collector: { ...lot.harvest.collector, is_active: false },
          },
        }}
      />,
    );

    expect(screen.getByRole('region', { name: 'Origen' })).toHaveTextContent(
      'Cuenta inactiva',
    );
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FarmGateFromQuery } from './farm-gate-from-query';

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('./farm-gate', () => ({
  FarmGate: ({ id }: { id: string }) => <p>Finca {id}</p>,
}));

describe('FarmGateFromQuery without a farm in the address', () => {
  it('says which farm is missing when nothing else is offered', () => {
    search = '';
    render(<FarmGateFromQuery>{() => null}</FarmGateFromQuery>);

    expect(
      screen.getByText('No se indicó de qué finca es la parcela.'),
    ).toBeVisible();
  });

  it('offers what the page gives instead, such as a way to choose the farm', () => {
    search = '';
    render(
      <FarmGateFromQuery missing={<p>Elige una finca</p>}>
        {() => null}
      </FarmGateFromQuery>,
    );

    expect(screen.getByText('Elige una finca')).toBeVisible();
    expect(
      screen.queryByText('No se indicó de qué finca es la parcela.'),
    ).not.toBeInTheDocument();
  });

  it('opens the farm of the address when there is one', () => {
    search = 'finca=f9';
    render(
      <FarmGateFromQuery missing={<p>Elige una finca</p>}>
        {() => null}
      </FarmGateFromQuery>,
    );

    expect(screen.getByText('Finca f9')).toBeVisible();
  });
});

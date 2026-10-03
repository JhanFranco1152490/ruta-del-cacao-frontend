import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let search = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => search }));
vi.mock('./farm-detail-screen', () => ({
  FarmDetailScreen: ({ id }: { id: string }) => <p>Detalle de {id}</p>,
}));

import { FarmDetailFromQuery } from './farm-detail-from-query';

describe('FarmDetailFromQuery', () => {
  it('opens the detail of the farm in the address', () => {
    search = new URLSearchParams('id=f1');
    render(<FarmDetailFromQuery renderPlots={() => null} />);

    expect(screen.getByText('Detalle de f1')).toBeInTheDocument();
  });

  it('explains that no farm was given', () => {
    search = new URLSearchParams();
    render(<FarmDetailFromQuery renderPlots={() => null} />);

    expect(
      screen.getByText('No se indicó qué finca abrir.'),
    ).toBeInTheDocument();
  });
});

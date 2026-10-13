import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('shows the eyebrow, the title and the description', () => {
    render(
      <PageHeader
        description="Una descripción"
        eyebrow="Sección"
        title="Título"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Título' })).toBeInTheDocument();
    expect(screen.getByText('Sección')).toBeInTheDocument();
    expect(screen.getByText('Una descripción')).toBeInTheDocument();
  });

  it('shows the actions next to the title', () => {
    render(
      <PageHeader
        actions={<button type="button">Crear</button>}
        title="Título"
      />,
    );

    expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument();
  });

  it('has a smaller title when it is compact, and the same content', () => {
    const { rerender } = render(<PageHeader title="Título" />);
    expect(screen.getByRole('heading')).toHaveClass('text-4xl');

    rerender(<PageHeader compact title="Título" />);

    expect(screen.getByRole('heading')).toHaveClass('text-3xl');
    expect(screen.getByRole('heading', { name: 'Título' })).toBeInTheDocument();
  });
});

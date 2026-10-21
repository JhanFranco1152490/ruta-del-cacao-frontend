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

  it('has the same title size on every screen', () => {
    render(<PageHeader eyebrow="Sección" title="Título" />);

    expect(screen.getByRole('heading', { name: 'Título' })).toHaveClass(
      'text-3xl',
    );
  });
});

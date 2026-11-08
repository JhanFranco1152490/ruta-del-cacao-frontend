import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DetailFooter } from './detail-footer';

describe('DetailFooter', () => {
  it('leads back to where the record was opened from', () => {
    render(<DetailFooter backHref="/lotes?estado=dried" />);

    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute(
      'href',
      '/lotes?estado=dried',
    );
  });

  it('puts the actions beside Back by default and in a column when stacked', () => {
    const { container, rerender } = render(
      <DetailFooter backHref="/x">
        <button type="button">Eliminar</button>
      </DetailFooter>,
    );
    expect(container.firstElementChild).toHaveClass('sm:flex-row');

    rerender(
      <DetailFooter backHref="/x" stacked>
        <button type="button">Eliminar</button>
      </DetailFooter>,
    );
    expect(container.firstElementChild).not.toHaveClass('sm:flex-row');
    expect(
      screen.getByRole('button', { name: 'Eliminar' }),
    ).toBeInTheDocument();
  });
});

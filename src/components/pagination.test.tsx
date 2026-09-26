import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './pagination';

const base = { pageSize: 20, label: 'productores', onPageChange: vi.fn() };

describe('Pagination', () => {
  it('renders nothing when everything fits in one page', () => {
    const { container } = render(<Pagination {...base} page={1} total={20} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the total and the current page', () => {
    render(<Pagination {...base} page={2} total={45} />);

    expect(screen.getByText('45 productores encontrados')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('disables the limits and moves one page at a time', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <Pagination {...base} onPageChange={onPageChange} page={1} total={45} />,
    );

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <Pagination {...base} onPageChange={onPageChange} page={3} total={45} />,
    );
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });
});

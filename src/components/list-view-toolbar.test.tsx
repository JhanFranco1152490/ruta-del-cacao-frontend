import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ListViewToolbar } from './list-view-toolbar';

describe('ListViewToolbar', () => {
  it('says how many there are, with the hint on the same line', () => {
    render(<ListViewToolbar count="6 roles encontrados" hint="Un aviso" />);

    expect(screen.getByRole('status')).toHaveTextContent('6 roles encontrados');
    expect(screen.getByText('Un aviso')).toBeInTheDocument();
  });

  it('offers the view choice only when there is a handler for it', async () => {
    const onViewChange = vi.fn();
    const { rerender } = render(
      <ListViewToolbar count="1" onViewChange={onViewChange} view="lista" />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Por productor' }),
    );
    expect(onViewChange).toHaveBeenCalledWith('agrupada');

    rerender(<ListViewToolbar count="1" view="lista" />);
    expect(
      screen.queryByRole('button', { name: 'Por productor' }),
    ).not.toBeInTheDocument();
  });

  it('folds or unfolds every group only in the grouped view', async () => {
    const toggleAll = vi.fn();
    const { rerender } = render(
      <ListViewToolbar
        count="1"
        groups={{ allOpen: true, toggleAll }}
        view="agrupada"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Plegar todo' }));
    expect(toggleAll).toHaveBeenCalled();

    rerender(
      <ListViewToolbar
        count="1"
        groups={{ allOpen: false, toggleAll }}
        view="agrupada"
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Desplegar todo' }),
    ).toBeInTheDocument();

    rerender(
      <ListViewToolbar
        count="1"
        groups={{ allOpen: true, toggleAll }}
        view="lista"
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Plegar todo' }),
    ).not.toBeInTheDocument();
  });
});

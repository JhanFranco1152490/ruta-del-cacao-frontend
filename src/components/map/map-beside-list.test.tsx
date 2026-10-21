import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MapBesideList } from './map-beside-list';

vi.mock('@/hooks/use-is-desktop', () => ({ useIsDesktop: () => true }));

function renderLayout() {
  render(
    <MapBesideList
      list={(visible) => (
        <p>{visible ? 'lista con el mapa al lado' : 'lista a todo el ancho'}</p>
      )}
      map={({ visible, setVisible }) => (
        <button onClick={() => setVisible(!visible)} type="button">
          {visible ? 'Ocultar mapa' : 'Mostrar mapa'}
        </button>
      )}
    />,
  );
}

describe('MapBesideList', () => {
  it('shows the map beside the list on a wide screen', () => {
    renderLayout();

    expect(screen.getByText('lista con el mapa al lado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar mapa' })).toBeVisible();
  });

  it('gives the list the whole width when the map is hidden, with the map bar on top', async () => {
    renderLayout();

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar mapa' }));

    expect(screen.getByText('lista a todo el ancho')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Mostrar mapa' });
    expect(button.parentElement).toHaveClass('order-first');
    expect(button.parentElement?.parentElement).not.toHaveClass(
      'lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]',
    );
  });
});

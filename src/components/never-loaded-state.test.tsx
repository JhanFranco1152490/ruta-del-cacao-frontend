import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NeverLoadedState } from './never-loaded-state';

describe('NeverLoadedState', () => {
  it('asks for a connection once to load what was going to be shown', () => {
    render(<NeverLoadedState subject="las ventas" />);

    expect(
      screen.getByRole('heading', {
        name: 'Necesitas conexión una vez para cargar las ventas.',
      }),
    ).toBeInTheDocument();
  });

  it('says what happens once there is a connection, when it is given', () => {
    render(
      <NeverLoadedState
        description="Abre esta pantalla una vez y quedará guardada."
        subject="la bodega"
      />,
    );

    expect(
      screen.getByText('Abre esta pantalla una vez y quedará guardada.'),
    ).toBeInTheDocument();
  });
});

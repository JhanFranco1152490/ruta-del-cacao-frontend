import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppHeader } from './app-header';

describe('AppHeader', () => {
  it('keeps the product name available to assistive technology at every width', () => {
    render(<AppHeader logoutFailed={false} />);

    // En pantallas muy angostas el nombre se oculta a la vista, pero no del lector de pantalla.
    expect(screen.getByText('Ruta del Cacao')).toHaveClass('sr-only');
  });

  it('links the logo to the panel', () => {
    render(<AppHeader logoutFailed={false} />);

    expect(
      screen.getByRole('link', { name: 'Ruta del Cacao' }),
    ).toHaveAttribute('href', '/panel');
  });

  it('shows the actions it receives', () => {
    render(
      <AppHeader
        logoutFailed={false}
        actions={<button type="button">Acción</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
  });
});

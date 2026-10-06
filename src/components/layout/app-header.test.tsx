import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppHeader } from './app-header';

describe('AppHeader', () => {
  it('keeps the product name available to assistive technology at every width', () => {
    render(<AppHeader logoutFailed={false} />);

    // En pantallas muy angostas el nombre se oculta a la vista, pero no del lector de pantalla.
    const name = screen
      .getByRole('link', { name: 'Ruta del Cacao' })
      .querySelector('span');
    expect(name).toHaveTextContent('Ruta del Cacao');
    expect(name).toHaveClass('sr-only');
  });

  it('links the logo to the entry of the app', () => {
    render(<AppHeader logoutFailed={false} />);

    expect(
      screen.getByRole('link', { name: 'Ruta del Cacao' }),
    ).toHaveAttribute('href', '/');
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

  it('stays at the top while the page scrolls, above the content but below dialogs', () => {
    render(<AppHeader logoutFailed={false} />);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky', 'top-0', 'z-40');
  });
});

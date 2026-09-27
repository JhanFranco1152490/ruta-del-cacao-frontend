import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppHeader } from './app-header';

describe('AppHeader', () => {
  it('keeps the product name available to assistive technology at every width', () => {
    render(
      <AppHeader
        isLoggingOut={false}
        logoutFailed={false}
        onLogout={() => {}}
      />,
    );

    // En pantallas muy angostas el nombre se oculta a la vista, pero no del lector de pantalla.
    expect(screen.getByText('Ruta del Cacao')).toHaveClass('sr-only');
  });

  it('does not let the logout label wrap', () => {
    render(
      <AppHeader
        isLoggingOut={false}
        logoutFailed={false}
        onLogout={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveClass(
      'whitespace-nowrap',
    );
  });
});

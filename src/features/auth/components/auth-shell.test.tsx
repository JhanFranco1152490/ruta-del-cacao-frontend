import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthShell } from './auth-shell';

function renderShell() {
  return render(
    <AuthShell eyebrow="Ingreso" title="Bienvenido" description="">
      <p>contenido</p>
    </AuthShell>,
  );
}

describe('AuthShell', () => {
  it('lets the page grow and scroll when the form is taller than the window', () => {
    // Con alto fijo y `overflow-hidden` el formulario se recortaba arriba y abajo.
    const { container } = renderShell();
    const root = container.firstElementChild!;
    const main = screen.getByRole('main');

    expect(root).toHaveClass('min-h-dvh');
    expect(root).not.toHaveClass('h-dvh');
    expect(root).not.toHaveClass('overflow-hidden');
    expect(main).toHaveClass('min-h-dvh');
    expect(main).not.toHaveClass('h-dvh');
  });

  it('keeps the brand panel the height of the window while the page scrolls', () => {
    const { container } = renderShell();

    expect(container.querySelector('aside')).toHaveClass(
      'lg:sticky',
      'lg:top-0',
      'lg:h-dvh',
    );
  });

  it('renders the title and the content', () => {
    renderShell();

    expect(
      screen.getByRole('heading', { name: 'Bienvenido' }),
    ).toBeInTheDocument();
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });
});

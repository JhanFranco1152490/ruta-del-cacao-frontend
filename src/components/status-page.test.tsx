import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusPage } from './status-page';

describe('StatusPage', () => {
  it('says what happened with a heading and offers the actions', () => {
    const { container } = render(
      <StatusPage
        actions={<button type="button">Ir al inicio</button>}
        description="Puede que el enlace esté mal escrito."
        eyebrow="Página no encontrada"
        title="Esta dirección no existe"
      />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Esta dirección no existe',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Puede que el enlace esté mal escrito.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeVisible();
    // La ilustración es decorativa: no la anuncia el lector de pantalla.
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppShell } from './app-shell';

function renderShell() {
  return render(
    <AppShell header={<header>Cabecera</header>} sidebar={<p>Menú</p>}>
      <p>Contenido de la página</p>
    </AppShell>,
  );
}

describe('AppShell', () => {
  it('renders the header, the sidebar and the content', () => {
    renderShell();

    expect(screen.getByText('Cabecera')).toBeInTheDocument();
    expect(screen.getByText('Menú')).toBeInTheDocument();
    expect(screen.getByText('Contenido de la página')).toBeInTheDocument();
  });

  it('has a single main landmark that holds the content', () => {
    renderShell();

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(
      within(mains[0]).getByText('Contenido de la página'),
    ).toBeInTheDocument();
  });

  it('offers a skip link that points at the main landmark', () => {
    renderShell();

    const skip = screen.getByRole('link', { name: 'Saltar al contenido' });
    const target = skip.getAttribute('href')?.replace('#', '');
    expect(target).toBeTruthy();
    expect(screen.getByRole('main')).toHaveAttribute('id', target);
  });
});

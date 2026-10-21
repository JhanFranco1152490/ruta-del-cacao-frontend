import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Sheet, SheetContent } from '@/components/ui/sheet';

import {
  SidePanelActions,
  SidePanelHeader,
  SidePanelSection,
} from './side-panel';

function renderInSheet(band: boolean) {
  render(
    <Sheet open>
      <SheetContent>
        <SidePanelHeader
          band={band}
          description="Una descripción"
          title="Crear algo"
        />
        <SidePanelSection title="Datos">
          <p>contenido</p>
        </SidePanelSection>
        <SidePanelActions>
          <button type="submit">Guardar</button>
          <button type="button">Cancelar</button>
        </SidePanelActions>
      </SheetContent>
    </Sheet>,
  );
}

describe('side panel', () => {
  it('shows the title and its description in a band', () => {
    renderInSheet(true);

    const title = screen.getByText('Crear algo');
    expect(title.parentElement).toHaveClass('bg-selva');
    expect(title.parentElement).toHaveAttribute('data-band');
    expect(screen.getByText('Una descripción')).toBeInTheDocument();
  });

  it('keeps the header only for screen readers when the record brings its own band', () => {
    renderInSheet(false);

    expect(screen.getByText('Crear algo').parentElement).toHaveClass('sr-only');
  });

  it('titles each section and keeps the actions together at the bottom', () => {
    renderInSheet(true);

    expect(
      screen.getByRole('heading', { name: 'Datos', level: 3 }),
    ).toBeInTheDocument();
    const actions = screen.getByRole('button', {
      name: 'Guardar',
    }).parentElement;
    expect(actions).toHaveClass('sticky', 'bottom-0');
    expect(actions).toContainElement(
      screen.getByRole('button', { name: 'Cancelar' }),
    );
  });
});

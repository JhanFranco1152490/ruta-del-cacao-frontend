import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';

function renderSheet(side?: 'left' | 'right') {
  return render(
    <Sheet>
      <SheetTrigger>Abrir</SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Menú</SheetTitle>
          <SheetDescription>Secciones de la aplicación</SheetDescription>
        </SheetHeader>
        <a href="/panel">Panel</a>
      </SheetContent>
    </Sheet>,
  );
}

describe('Sheet', () => {
  it('opens from its trigger with the title as accessible name', async () => {
    renderSheet();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(await screen.findByRole('dialog', { name: 'Menú' })).toBeVisible();
  });

  it('closes with Escape and gives the focus back to the trigger', async () => {
    renderSheet();
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(trigger);
    await screen.findByRole('dialog');

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it('closes from its close button', async () => {
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await screen.findByRole('dialog');

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('closes when the backdrop is pressed', async () => {
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await screen.findByRole('dialog');

    const backdrop = document.querySelector('[data-slot="dialog-overlay"]');
    expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop as Element);

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('enters from the requested side', async () => {
    renderSheet('left');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(await screen.findByRole('dialog')).toHaveAttribute(
      'data-side',
      'left',
    );
  });

  it('enters from the right by default', async () => {
    renderSheet();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(await screen.findByRole('dialog')).toHaveAttribute(
      'data-side',
      'right',
    );
  });
});

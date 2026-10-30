import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notify } from '@/lib/notify';

import { Toaster } from './toaster';

const NOTICE_MS = 5000;
const WITH_ACTION_MS = 8000;

function fire(callback: () => void) {
  act(() => {
    callback();
  });
}

// Con relojes falsos no se usa `waitFor`: se avanza el tiempo y se mira.
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

// El botón de cerrar queda fuera del árbol de accesibilidad hasta que se enfoca o se despliega el
// grupo: el aviso ya se anunció por su región.
// Se busca por su atributo: con `aria-hidden`, su nombre accesible se calcula vacío.
const buttonLabelled = (label: string) =>
  screen
    .getAllByRole('button', { hidden: true })
    .find((button) => button.getAttribute('aria-label') === label)!;
const closeButton = () => buttonLabelled('Cerrar aviso');

describe('Toaster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(<Toaster />);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the title and the description of a notice', () => {
    fire(() =>
      notify.success('Finca guardada', { description: 'Ya está en la lista.' }),
    );

    expect(screen.getByText('Finca guardada')).toBeInTheDocument();
    expect(screen.getByText('Ya está en la lista.')).toBeInTheDocument();
  });

  it('closes a success notice by itself after five seconds', async () => {
    fire(() => notify.success('Finca guardada'));

    await advance(NOTICE_MS - 500);
    expect(screen.getByText('Finca guardada')).toBeInTheDocument();
    await advance(1000);

    expect(screen.queryByText('Finca guardada')).not.toBeInTheDocument();
  });

  it('keeps a notice with an action for eight seconds and runs the action', async () => {
    const onClick = vi.fn();
    fire(() =>
      notify.success('Actividad programada', {
        action: { label: 'Ver octubre', onClick },
      }),
    );

    await advance(NOTICE_MS + 1000);
    expect(screen.getByText('Actividad programada')).toBeInTheDocument();
    expect(screen.getByText('Actividad programada')).toBeInTheDocument();

    await advance(WITH_ACTION_MS);

    expect(screen.queryByText('Actividad programada')).not.toBeInTheDocument();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('runs the action and closes the notice when it is pressed', async () => {
    const onClick = vi.fn();
    fire(() =>
      notify.success('Actividad programada', {
        action: { label: 'Ver octubre', onClick },
      }),
    );

    act(() => {
      screen.getByRole('button', { name: 'Ver octubre' }).click();
    });
    await advance(500);

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByText('Actividad programada')).not.toBeInTheDocument();
  });

  it('never closes an error by itself', async () => {
    fire(() => notify.error('No se pudo desactivar'));

    await advance(10 * 60 * 1000);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo desactivar',
    );
  });

  it('keeps a persistent warning until it is closed, and announces it as an alert', async () => {
    fire(() =>
      notify.warning('Bitácora guardada · Sobresecado', { persistent: true }),
    );

    await advance(10 * 60 * 1000);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bitácora guardada · Sobresecado',
    );
  });

  it('keeps the line breaks of a description', () => {
    fire(() =>
      notify.warning('Volteo 3 guardado', { description: 'Uno\nDos' }),
    );

    expect(screen.getByText(/Uno/)).toHaveClass('whitespace-pre-line');
  });

  it('announces an error as an alert, apart from the notice', () => {
    fire(() => notify.error('No se pudo desactivar'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo desactivar',
    );
    expect(screen.getByRole('alertdialog', { hidden: true })).toHaveTextContent(
      'No se pudo desactivar',
    );
  });

  it('announces a success politely, from a live region', () => {
    fire(() => notify.success('Finca guardada'));

    expect(screen.getByRole('region')).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: /Finca guardada/ }),
    ).toBeInTheDocument();
  });

  it('closes with its button', async () => {
    fire(() => notify.error('No se pudo desactivar'));

    act(() => {
      closeButton().click();
    });
    await advance(500);

    expect(screen.queryByRole('alertdialog', { hidden: true })).toBeNull();
  });

  it('shows three at a time and sets the oldest aside', () => {
    fire(() => {
      for (const title of ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco']) {
        notify.info(title);
      }
    });

    expect(
      document.querySelectorAll('[data-slot="toast"]:not([data-limited])'),
    ).toHaveLength(3);
    expect(
      document.querySelectorAll('[data-slot="toast"][data-limited]'),
    ).toHaveLength(2);
  });

  it('holds the time while the pointer is over it', async () => {
    fire(() => notify.success('Finca guardada'));
    const viewport = document.querySelector('[data-slot="toast-viewport"]')!;

    act(() => {
      viewport.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      viewport.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    });
    await advance(NOTICE_MS * 3);

    expect(screen.getByText('Finca guardada')).toBeInTheDocument();
  });

  it('has buttons of at least 44 px', () => {
    fire(() =>
      notify.success('Actividad programada', {
        action: { label: 'Ver octubre', onClick: () => {} },
      }),
    );

    expect(closeButton().className).toMatch(/\bsize-11\b/);
    expect(
      screen.getByRole('button', { name: 'Ver octubre' }).className,
    ).toMatch(/\bmin-h-11\b/);
  });
});

describe('Toaster without fake timers', () => {
  it('can be closed with Escape from the keyboard', async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => {
      notify.error('No se pudo desactivar');
    });

    await user.tab();
    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('alertdialog', { hidden: true }),
      ).not.toBeInTheDocument(),
    );
  });
});

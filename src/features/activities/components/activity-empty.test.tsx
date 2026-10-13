import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ActivityEmpty, ActivityEmptyNote } from './activity-empty';

describe('ActivityEmpty', () => {
  it('says there is nothing in the period and offers to schedule', async () => {
    const onSchedule = vi.fn();
    render(
      <ActivityEmpty
        filtered={false}
        offline={false}
        onClear={vi.fn()}
        onSchedule={onSchedule}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'No hay actividades programadas en este periodo',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /Programar actividad/ }),
    );
    expect(onSchedule).toHaveBeenCalledTimes(1);
  });

  it('does not offer to schedule without the permission', () => {
    render(
      <ActivityEmpty filtered={false} offline={false} onClear={vi.fn()} />,
    );

    expect(
      screen.queryByRole('button', { name: /Programar actividad/ }),
    ).not.toBeInTheDocument();
  });

  it('says scheduling needs a connection when it is offline', () => {
    render(
      <ActivityEmpty
        filtered={false}
        offline
        onClear={vi.fn()}
        onSchedule={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Programar actividad/ }),
    ).toBeDisabled();
    expect(
      screen.getByText('Programar una actividad necesita conexión.'),
    ).toBeInTheDocument();
  });

  it('says no activity meets the filters and offers to clear them', async () => {
    const onClear = vi.fn();
    render(
      <ActivityEmpty
        filtered
        offline={false}
        onClear={onClear}
        onSchedule={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Ninguna actividad cumple los filtros',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Programar actividad/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    );
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('ActivityEmptyNote', () => {
  it('says in one line that the period has no activities', () => {
    render(<ActivityEmptyNote filtered={false} onClear={vi.fn()} />);

    expect(
      screen.getByText('No hay actividades programadas en este periodo.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('says the filters leave nothing and offers to clear them', async () => {
    const onClear = vi.fn();
    render(<ActivityEmptyNote filtered onClear={onClear} />);

    expect(
      screen.getByText('Ninguna actividad cumple los filtros.'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    );
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

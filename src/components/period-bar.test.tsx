import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PeriodBar } from './period-bar';

function setup(isCurrent = false) {
  const handlers = {
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
  };
  render(
    <PeriodBar
      isCurrent={isCurrent}
      nextLabel="Semana siguiente"
      previousLabel="Semana anterior"
      title="12 al 18 de octubre"
      {...handlers}
    />,
  );
  return handlers;
}

describe('PeriodBar', () => {
  it('shows the period it is on', () => {
    setup();

    expect(
      screen.getByRole('heading', { name: '12 al 18 de octubre' }),
    ).toBeInTheDocument();
  });

  it('goes to the previous and next period and back to today', async () => {
    const handlers = setup();

    await userEvent.click(
      screen.getByRole('button', { name: 'Semana anterior' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Semana siguiente' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));

    expect(handlers.onPrevious).toHaveBeenCalledTimes(1);
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
    expect(handlers.onToday).toHaveBeenCalledTimes(1);
  });

  it('disables Today when it is already on the current period', () => {
    setup(true);

    expect(screen.getByRole('button', { name: 'Hoy' })).toBeDisabled();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ActivityPendingDays } from './activity-pending-days';

describe('ActivityPendingDays', () => {
  it('offers the days that can be asked for and marks the chosen one', () => {
    render(<ActivityPendingDays days={30} onDays={vi.fn()} />);

    expect(
      screen.getByRole('group', { name: 'Mirar hacia adelante, en días' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['7', '14', '30', '60', '90']);
    expect(screen.getByRole('button', { name: '30' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '14' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reports the days that the person chooses as a number', async () => {
    const onDays = vi.fn();
    render(<ActivityPendingDays days={14} onDays={onDays} />);

    await userEvent.click(screen.getByRole('button', { name: '60' }));

    expect(onDays).toHaveBeenCalledWith(60);
  });

  it('says in words what the numbers are', () => {
    render(<ActivityPendingDays days={14} onDays={vi.fn()} />);

    expect(screen.getByText('Mirar hacia adelante')).toBeInTheDocument();
    expect(screen.getByText('días')).toBeInTheDocument();
  });
});

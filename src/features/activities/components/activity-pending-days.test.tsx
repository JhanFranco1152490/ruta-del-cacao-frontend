import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ActivityPendingDays } from './activity-pending-days';

describe('ActivityPendingDays', () => {
  it('offers the days that can be asked for and shows the chosen one', () => {
    render(<ActivityPendingDays days={30} onDays={vi.fn()} />);

    const select = screen.getByLabelText('Mirar hacia adelante');
    expect(select).toHaveValue('30');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['7 días', '14 días', '30 días', '60 días', '90 días']);
  });

  it('reports the days that the person chooses as a number', async () => {
    const onDays = vi.fn();
    render(<ActivityPendingDays days={14} onDays={onDays} />);

    await userEvent.selectOptions(
      screen.getByLabelText('Mirar hacia adelante'),
      '60',
    );

    expect(onDays).toHaveBeenCalledWith(60);
  });
});

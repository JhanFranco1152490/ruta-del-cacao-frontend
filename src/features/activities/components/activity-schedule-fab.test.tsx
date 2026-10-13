import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ActivityScheduleFab } from './activity-schedule-fab';

describe('ActivityScheduleFab', () => {
  it('is a button named after what it does, since it only has an icon', async () => {
    const onClick = vi.fn();
    render(<ActivityScheduleFab offline={false} onClick={onClick} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Programar actividad' }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('Programar una actividad necesita conexión.'),
    ).not.toBeInTheDocument();
  });

  it('is closed without a connection and says why', () => {
    render(<ActivityScheduleFab offline onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Programar actividad' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      'Programar una actividad necesita conexión.',
    );
  });
});

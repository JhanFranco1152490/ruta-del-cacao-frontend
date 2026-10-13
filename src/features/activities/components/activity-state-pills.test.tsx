import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ActivityStatePills } from './activity-state-pills';

const COUNTS = { scheduled: 2, delayed: 1, overdue: 3, done: 0 };

describe('ActivityStatePills', () => {
  it('counts the activities of the period in each state', () => {
    render(
      <ActivityStatePills
        counts={COUNTS}
        onState={vi.fn()}
        state={null}
        total={6}
      />,
    );

    const group = screen.getByRole('group', { name: 'Estados del periodo' });
    expect(group).toBeInTheDocument();
    const pill = (name: string) =>
      screen.getByRole('button', { name: new RegExp(name) });
    expect(pill('Programada')).toHaveTextContent('2');
    expect(pill('Retrasada')).toHaveTextContent('1');
    expect(pill('Vencida')).toHaveTextContent('3');
    expect(pill('Realizada')).toHaveTextContent('0');
    expect(screen.getByText('6 actividades')).toBeInTheDocument();
  });

  it('counts a single activity in the singular', () => {
    render(
      <ActivityStatePills
        counts={{ scheduled: 1, delayed: 0, overdue: 0, done: 0 }}
        onState={vi.fn()}
        state={null}
        total={1}
      />,
    );

    expect(screen.getByText('1 actividad')).toBeInTheDocument();
  });

  it('applies the filter of the state that is touched', async () => {
    const onState = vi.fn();
    render(
      <ActivityStatePills
        counts={COUNTS}
        onState={onState}
        state={null}
        total={6}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Vencida/ }));

    expect(onState).toHaveBeenCalledWith('overdue');
  });

  it('takes the filter off when the same state is touched again', async () => {
    const onState = vi.fn();
    render(
      <ActivityStatePills
        counts={COUNTS}
        onState={onState}
        state="overdue"
        total={6}
      />,
    );
    const active = screen.getByRole('button', { name: /Vencida/ });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Realizada/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await userEvent.click(active);

    expect(onState).toHaveBeenCalledWith(null);
  });
});

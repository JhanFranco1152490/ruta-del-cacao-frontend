import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { toActivityOfDay } from '../activity-days';
import { ActivityDayAgenda } from './activity-day-agenda';

const items = [
  toActivityOfDay(
    buildAgriculturalActivity({ id: 'a', scheduled_date: '2026-10-22' }),
    '2026-10-22',
  ),
];

describe('ActivityDayAgenda', () => {
  it('names the day and counts its activities in the singular', () => {
    render(
      <ActivityDayAgenda
        date="2026-10-22"
        isToday={false}
        items={items}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'jueves 22 de octubre' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 actividad')).toBeInTheDocument();
    expect(screen.queryByText('Hoy')).not.toBeInTheDocument();
  });

  it('says that the day has nothing and lists nothing', () => {
    render(
      <ActivityDayAgenda
        date="2026-10-24"
        isToday={false}
        items={[]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Sin actividades este día')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('offers to schedule only when it is given the way to do it', async () => {
    const onSchedule = vi.fn();
    const { rerender } = render(
      <ActivityDayAgenda
        date="2026-10-24"
        isToday={false}
        items={[]}
        onSchedule={onSchedule}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Programar' }));
    expect(onSchedule).toHaveBeenCalledWith('2026-10-24');

    rerender(
      <ActivityDayAgenda
        date="2026-10-24"
        isToday={false}
        items={[]}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Programar' }),
    ).not.toBeInTheDocument();
  });
});

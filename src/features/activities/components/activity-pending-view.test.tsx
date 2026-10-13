import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { toActivityOfDay } from '../activity-days';
import { groupPendingActivities } from '../activity-pending';
import { ActivityPendingView } from './activity-pending-view';

const TODAY = '2026-10-22';

const groupsOf = (dates: Record<string, string>, days = 14) =>
  groupPendingActivities(
    Object.entries(dates).map(([id, scheduled_date]) =>
      toActivityOfDay(buildAgriculturalActivity({ id, scheduled_date }), TODAY),
    ),
    TODAY,
    days,
  );

describe('ActivityPendingView', () => {
  it('shows the groups that have activities, most urgent first, each with its count', () => {
    render(
      <ActivityPendingView
        days={14}
        groups={groupsOf({
          up: '2026-10-30',
          late: '2026-10-21',
          old: '2026-03-02',
          old2: '2026-04-02',
        })}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent),
    ).toEqual(['Vencidas 2', 'Retrasadas 1', 'Próximos 14 días 1']);
  });

  it('lists the oldest overdue first, with how late it is', () => {
    render(
      <ActivityPendingView
        days={14}
        groups={groupsOf({ b: '2026-09-01', a: '2026-03-02' })}
        onSelect={vi.fn()}
      />,
    );

    const section = screen.getByRole('region', { name: /Vencidas/ });
    const buttons = within(section).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Vencida · 234 días');
    expect(buttons[1]).toHaveTextContent('Vencida · 51 días');
  });

  it('opens the detail of the activity that is touched', async () => {
    const onSelect = vi.fn();
    render(
      <ActivityPendingView
        days={14}
        groups={groupsOf({ a: '2026-10-21' })}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /Fertilización/ }),
    );

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: expect.objectContaining({ id: 'a' }),
      }),
    );
  });

  it('says everything is up to date when nothing is pending', () => {
    render(
      <ActivityPendingView
        days={14}
        groups={groupsOf({})}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Todo al día' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('names the days in the group and in the message of all up to date', () => {
    render(
      <ActivityPendingView
        days={30}
        groups={groupsOf({ a: '2026-11-15' }, 30)}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Próximos 30 días 1' }),
    ).toBeInTheDocument();
  });
});

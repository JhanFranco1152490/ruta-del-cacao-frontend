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
        onDays={vi.fn()}
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
        onDays={vi.fn()}
        groups={groupsOf({ b: '2026-09-01', a: '2026-03-02' })}
        onSelect={vi.fn()}
      />,
    );

    const section = screen.getByRole('region', { name: /Vencidas/ });
    const buttons = within(section).getAllByRole('button', {
      name: /Fertilización/,
    });
    expect(buttons[0]).toHaveTextContent('Vencida · 234 días');
    expect(buttons[1]).toHaveTextContent('Vencida · 51 días');
  });

  it('opens the detail of the activity that is touched', async () => {
    const onSelect = vi.fn();
    render(
      <ActivityPendingView
        days={14}
        onDays={vi.fn()}
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
        onDays={vi.fn()}
        groups={groupsOf({})}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Todo al día' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Fertilización/ }),
    ).not.toBeInTheDocument();
  });

  it('names the days in the group and in the message of all up to date', () => {
    render(
      <ActivityPendingView
        days={30}
        onDays={vi.fn()}
        groups={groupsOf({ a: '2026-11-15' }, 30)}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Próximos 30 días 1' }),
    ).toBeInTheDocument();
  });

  describe('the days to look ahead', () => {
    const row = (name: string | RegExp) =>
      screen.getByRole('heading', { name }).parentElement!;

    it('are chosen on the row of the title of the first group', () => {
      render(
        <ActivityPendingView
          days={14}
          groups={groupsOf({ today: TODAY, old: '2026-03-02' })}
          onDays={vi.fn()}
          onSelect={vi.fn()}
        />,
      );

      expect(
        within(row('Vencidas 1')).getByRole('group', {
          name: 'Mirar hacia adelante, en días',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole('group', { name: 'Mirar hacia adelante, en días' }),
      ).toHaveLength(1);
    });

    it('stay on the first group that is shown, whichever it is', () => {
      render(
        <ActivityPendingView
          days={14}
          groups={groupsOf({ soon: '2026-10-30' })}
          onDays={vi.fn()}
          onSelect={vi.fn()}
        />,
      );

      expect(
        within(row('Próximos 14 días 1')).getByRole('group', {
          name: 'Mirar hacia adelante, en días',
        }),
      ).toBeInTheDocument();
    });

    it('stay above the message when all is up to date', () => {
      render(
        <ActivityPendingView
          days={14}
          groups={groupsOf({})}
          onDays={vi.fn()}
          onSelect={vi.fn()}
        />,
      );

      const control = screen.getByRole('group', {
        name: 'Mirar hacia adelante, en días',
      });
      const message = screen.getByRole('heading', { name: 'Todo al día' });
      expect(
        Boolean(
          control.compareDocumentPosition(message) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ).toBe(true);
    });

    it('report the days that the person chooses', async () => {
      const onDays = vi.fn();
      render(
        <ActivityPendingView
          days={14}
          groups={groupsOf({ today: TODAY })}
          onDays={onDays}
          onSelect={vi.fn()}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: '60' }));

      expect(onDays).toHaveBeenCalledWith(60);
    });
  });
});

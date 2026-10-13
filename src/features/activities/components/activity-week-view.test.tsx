import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { groupActivitiesByDay } from '../activity-days';
import { ActivityWeekView } from './activity-week-view';

const TODAY = '2026-10-22';

function setup(
  activities = [buildAgriculturalActivity({ scheduled_date: '2026-10-21' })],
  week = '2026-10-19',
  canSchedule = false,
) {
  const onSelect = vi.fn();
  const onScheduleDay = vi.fn();
  render(
    <ActivityWeekView
      days={groupActivitiesByDay(activities, TODAY)}
      onScheduleDay={canSchedule ? onScheduleDay : undefined}
      onSelect={onSelect}
      today={TODAY}
      week={week}
    />,
  );
  return { onSelect, onScheduleDay };
}

describe('ActivityWeekView', () => {
  it('shows the seven days of the week, also the empty ones', () => {
    setup();

    const region = screen.getByRole('region', {
      name: 'Semana del 19 al 25 de octubre',
    });
    const days = within(region).getAllByRole('heading', { level: 3 });
    expect(days.map((day) => day.textContent)).toEqual([
      'lunes 19 de octubre',
      'martes 20 de octubre',
      'miércoles 21 de octubre',
      'jueves 22 de octubre',
      'viernes 23 de octubre',
      'sábado 24 de octubre',
      'domingo 25 de octubre',
    ]);
    expect(within(region).getAllByText('Sin actividades')).toHaveLength(6);
  });

  it('puts every activity of the day under it, without cutting them', () => {
    const activities = ['a', 'b', 'c', 'd', 'e'].map((id) =>
      buildAgriculturalActivity({ id, scheduled_date: '2026-10-21' }),
    );
    setup(activities);

    const day = screen
      .getByRole('heading', { name: 'miércoles 21 de octubre' })
      .closest('li')!;
    expect(within(day).getAllByRole('button')).toHaveLength(5);
  });

  it('marks today', () => {
    setup();

    const today = screen
      .getByRole('heading', { name: 'jueves 22 de octubre' })
      .closest('li')!;
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(within(today).getByText('Hoy')).toBeInTheDocument();
  });

  it('opens the detail of the chip that is touched', async () => {
    const { onSelect } = setup();

    await userEvent.click(
      screen.getByRole('button', { name: /Fertilización/ }),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('names the week across two months', () => {
    setup([], '2026-10-26');

    expect(
      screen.getByRole('region', {
        name: 'Semana del 26 de octubre al 1 de noviembre',
      }),
    ).toBeInTheDocument();
  });

  describe('scheduling on a day', () => {
    it('offers it from today on and reports the day', async () => {
      const { onScheduleDay } = setup(undefined, undefined, true);

      await userEvent.click(
        screen.getByRole('button', {
          name: 'Programar una actividad el viernes 23 de octubre',
        }),
      );

      expect(onScheduleDay).toHaveBeenCalledWith('2026-10-23');
      expect(
        screen.getByRole('button', {
          name: 'Programar una actividad el jueves 22 de octubre',
        }),
      ).toBeInTheDocument();
    });

    it('does not offer it for the days that already passed', () => {
      setup(undefined, undefined, true);

      expect(
        screen.queryByRole('button', {
          name: 'Programar una actividad el miércoles 21 de octubre',
        }),
      ).not.toBeInTheDocument();
    });

    it('offers nothing without permission or connection', () => {
      setup();

      expect(
        screen.queryByRole('button', { name: /Programar una actividad/ }),
      ).not.toBeInTheDocument();
    });
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { groupActivitiesByDay } from '../activity-days';
import { ActivityMonthGrid } from './activity-month-grid';

// Jueves 22 de octubre de 2026.
const TODAY = '2026-10-22';

const activity = (id: string, scheduled_date: string, extra = {}) =>
  buildAgriculturalActivity({ id, scheduled_date, ...extra });

function setup(
  activities = [activity('a', '2026-10-22')],
  {
    month = '2026-10',
    canSchedule = false,
    withKeyboard = false,
    focusDate = undefined as string | undefined,
  } = {},
) {
  const onSelect = vi.fn();
  const onOpenDay = vi.fn();
  const onScheduleDay = vi.fn();
  const onCross = vi.fn();
  const onFocusHandled = vi.fn();
  render(
    <ActivityMonthGrid
      keyboard={
        withKeyboard ? { onCross, focusDate, onFocusHandled } : undefined
      }
      onScheduleDay={canSchedule ? onScheduleDay : undefined}
      days={groupActivitiesByDay(activities, TODAY)}
      month={month}
      onOpenDay={onOpenDay}
      onSelect={onSelect}
      today={TODAY}
    />,
  );
  return { onSelect, onOpenDay, onScheduleDay, onCross, onFocusHandled };
}

const cell = (name: RegExp | string) => screen.getByRole('gridcell', { name });

describe('ActivityMonthGrid', () => {
  it('is a grid of the month with the week from Monday to Sunday', () => {
    setup();

    expect(
      screen.getByRole('grid', { name: 'Calendario de octubre de 2026' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
    // El encabezado más las cinco semanas de octubre de 2026.
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getAllByRole('gridcell')).toHaveLength(35);
  });

  it('names each day with its date and how many activities it has', () => {
    setup([activity('a', '2026-10-22'), activity('b', '2026-10-22')]);

    expect(
      cell('jueves 22 de octubre, hoy, 2 actividades'),
    ).toBeInTheDocument();
    expect(cell('viernes 23 de octubre, sin actividades')).toBeInTheDocument();
  });

  it('marks today', () => {
    setup();

    expect(cell(/22 de octubre/)).toHaveAttribute('aria-current', 'date');
    expect(within(cell(/22 de octubre/)).getByText('Hoy')).toBeInTheDocument();
  });

  it('shows the chips of each day with their state', () => {
    setup([activity('a', '2026-10-22'), activity('b', '2026-10-20')]);

    const today = within(cell(/22 de octubre/));
    expect(today.getByText('Programada')).toBeInTheDocument();
    expect(
      within(cell(/20 de octubre/)).getByText('Retrasada · 2 días'),
    ).toBeInTheDocument();
  });

  it('shows at most three chips and says how many more there are', async () => {
    const { onOpenDay } = setup(
      ['a', 'b', 'c', 'd', 'e'].map((id) => activity(id, '2026-10-13')),
    );
    const day = within(cell(/13 de octubre/));

    expect(day.getAllByText('P03')).toHaveLength(3);
    await userEvent.click(day.getByRole('button', { name: '+2 más' }));

    expect(onOpenDay).toHaveBeenCalledWith('2026-10-13');
  });

  it('does not offer "more" when everything fits', () => {
    setup(['a', 'b', 'c'].map((id) => activity(id, '2026-10-13')));

    expect(
      screen.queryByRole('button', { name: /más/ }),
    ).not.toBeInTheDocument();
  });

  it('opens the detail of the chip that is touched', async () => {
    const { onSelect } = setup();

    await userEvent.click(
      within(cell(/22 de octubre/)).getByRole('button', { hidden: true }),
    );

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: expect.objectContaining({ id: 'a' }),
      }),
    );
  });

  it('shows the days of the neighbor months dimmed and without chips', () => {
    // El 1 de noviembre cae en la última semana de la cuadrícula de octubre.
    setup([activity('n', '2026-11-01'), activity('s', '2026-09-30')]);

    expect(screen.queryByText('Fertilización')).not.toBeInTheDocument();
    const neighbor = cell(/1 de noviembre/);
    expect(neighbor).toHaveAttribute('aria-disabled', 'true');
  });

  describe('scheduling on a day', () => {
    it('schedules when an empty day is touched', async () => {
      const { onScheduleDay } = setup(undefined, { canSchedule: true });

      await userEvent.click(cell(/viernes 23 de octubre/));

      expect(onScheduleDay).toHaveBeenCalledWith('2026-10-23');
    });

    it('offers the plus of each day from today on, also on days with activities', async () => {
      const { onScheduleDay } = setup(undefined, { canSchedule: true });

      await userEvent.click(
        within(cell(/22 de octubre/)).getByRole('button', {
          name: 'Programar una actividad el jueves 22 de octubre',
          hidden: true,
        }),
      );

      expect(onScheduleDay).toHaveBeenCalledWith('2026-10-22');
      expect(
        screen.queryByRole('button', {
          name: 'Programar una actividad el miércoles 21 de octubre',
          hidden: true,
        }),
      ).not.toBeInTheDocument();
    });

    it('does not offer it for a day of another month', () => {
      setup(undefined, { canSchedule: true });

      expect(
        within(cell(/1 de noviembre/)).queryByRole('button', { hidden: true }),
      ).not.toBeInTheDocument();
    });

    it('does not open the day with activities when it is touched, only its chips do', async () => {
      const { onScheduleDay } = setup(undefined, { canSchedule: true });

      await userEvent.click(cell(/22 de octubre/));

      expect(onScheduleDay).not.toHaveBeenCalled();
    });

    it('offers nothing without permission or connection', async () => {
      const { onScheduleDay } = setup();

      await userEvent.click(cell(/viernes 23 de octubre/));

      expect(onScheduleDay).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('button', {
          name: /Programar una actividad/,
          hidden: true,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('with the keyboard', () => {
    it('has a single tab stop, on today', () => {
      setup();

      const stops = screen
        .getAllByRole('gridcell')
        .filter((item) => item.getAttribute('tabindex') === '0');
      expect(stops).toEqual([cell(/22 de octubre/)]);
    });

    it('starts on the first day when today is in another month', () => {
      setup([], { month: '2026-12' });

      expect(cell(/^\S+ 1 de diciembre/)).toHaveAttribute('tabindex', '0');
    });

    it('moves by day and by week with the arrows', async () => {
      setup();
      cell(/22 de octubre/).focus();

      await userEvent.keyboard('{ArrowRight}');
      expect(cell(/23 de octubre/)).toHaveFocus();
      await userEvent.keyboard('{ArrowDown}');
      expect(cell(/30 de octubre/)).toHaveFocus();
      await userEvent.keyboard('{ArrowLeft}');
      expect(cell(/29 de octubre/)).toHaveFocus();
      await userEvent.keyboard('{ArrowUp}');
      expect(cell(/22 de octubre/)).toHaveFocus();
    });

    it('goes to the start and end of the week with Home and End', async () => {
      setup();
      cell(/22 de octubre/).focus();

      await userEvent.keyboard('{End}');
      expect(cell(/25 de octubre/)).toHaveFocus();
      await userEvent.keyboard('{Home}');
      expect(cell(/19 de octubre/)).toHaveFocus();
    });

    it('stays where it is at the edge of the month when nothing handles the crossing', async () => {
      setup();
      cell(/31 de octubre/).focus();

      await userEvent.keyboard('{ArrowRight}');

      expect(cell(/31 de octubre/)).toHaveFocus();
    });

    it('moves inside the month without asking to cross', async () => {
      const { onCross } = setup(undefined, { withKeyboard: true });
      cell(/29 de octubre/).focus();

      await userEvent.keyboard('{ArrowRight}');

      expect(cell(/30 de octubre/)).toHaveFocus();
      expect(onCross).not.toHaveBeenCalled();
    });

    it('asks for the next month when an arrow leaves the end of this one', async () => {
      const { onCross } = setup(undefined, { withKeyboard: true });
      cell(/31 de octubre/).focus();

      await userEvent.keyboard('{ArrowRight}');
      expect(onCross).toHaveBeenLastCalledWith('2026-11-01');

      cell(/29 de octubre/).focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(onCross).toHaveBeenLastCalledWith('2026-11-05');
    });

    it('asks for the previous month when an arrow leaves the start of this one', async () => {
      const { onCross } = setup(undefined, { withKeyboard: true });
      cell(/^\S+ 1 de octubre/).focus();

      await userEvent.keyboard('{ArrowLeft}');
      expect(onCross).toHaveBeenLastCalledWith('2026-09-30');

      cell(/^\S+ 2 de octubre/).focus();
      await userEvent.keyboard('{ArrowUp}');
      expect(onCross).toHaveBeenLastCalledWith('2026-09-25');
    });

    it('never changes the month with Home and End', async () => {
      const { onCross } = setup(undefined, { withKeyboard: true });
      cell(/^\S+ 1 de octubre/).focus();

      await userEvent.keyboard('{Home}');
      cell(/31 de octubre/).focus();
      await userEvent.keyboard('{End}');

      expect(onCross).not.toHaveBeenCalled();
      expect(cell(/31 de octubre/)).toHaveFocus();
    });

    it('gives the focus to the day that a crossing asked for, once, when its month is in sight', () => {
      const { onFocusHandled } = setup(undefined, {
        withKeyboard: true,
        focusDate: '2026-10-05',
      });

      expect(cell(/lunes 5 de octubre/)).toHaveFocus();
      expect(onFocusHandled).toHaveBeenCalledTimes(1);
    });

    it('waits when the day it asked for belongs to another month', () => {
      const { onFocusHandled } = setup(undefined, {
        withKeyboard: true,
        focusDate: '2026-11-03',
      });

      expect(onFocusHandled).not.toHaveBeenCalled();
    });

    it('opens the list of the day with Enter when it has activities', async () => {
      const { onOpenDay } = setup();
      cell(/22 de octubre/).focus();

      await userEvent.keyboard('{Enter}');

      expect(onOpenDay).toHaveBeenCalledWith('2026-10-22');
    });

    it('does nothing with Enter on a day without activities when it cannot schedule', async () => {
      const { onOpenDay, onScheduleDay } = setup();
      cell(/23 de octubre/).focus();

      await userEvent.keyboard('{Enter}');

      expect(onOpenDay).not.toHaveBeenCalled();
      expect(onScheduleDay).not.toHaveBeenCalled();
    });

    it('schedules on an empty day with Enter', async () => {
      const { onScheduleDay } = setup(undefined, { canSchedule: true });
      cell(/23 de octubre/).focus();

      await userEvent.keyboard('{Enter}');

      expect(onScheduleDay).toHaveBeenCalledWith('2026-10-23');
    });

    it('does not schedule on a day that already passed with Enter', async () => {
      const { onScheduleDay } = setup(undefined, { canSchedule: true });
      cell(/21 de octubre/).focus();

      await userEvent.keyboard('{Enter}');

      expect(onScheduleDay).not.toHaveBeenCalled();
    });
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { groupActivitiesByDay } from '../activity-days';
import { ActivityMonthCompact } from './activity-month-compact';

// Jueves 22 de octubre de 2026.
const TODAY = '2026-10-22';

const activity = (id: string, scheduled_date: string, extra = {}) =>
  buildAgriculturalActivity({ id, scheduled_date, ...extra });

function setup({
  activities = [activity('a', '2026-10-22')],
  selectedDate = TODAY,
  canSchedule = false,
  month = '2026-10',
} = {}) {
  const onSelectDate = vi.fn();
  const onSelect = vi.fn();
  const onScheduleDay = vi.fn();
  const onCross = vi.fn();
  render(
    <ActivityMonthCompact
      keyboard={{ onCross, onFocusHandled: vi.fn() }}
      days={groupActivitiesByDay(activities, TODAY)}
      month={month}
      onScheduleDay={canSchedule ? onScheduleDay : undefined}
      onSelect={onSelect}
      onSelectDate={onSelectDate}
      selectedDate={selectedDate}
      today={TODAY}
    />,
  );
  return { onSelectDate, onSelect, onScheduleDay, onCross };
}

const cell = (name: RegExp | string) => screen.getByRole('gridcell', { name });

describe('ActivityMonthCompact', () => {
  it('is a grid of the whole month with the week from Monday to Sunday', () => {
    setup();

    expect(
      screen.getByRole('grid', { name: 'Calendario de octubre de 2026' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
    expect(screen.getAllByRole('gridcell')).toHaveLength(35);
  });

  it('names each day with its date, how many activities it has and in which state', () => {
    setup({
      activities: [
        activity('a', '2026-10-13'),
        activity('b', '2026-10-13'),
        activity('c', '2026-10-13', {
          status: 'done',
          state: 'done',
          done_date: '2026-10-13',
        }),
      ],
    });

    expect(
      cell('martes 13 de octubre, 3 actividades: 2 vencidas, 1 realizada'),
    ).toBeInTheDocument();
    expect(cell('viernes 23 de octubre, sin actividades')).toBeInTheDocument();
  });

  it('marks today and the chosen day', () => {
    setup({ selectedDate: '2026-10-05' });

    expect(cell(/22 de octubre/)).toHaveAttribute('aria-current', 'date');
    expect(cell(/lunes 5 de octubre/)).toHaveAttribute('aria-selected', 'true');
    expect(cell(/22 de octubre/)).toHaveAttribute('aria-selected', 'false');
  });

  it('shows one marker for each activity of the day, at most three, and how many more', () => {
    setup({
      activities: ['a', 'b', 'c', 'd', 'e'].map((id) =>
        activity(id, '2026-10-26'),
      ),
    });

    const day = cell(/lunes 26 de octubre/);
    expect(day.querySelectorAll('svg')).toHaveLength(3);
    expect(within(day).getByText('+2')).toBeInTheDocument();
  });

  it('shows the most urgent states first when they do not all fit', () => {
    setup({
      activities: [
        activity('a', '2026-10-13', {
          status: 'done',
          state: 'done',
          done_date: '2026-10-13',
        }),
        activity('b', '2026-10-13'),
      ],
    });

    const icons = [...cell(/13 de octubre/).querySelectorAll('svg')].map(
      (icon) => icon.getAttribute('class') ?? '',
    );
    expect(icons[0]).toContain('text-err');
    expect(icons[1]).toContain('text-ok');
  });

  it('chooses a day when it is touched', async () => {
    const { onSelectDate } = setup();

    await userEvent.click(cell(/viernes 23 de octubre/));

    expect(onSelectDate).toHaveBeenCalledWith('2026-10-23');
  });

  it('does not choose a day of another month', async () => {
    const { onSelectDate } = setup();

    await userEvent.click(cell(/1 de noviembre/));

    expect(onSelectDate).not.toHaveBeenCalled();
    expect(cell(/1 de noviembre/)).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows no markers on the days of other months', () => {
    setup({ activities: [activity('n', '2026-11-01')] });

    expect(cell(/1 de noviembre/).querySelectorAll('svg')).toHaveLength(0);
  });

  describe('the agenda of the chosen day', () => {
    it('lists the activities of that day', () => {
      setup({
        activities: [
          activity('a', '2026-10-22'),
          activity('b', '2026-10-22', { activity_type: 'irrigation' }),
          activity('c', '2026-10-23'),
        ],
      });

      const agenda = screen.getByRole('region', {
        name: /jueves 22 de octubre/,
      });
      expect(within(agenda).getByText('2 actividades')).toBeInTheDocument();
      expect(within(agenda).getAllByRole('button')).toHaveLength(2);
      expect(within(agenda).getByText('Hoy')).toBeInTheDocument();
    });

    it('says the day has nothing', () => {
      setup({ selectedDate: '2026-10-24' });

      expect(screen.getByText('Sin actividades este día')).toBeInTheDocument();
    });

    it('opens the detail of the activity that is touched', async () => {
      const { onSelect } = setup();
      const agenda = screen.getByRole('region', { name: /jueves 22/ });

      await userEvent.click(within(agenda).getByRole('button'));

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          activity: expect.objectContaining({ id: 'a' }),
        }),
      );
    });

    it('offers to schedule on the chosen day', async () => {
      const { onScheduleDay } = setup({ canSchedule: true });

      await userEvent.click(screen.getByRole('button', { name: 'Programar' }));

      expect(onScheduleDay).toHaveBeenCalledWith('2026-10-22');
    });

    it('does not offer it for a day that already passed', () => {
      setup({ canSchedule: true, selectedDate: '2026-10-10' });

      expect(
        screen.queryByRole('button', { name: 'Programar' }),
      ).not.toBeInTheDocument();
    });

    it('does not offer it without permission or connection', () => {
      setup();

      expect(
        screen.queryByRole('button', { name: 'Programar' }),
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

    it('moves by day and by week with the arrows', async () => {
      setup();
      cell(/22 de octubre/).focus();

      await userEvent.keyboard('{ArrowRight}');
      expect(cell(/23 de octubre/)).toHaveFocus();
      await userEvent.keyboard('{ArrowDown}');
      expect(cell(/30 de octubre/)).toHaveFocus();
    });

    it('asks for the next or the previous month at the edges of this one', async () => {
      const { onCross } = setup();
      cell(/31 de octubre/).focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(onCross).toHaveBeenLastCalledWith('2026-11-01');

      cell(/^\S+ 1 de octubre/).focus();
      await userEvent.keyboard('{ArrowLeft}');
      expect(onCross).toHaveBeenLastCalledWith('2026-09-30');
    });

    it('chooses the day with Enter', async () => {
      const { onSelectDate } = setup();
      cell(/23 de octubre/).focus();

      await userEvent.keyboard('{Enter}');

      expect(onSelectDate).toHaveBeenCalledWith('2026-10-23');
    });
  });
});

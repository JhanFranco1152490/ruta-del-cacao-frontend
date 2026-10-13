import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { toActivityOfDay } from '../activity-days';
import { groupActivitiesByPlot } from '../activity-plots';
import { ActivityPlotTable } from './activity-plot-table';

const TODAY = '2026-10-22';

const plotOf = (id: string, code: string, farm: string, farmName: string) => ({
  id,
  code,
  is_active: true,
  farm: { id: farm, name: farmName, is_active: true },
});
const norte01 = plotOf('p1', 'P-01', 'f1', 'Finca Norte');
const norte02 = plotOf('p2', 'P-02', 'f1', 'Finca Norte');
const sur01 = plotOf('p3', 'P-01', 'f2', 'Finca Sur');

const item = (
  id: string,
  plot: ReturnType<typeof plotOf>,
  scheduled_date: string,
  extra = {},
) =>
  toActivityOfDay(
    buildAgriculturalActivity({ id, plot, scheduled_date, ...extra }),
    TODAY,
  );

function setup(
  items = [item('a', norte01, '2026-10-22')],
  canSchedule = false,
) {
  const onSelect = vi.fn();
  const onOpenDay = vi.fn();
  const onSchedule = vi.fn();
  render(
    <ActivityPlotTable
      farms={groupActivitiesByPlot(items)}
      month="2026-10"
      onOpenDay={onOpenDay}
      onSchedule={canSchedule ? onSchedule : undefined}
      onSelect={onSelect}
      today={TODAY}
    />,
  );
  return { onSelect, onOpenDay, onSchedule };
}

describe('ActivityPlotTable', () => {
  it('is a table with a column per day of the month and a row per plot', () => {
    setup([
      item('a', norte01, '2026-10-05'),
      item('b', norte02, '2026-10-06'),
      item('c', sur01, '2026-10-07'),
    ]);

    const table = screen.getByRole('table', {
      name: 'Actividades por parcela, octubre de 2026',
    });
    // La columna de la parcela y los 31 días de octubre.
    expect(within(table).getAllByRole('columnheader')).toHaveLength(32);
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((header) => header.textContent),
    ).toEqual(['Finca Norte', 'P-01', 'P-02', 'Finca Sur', 'P-01']);
  });

  it('puts the marker of each activity in the column of its day', () => {
    setup([item('a', norte01, '2026-10-05')]);

    const row = screen.getByRole('row', { name: /P-01/ });
    const cells = within(row).getAllByRole('cell');
    // Una celda por día; el 5 de octubre es la quinta.
    expect(cells).toHaveLength(31);
    expect(
      within(cells[4]).getByRole('button', {
        name: 'Fertilización, parcela P-01, lunes 5 de octubre, Vencida · 17 días',
      }),
    ).toBeInTheDocument();
    expect(within(cells[5]).queryByRole('button')).not.toBeInTheDocument();
  });

  it('says the state in text and not only with the icon', () => {
    setup();

    const marker = screen.getByRole('button');
    expect(marker).toHaveAccessibleName(expect.stringContaining('Programada'));
  });

  it('opens the detail of the marker that is touched', async () => {
    const { onSelect } = setup();

    await userEvent.click(screen.getByRole('button'));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: expect.objectContaining({ id: 'a' }),
      }),
    );
  });

  it('opens the list of the day of that plot when there are several', async () => {
    const { onOpenDay } = setup([
      item('a', norte01, '2026-10-22'),
      item('b', norte01, '2026-10-22', { activity_type: 'irrigation' }),
    ]);

    await userEvent.click(
      screen.getByRole('button', { name: /2 actividades/ }),
    );

    expect(onOpenDay).toHaveBeenCalledWith('2026-10-22', 'p1');
  });

  it('reports the most urgent state when a day has several', () => {
    setup([
      item('c', norte01, '2026-10-10'),
      item('d', norte01, '2026-10-10', {
        activity_type: 'pruning',
        status: 'done',
        state: 'done',
        done_date: '2026-10-10',
      }),
    ]);

    expect(
      screen.getByRole('button', {
        name: '2 actividades, parcela P-01, sábado 10 de octubre, la más urgente: Vencida · 12 días',
      }),
    ).toBeInTheDocument();
  });

  it('marks the column of today', () => {
    setup();

    expect(
      screen.getByRole('columnheader', { name: /jueves 22/ }),
    ).toHaveAttribute('aria-current', 'date');
  });

  describe('scheduling on an empty day of a plot', () => {
    const cellOf = (plot: string, day: number) =>
      within(screen.getByRole('row', { name: new RegExp(plot) })).getAllByRole(
        'cell',
      )[day - 1];

    it('schedules in that plot and on that day', async () => {
      const { onSchedule } = setup(undefined, true);

      await userEvent.click(cellOf('P-01', 28));

      expect(onSchedule).toHaveBeenCalledWith('2026-10-28', 'f1', 'p1');
    });

    it('does not offer it on a day that already has an activity', async () => {
      const { onSchedule } = setup(undefined, true);

      await userEvent.click(cellOf('P-01', 22));

      expect(onSchedule).not.toHaveBeenCalled();
    });

    it('does not offer it on a day that already passed', async () => {
      const { onSchedule } = setup(undefined, true);

      await userEvent.click(cellOf('P-01', 10));

      expect(onSchedule).not.toHaveBeenCalled();
    });

    it('does not offer it for an inactive plot', async () => {
      const inactive = { ...norte01, is_active: false };
      const { onSchedule } = setup([item('a', inactive, '2026-10-05')], true);

      await userEvent.click(cellOf('P-01', 28));

      expect(onSchedule).not.toHaveBeenCalled();
    });

    it('offers nothing without permission or connection', async () => {
      const { onSchedule } = setup();

      await userEvent.click(cellOf('P-01', 28));

      expect(onSchedule).not.toHaveBeenCalled();
    });
  });
});

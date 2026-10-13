import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { toActivityOfDay } from '../activity-days';
import { groupActivitiesByPlot } from '../activity-plots';
import { ActivityPlotCards } from './activity-plot-cards';

const TODAY = '2026-10-22';

const plotOf = (id: string, code: string, farm: string, farmName: string) => ({
  id,
  code,
  is_active: true,
  farm: { id: farm, name: farmName, is_active: true },
});

const items = [
  toActivityOfDay(
    buildAgriculturalActivity({
      id: 'a',
      plot: plotOf('p1', 'P-01', 'f1', 'Finca Norte'),
      scheduled_date: '2026-10-25',
    }),
    TODAY,
  ),
  toActivityOfDay(
    buildAgriculturalActivity({
      id: 'b',
      plot: plotOf('p1', 'P-01', 'f1', 'Finca Norte'),
      scheduled_date: '2026-10-27',
      activity_type: 'irrigation',
    }),
    TODAY,
  ),
  toActivityOfDay(
    buildAgriculturalActivity({
      id: 'c',
      plot: plotOf('p2', 'P-02', 'f2', 'Finca Sur'),
      scheduled_date: '2026-10-26',
    }),
    TODAY,
  ),
];

describe('ActivityPlotCards', () => {
  it('has a card per plot under its farm, with how many activities it has', () => {
    render(
      <ActivityPlotCards
        farms={groupActivitiesByPlot(items)}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent),
    ).toEqual(['Finca Norte', 'Finca Sur']);
    const first = screen.getByRole('article', { name: /P-01/ });
    expect(within(first).getByText('2 actividades')).toBeInTheDocument();
    expect(
      within(screen.getByRole('article', { name: /P-02/ })).getByText(
        '1 actividad',
      ),
    ).toBeInTheDocument();
  });

  it('lists the activities of the plot from the earliest', () => {
    render(
      <ActivityPlotCards
        farms={groupActivitiesByPlot(items)}
        onSelect={vi.fn()}
      />,
    );

    const first = screen.getByRole('article', { name: /P-01/ });
    expect(
      within(first)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining('Fertilización'),
      expect.stringContaining('Riego'),
    ]);
  });

  it('opens the detail of the activity that is touched', async () => {
    const onSelect = vi.fn();
    render(
      <ActivityPlotCards
        farms={groupActivitiesByPlot(items)}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Riego/ }));

    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });
});

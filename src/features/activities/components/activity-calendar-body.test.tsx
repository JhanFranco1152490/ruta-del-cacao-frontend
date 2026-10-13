import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';
import { renderWithProviders } from '@/test/render';

import { type ActivityOfDay, toActivityOfDay } from '../activity-days';
import type { ActivityView } from '../activity-view';
import { ActivityCalendarBody } from './activity-calendar-body';

const TODAY = '2026-10-22';

const itemOf = (id: string, scheduled_date: string) =>
  toActivityOfDay(buildAgriculturalActivity({ id, scheduled_date }), TODAY);

type Options = {
  canScheduleDay?: boolean;
  pendingDays?: number;
  selectedDay?: string;
  view?: ActivityView;
  isDesktop?: boolean;
  items?: ActivityOfDay[];
  hasFilters?: boolean;
  unfilteredCount?: number;
  canSchedule?: boolean;
};

function setup(options: Options = {}) {
  const {
    view = 'lista',
    isDesktop = false,
    items = [itemOf('a', '2026-10-23')],
    hasFilters = false,
    unfilteredCount = items.length,
    canSchedule = true,
    canScheduleDay = false,
    pendingDays = 14,
    selectedDay = TODAY,
  } = options;
  const handlers = {
    onSelect: vi.fn(),
    onOpenDay: vi.fn(),
    onClear: vi.fn(),
    onSchedule: vi.fn(),
    onScheduleDay: vi.fn(),
    onSelectDay: vi.fn(),
    onPendingDays: vi.fn(),
  };
  renderWithProviders(
    <ActivityCalendarBody
      canSchedule={canSchedule}
      hasFilters={hasFilters}
      isDesktop={isDesktop}
      items={items}
      month="2026-10"
      offline={false}
      pendingDays={pendingDays}
      selectedDay={selectedDay}
      today={TODAY}
      unfilteredCount={unfilteredCount}
      view={view}
      week="2026-10-19"
      {...handlers}
      onScheduleDay={canScheduleDay ? handlers.onScheduleDay : undefined}
    />,
  );
  return handlers;
}

describe('ActivityCalendarBody', () => {
  it('shows the list by days in the list view', () => {
    setup({ view: 'lista' });

    expect(
      screen.getByRole('region', { name: 'viernes 23 de octubre' }),
    ).toBeInTheDocument();
  });

  it('shows the grid of the month in a desktop and the list in a phone', () => {
    setup({ view: 'mes', isDesktop: true });
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('shows a compact month with the agenda of the chosen day in a phone', () => {
    setup({ view: 'mes', isDesktop: false, selectedDay: '2026-10-23' });

    expect(
      screen.getByRole('grid', { name: 'Calendario de octubre de 2026' }),
    ).toBeInTheDocument();
    const agenda = screen.getByRole('region', {
      name: /viernes 23 de octubre/,
    });
    expect(within(agenda).getAllByRole('button')).toHaveLength(1);
  });

  it('keeps the compact month when it is empty, with the note', () => {
    setup({ view: 'mes', isDesktop: false, items: [] });

    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(
      screen.getByText('No hay actividades programadas en este periodo.'),
    ).toBeInTheDocument();
  });

  it('chooses a day of the compact month', async () => {
    const { onSelectDay } = setup({ view: 'mes', isDesktop: false });

    await userEvent.click(
      screen.getByRole('gridcell', { name: /sábado 24 de octubre/ }),
    );

    expect(onSelectDay).toHaveBeenCalledWith('2026-10-24');
  });

  it('schedules from the agenda of the chosen day', async () => {
    const { onScheduleDay } = setup({
      view: 'mes',
      isDesktop: false,
      canScheduleDay: true,
      selectedDay: '2026-10-24',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Programar' }));

    expect(onScheduleDay).toHaveBeenCalledWith('2026-10-24');
  });

  it('keeps the month grid when it is empty, with a note instead of a sign', () => {
    setup({ view: 'mes', isDesktop: true, items: [] });

    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(
      screen.getByText('No hay actividades programadas en este periodo.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: 'No hay actividades programadas en este periodo',
      }),
    ).not.toBeInTheDocument();
  });

  it('keeps the month grid when the filters leave nothing and offers to clear them', async () => {
    const { onClear } = setup({
      view: 'mes',
      isDesktop: true,
      items: [],
      hasFilters: true,
      unfilteredCount: 3,
    });

    expect(screen.getByRole('grid')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    );
    expect(onClear).toHaveBeenCalled();
  });

  it('schedules from an empty day of the month grid', async () => {
    const { onScheduleDay } = setup({
      view: 'mes',
      isDesktop: true,
      items: [],
      canScheduleDay: true,
    });

    await userEvent.click(
      screen.getByRole('gridcell', { name: /viernes 23 de octubre/ }),
    );

    expect(onScheduleDay).toHaveBeenCalledWith('2026-10-23');
  });

  it('schedules from a day of the week', async () => {
    const { onScheduleDay } = setup({
      view: 'semana',
      items: [],
      canScheduleDay: true,
    });

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Programar una actividad el sábado 24 de octubre',
      }),
    );

    expect(onScheduleDay).toHaveBeenCalledWith('2026-10-24');
  });

  it('schedules from an empty day of a plot, with its farm and plot', async () => {
    const { onScheduleDay } = setup({
      view: 'parcela',
      isDesktop: true,
      canScheduleDay: true,
    });

    const row = screen.getByRole('row', { name: /P-03/ });
    await userEvent.click(within(row).getAllByRole('cell')[27]);

    expect(onScheduleDay).toHaveBeenCalledWith('2026-10-28', 'f1', 'pl1');
  });

  it('shows the week with its empty days', () => {
    setup({ view: 'semana', items: [] });

    expect(
      screen.getByRole('region', { name: 'Semana del 19 al 25 de octubre' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Sin actividades')).toHaveLength(7);
  });

  it('shows the table by plot in a desktop and the cards in a phone', () => {
    setup({ view: 'parcela', isDesktop: true });
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('turns the table into cards in a phone', () => {
    setup({ view: 'parcela', isDesktop: false });

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: /P-03/ })).toBeInTheDocument();
  });

  it('shows what is pending by urgency', () => {
    setup({ view: 'pendientes', items: [itemOf('a', '2026-10-10')] });

    expect(
      screen.getByRole('heading', { name: 'Vencidas 1' }),
    ).toBeInTheDocument();
  });

  it('counts the days ahead that the person chose', () => {
    setup({
      view: 'pendientes',
      pendingDays: 30,
      items: [itemOf('a', '2026-11-15')],
    });

    expect(
      screen.getByRole('heading', { name: 'Próximos 30 días 1' }),
    ).toBeInTheDocument();
  });

  it('reports the days that the person chooses in the pending view', async () => {
    const { onPendingDays } = setup({ view: 'pendientes', items: [] });

    await userEvent.click(screen.getByRole('button', { name: '90' }));

    expect(onPendingDays).toHaveBeenCalledWith(90);
  });

  it.each(['lista', 'parcela'] as const)(
    'says the period has no activities in the %s view and offers to schedule',
    async (view) => {
      const { onSchedule } = setup({ view, items: [] });

      expect(
        screen.getByRole('heading', {
          name: 'No hay actividades programadas en este periodo',
        }),
      ).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: /Programar actividad/ }),
      );
      expect(onSchedule).toHaveBeenCalled();
    },
  );

  it('does not offer to schedule without the permission', () => {
    setup({ items: [], canSchedule: false });

    expect(
      screen.queryByRole('button', { name: /Programar actividad/ }),
    ).not.toBeInTheDocument();
  });

  it('says the filters leave nothing and offers to clear them', async () => {
    const { onClear } = setup({
      items: [],
      hasFilters: true,
      unfilteredCount: 4,
    });

    expect(
      screen.getByRole('heading', {
        name: 'Ninguna actividad cumple los filtros',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    );
    expect(onClear).toHaveBeenCalled();
  });

  it('does not blame the filters when there was nothing to begin with', () => {
    setup({ items: [], hasFilters: true, unfilteredCount: 0 });

    expect(
      screen.getByRole('heading', {
        name: 'No hay actividades programadas en este periodo',
      }),
    ).toBeInTheDocument();
  });

  it('blames the filters in the pending view too, instead of saying all is up to date', () => {
    setup({
      view: 'pendientes',
      items: [],
      hasFilters: true,
      unfilteredCount: 2,
    });

    expect(
      screen.getByRole('heading', {
        name: 'Ninguna actividad cumple los filtros',
      }),
    ).toBeInTheDocument();
  });

  it('says all is up to date when nothing is pending', () => {
    setup({ view: 'pendientes', items: [] });

    expect(
      screen.getByRole('heading', { name: 'Todo al día' }),
    ).toBeInTheDocument();
  });

  it('reports the activity that is touched', async () => {
    const { onSelect } = setup();

    await userEvent.click(
      screen.getByRole('button', { name: /Fertilización/ }),
    );

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: expect.objectContaining({ id: 'a' }),
      }),
    );
  });
});

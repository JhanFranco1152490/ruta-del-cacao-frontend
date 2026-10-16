import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { groupActivitiesByDay, toActivityOfDay } from './activity-days';
import {
  applyActivityFilters,
  applyFiltersToDays,
  assigneeOptionsOf,
  farmOptionsOf,
  hasActivityFilters,
  NO_ACTIVITY_FILTERS,
  plotOptionsOf,
} from './activity-filters';

const TODAY = '2026-10-22';

const plotOf = (id: string, code: string, farm = 'f1', isActive = true) => ({
  id,
  code,
  name: null,
  is_active: isActive,
  farm: { id: farm, code: 'F01', name: `Finca ${farm}`, is_active: true },
});

const item = (
  overrides: Parameters<typeof buildAgriculturalActivity>[0] = {},
  completion?: 'pending' | 'error',
) =>
  toActivityOfDay(
    buildAgriculturalActivity(overrides),
    TODAY,
    completion ? new Map([[overrides.id ?? 'a1', completion]]) : undefined,
  );

describe('applyActivityFilters', () => {
  const items = [
    item({ id: 'a', plot: plotOf('p1', 'P-01'), scheduled_date: '2026-10-23' }),
    item({
      id: 'b',
      plot: plotOf('p2', 'P-02'),
      scheduled_date: '2026-10-21',
      assignee: { id: 'u2', full_name: 'Luis', is_active: true },
    }),
    item({
      id: 'c',
      plot: plotOf('p1', 'P-01'),
      scheduled_date: '2026-10-10',
      assignee: { id: 'u2', full_name: 'Luis', is_active: true },
    }),
    item({
      id: 'd',
      plot: plotOf('p2', 'P-02'),
      scheduled_date: '2026-10-05',
      status: 'done',
      state: 'done',
      done_date: '2026-10-05',
    }),
  ];
  const ids = (list: ReturnType<typeof applyActivityFilters>) =>
    list.map(({ activity }) => activity.id);

  it('keeps everything without filters', () => {
    expect(ids(applyActivityFilters(items, NO_ACTIVITY_FILTERS))).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('filters by plot', () => {
    const filters = { ...NO_ACTIVITY_FILTERS, plot: 'p1' };
    expect(ids(applyActivityFilters(items, filters))).toEqual(['a', 'c']);
  });

  it('filters by farm', () => {
    const farmed = [
      item({ id: 'n', plot: plotOf('p1', 'P-01', 'f1') }),
      item({ id: 's', plot: plotOf('p9', 'P-01', 'f2') }),
    ];

    expect(
      ids(applyActivityFilters(farmed, { ...NO_ACTIVITY_FILTERS, farm: 'f2' })),
    ).toEqual(['s']);
  });

  it('filters by state with the state computed today', () => {
    expect(
      ids(
        applyActivityFilters(items, {
          ...NO_ACTIVITY_FILTERS,
          state: 'delayed',
        }),
      ),
    ).toEqual(['b']);
    expect(
      ids(
        applyActivityFilters(items, {
          ...NO_ACTIVITY_FILTERS,
          state: 'overdue',
        }),
      ),
    ).toEqual(['c']);
    expect(
      ids(
        applyActivityFilters(items, { ...NO_ACTIVITY_FILTERS, state: 'done' }),
      ),
    ).toEqual(['d']);
  });

  it('filters by assignee', () => {
    const filters = { ...NO_ACTIVITY_FILTERS, assignee: 'u2' };
    expect(ids(applyActivityFilters(items, filters))).toEqual(['b', 'c']);
  });

  it('combines the filters', () => {
    const filters = {
      farm: 'f1',
      plot: 'p1',
      state: 'overdue' as const,
      assignee: 'u2',
    };
    expect(ids(applyActivityFilters(items, filters))).toEqual(['c']);
    expect(
      ids(applyActivityFilters(items, { ...filters, plot: 'p2' })),
    ).toEqual([]);
  });

  it('counts as done an activity whose completion waits to be sent', () => {
    const waiting = item({ id: 'w', scheduled_date: '2026-10-25' }, 'pending');
    const rejected = item({ id: 'r', scheduled_date: '2026-10-25' }, 'error');
    const done = { ...NO_ACTIVITY_FILTERS, state: 'done' as const };
    const scheduled = { ...NO_ACTIVITY_FILTERS, state: 'scheduled' as const };

    expect(ids(applyActivityFilters([waiting, rejected], done))).toEqual(['w']);
    expect(ids(applyActivityFilters([waiting, rejected], scheduled))).toEqual([
      'r',
    ]);
  });
});

describe('applyFiltersToDays', () => {
  it('filters each day and drops the days that end up empty', () => {
    const days = groupActivitiesByDay(
      [
        buildAgriculturalActivity({
          id: 'a',
          plot: plotOf('p1', 'P-01'),
          scheduled_date: '2026-10-23',
        }),
        buildAgriculturalActivity({
          id: 'b',
          plot: plotOf('p2', 'P-02'),
          scheduled_date: '2026-10-23',
        }),
        buildAgriculturalActivity({
          id: 'c',
          plot: plotOf('p2', 'P-02'),
          scheduled_date: '2026-10-24',
        }),
      ],
      TODAY,
    );

    const filtered = applyFiltersToDays(days, {
      ...NO_ACTIVITY_FILTERS,
      plot: 'p1',
    });

    expect(filtered.map(({ date }) => date)).toEqual(['2026-10-23']);
    expect(filtered[0].activities.map(({ activity }) => activity.id)).toEqual([
      'a',
    ]);
  });
});

describe('hasActivityFilters', () => {
  it('is true as soon as one filter is set', () => {
    expect(hasActivityFilters(NO_ACTIVITY_FILTERS)).toBe(false);
    expect(hasActivityFilters({ ...NO_ACTIVITY_FILTERS, farm: 'f1' })).toBe(
      true,
    );
    expect(hasActivityFilters({ ...NO_ACTIVITY_FILTERS, plot: 'p1' })).toBe(
      true,
    );
    expect(hasActivityFilters({ ...NO_ACTIVITY_FILTERS, state: 'done' })).toBe(
      true,
    );
    expect(hasActivityFilters({ ...NO_ACTIVITY_FILTERS, assignee: 'u1' })).toBe(
      true,
    );
  });
});

describe('farmOptionsOf', () => {
  it('lists each farm once, by name', () => {
    expect(
      farmOptionsOf([
        buildAgriculturalActivity({
          id: 'a',
          plot: plotOf('p1', 'P-01', 'fb'),
        }),
        buildAgriculturalActivity({
          id: 'b',
          plot: plotOf('p2', 'P-02', 'fa'),
        }),
        buildAgriculturalActivity({
          id: 'c',
          plot: plotOf('p3', 'P03', 'fa'),
        }),
      ]),
    ).toEqual([
      { id: 'fa', code: 'F01', name: 'Finca fa' },
      { id: 'fb', code: 'F01', name: 'Finca fb' },
    ]);
  });

  it('is empty without activities', () => {
    expect(farmOptionsOf([])).toEqual([]);
  });
});

describe('plotOptionsOf', () => {
  it('groups the plots by farm, sorted by farm name and plot code, once each', () => {
    const groups = plotOptionsOf([
      buildAgriculturalActivity({ id: 'a', plot: plotOf('p3', 'P-10', 'fb') }),
      buildAgriculturalActivity({ id: 'b', plot: plotOf('p2', 'P-02', 'fa') }),
      buildAgriculturalActivity({ id: 'c', plot: plotOf('p1', 'P-01', 'fa') }),
      buildAgriculturalActivity({ id: 'd', plot: plotOf('p1', 'P-01', 'fa') }),
    ]);

    expect(groups.map(({ farmName }) => farmName)).toEqual([
      'F01 · Finca fa',
      'F01 · Finca fb',
    ]);
    expect(groups[0].plots.map(({ code }) => code)).toEqual(['P-01', 'P-02']);
    expect(groups[1].plots.map(({ id }) => id)).toEqual(['p3']);
  });

  it('keeps the inactive plots, marked', () => {
    const [group] = plotOptionsOf([
      buildAgriculturalActivity({ plot: plotOf('p1', 'P-01', 'f1', false) }),
    ]);

    expect(group.plots[0]).toMatchObject({ id: 'p1', isActive: false });
  });

  it('is empty without activities', () => {
    expect(plotOptionsOf([])).toEqual([]);
  });
});

describe('assigneeOptionsOf', () => {
  it('sorts by name and marks the inactive accounts', () => {
    expect(
      assigneeOptionsOf([
        { id: 'u2', full_name: 'Luis', is_active: false },
        { id: 'u1', full_name: 'Ana', is_active: true },
      ]),
    ).toEqual([
      { id: 'u1', label: 'Ana' },
      { id: 'u2', label: 'Luis (cuenta inactiva)' },
    ]);
  });
});

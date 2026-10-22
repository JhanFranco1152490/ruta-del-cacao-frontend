import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { toActivityOfDay } from './activity-days';
import { NO_ACTIVITY_FILTERS } from './activity-filters';
import { calendarAssigneeOptions, filterCalendar } from './calendar-filtering';

const TODAY = '2026-10-22';
const ana = { id: 'u1', full_name: 'Ana Ruiz', is_active: true };
const luis = { id: 'u2', full_name: 'Luis Peña', is_active: false };

const items = [
  toActivityOfDay(
    buildAgriculturalActivity({
      id: 'late',
      scheduled_date: '2026-10-10',
      assignee: ana,
    }),
    TODAY,
  ),
  toActivityOfDay(
    buildAgriculturalActivity({
      id: 'next',
      scheduled_date: '2026-10-30',
      assignee: luis,
    }),
    TODAY,
  ),
];

describe('filterCalendar', () => {
  it('counts every state even when one of them is chosen', () => {
    const filters = { ...NO_ACTIVITY_FILTERS, state: items[1].state };

    const result = filterCalendar(items, filters, 'mes');

    expect(result.filtered.map(({ activity }) => activity.id)).toEqual([
      'next',
    ]);
    expect(result.summary.total).toBe(2);
    expect(result.filtersSet).toBe(true);
    expect(result.barFiltersSet).toBe(0);
  });

  it('ignores a state left in the address on Pendientes', () => {
    const filters = { ...NO_ACTIVITY_FILTERS, state: items[1].state };

    const result = filterCalendar(items, filters, 'pendientes');

    expect(result.filtered).toHaveLength(2);
    expect(result.filtersSet).toBe(false);
  });

  it('counts the filters of the bar', () => {
    const filters = { ...NO_ACTIVITY_FILTERS, farm: 'f1', assignee: 'u1' };

    expect(filterCalendar(items, filters, 'mes').barFiltersSet).toBe(2);
  });
});

describe('calendarAssigneeOptions', () => {
  it('joins the listed accounts with whoever appears in the activities, once each', () => {
    const options = calendarAssigneeOptions(
      [ana],
      items.map(({ activity }) => activity),
    );

    expect(options).toEqual([
      { id: 'u1', label: 'Ana Ruiz' },
      { id: 'u2', label: 'Luis Peña (cuenta inactiva)' },
    ]);
  });
});

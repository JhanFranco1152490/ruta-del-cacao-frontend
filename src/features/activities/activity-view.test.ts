import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_VIEW_OPTIONS,
  ACTIVITY_VIEWS,
  initialActivityView,
  isPeriodView,
} from './activity-view';

describe('activity views', () => {
  it('offers every view once, in the order of the switch', () => {
    expect(ACTIVITY_VIEW_OPTIONS.map(({ value }) => value)).toEqual([
      ...ACTIVITY_VIEWS,
    ]);
  });

  it('opens on the month in a desktop and on the list elsewhere', () => {
    expect(initialActivityView(true)).toBe('mes');
    expect(initialActivityView(false)).toBe('lista');
  });

  it('moves by period in every view but pending', () => {
    expect(ACTIVITY_VIEWS.filter(isPeriodView)).toEqual([
      'mes',
      'semana',
      'lista',
      'parcela',
    ]);
  });
});

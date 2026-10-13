import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';

import { activityActions, canScheduleOn } from './activity-actions';

const ALL = {
  permissions: [
    PERMISSIONS.ACTIVITIES_VIEW,
    PERMISSIONS.ACTIVITIES_CHANGE,
    PERMISSIONS.ACTIVITIES_COMPLETE,
    PERMISSIONS.ACTIVITIES_DELETE,
  ],
};

const only = (...permissions: string[]) => ({ permissions });

describe('activityActions', () => {
  it('offers everything on a scheduled or delayed activity', () => {
    for (const state of ['scheduled', 'delayed'] as const) {
      expect(activityActions(state, 'pruning', ALL)).toEqual({
        edit: true,
        complete: true,
        remove: true,
        awaitsHealthModule: false,
      });
    }
  });

  it('offers only the completion on an overdue activity', () => {
    expect(activityActions('overdue', 'pruning', ALL)).toEqual({
      edit: false,
      complete: true,
      remove: false,
      awaitsHealthModule: false,
    });
  });

  it('offers nothing on a done activity', () => {
    expect(activityActions('done', 'pruning', ALL)).toEqual({
      edit: false,
      complete: false,
      remove: false,
      awaitsHealthModule: false,
    });
  });

  it('offers each action only with its own permission', () => {
    expect(
      activityActions(
        'scheduled',
        'pruning',
        only(PERMISSIONS.ACTIVITIES_CHANGE),
      ),
    ).toMatchObject({ edit: true, complete: false, remove: false });
    expect(
      activityActions(
        'scheduled',
        'pruning',
        only(PERMISSIONS.ACTIVITIES_COMPLETE),
      ),
    ).toMatchObject({ edit: false, complete: true, remove: false });
    expect(
      activityActions(
        'scheduled',
        'pruning',
        only(PERMISSIONS.ACTIVITIES_DELETE),
      ),
    ).toMatchObject({ edit: false, complete: false, remove: true });
  });

  it('offers nothing while the session is not loaded', () => {
    expect(activityActions('scheduled', 'pruning', undefined)).toEqual({
      edit: false,
      complete: false,
      remove: false,
      awaitsHealthModule: false,
    });
  });

  it('tells who could complete a monitoring that it waits for the health module', () => {
    expect(
      activityActions('overdue', 'phytosanitary_monitoring', ALL),
    ).toMatchObject({ complete: false, awaitsHealthModule: true });
    // Editarlo y eliminarlo sí se puede, como cualquier otra labor.
    expect(
      activityActions('scheduled', 'phytosanitary_monitoring', ALL),
    ).toMatchObject({ edit: true, remove: true, awaitsHealthModule: true });
  });

  it('says nothing about the health module to who cannot complete or when it is done', () => {
    expect(
      activityActions(
        'scheduled',
        'phytosanitary_monitoring',
        only(PERMISSIONS.ACTIVITIES_CHANGE),
      ).awaitsHealthModule,
    ).toBe(false);
    expect(
      activityActions('done', 'phytosanitary_monitoring', ALL)
        .awaitsHealthModule,
    ).toBe(false);
  });

  it('offers nothing while the completion waits in the device: the labor was done', () => {
    expect(activityActions('scheduled', 'pruning', ALL, true)).toEqual({
      edit: false,
      complete: false,
      remove: false,
      awaitsHealthModule: false,
    });
  });
});

describe('canScheduleOn', () => {
  it('offers today and the days after it', () => {
    expect(canScheduleOn('2026-10-22', '2026-10-22')).toBe(true);
    expect(canScheduleOn('2026-10-23', '2026-10-22')).toBe(true);
    expect(canScheduleOn('2027-01-01', '2026-10-22')).toBe(true);
  });

  it('does not offer a day that already passed', () => {
    expect(canScheduleOn('2026-10-21', '2026-10-22')).toBe(false);
  });
});

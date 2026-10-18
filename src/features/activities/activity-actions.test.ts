import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';

import { activityActions, canScheduleOn } from './activity-actions';

const ALL = {
  permissions: [
    PERMISSIONS.ACTIVITIES_VIEW,
    PERMISSIONS.ACTIVITIES_ADD,
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
        recordMonitoring: false,
      });
    }
  });

  it('offers only the completion on an overdue activity', () => {
    expect(activityActions('overdue', 'pruning', ALL)).toEqual({
      edit: false,
      complete: true,
      remove: false,
      recordMonitoring: false,
    });
  });

  it('offers nothing on a done activity', () => {
    expect(activityActions('done', 'pruning', ALL)).toEqual({
      edit: false,
      complete: false,
      remove: false,
      recordMonitoring: false,
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
        {
          ...only(PERMISSIONS.ACTIVITIES_COMPLETE),
          id: 'u1',
        },
        'u1',
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
      recordMonitoring: false,
    });
  });

  it('offers who could complete a monitoring to record its result instead', () => {
    expect(
      activityActions('overdue', 'phytosanitary_monitoring', ALL),
    ).toMatchObject({ complete: false, recordMonitoring: true });
    // Editarlo y eliminarlo sí se puede, como cualquier otra labor.
    expect(
      activityActions('scheduled', 'phytosanitary_monitoring', ALL),
    ).toMatchObject({ edit: true, remove: true, recordMonitoring: true });
  });

  it('does not offer the result to who cannot complete or when it is done', () => {
    expect(
      activityActions(
        'scheduled',
        'phytosanitary_monitoring',
        only(PERMISSIONS.ACTIVITIES_CHANGE),
      ).recordMonitoring,
    ).toBe(false);
    expect(
      activityActions('done', 'phytosanitary_monitoring', ALL).recordMonitoring,
    ).toBe(false);
  });

  it('offers nothing while the completion waits in the device: the labor was done', () => {
    expect(
      activityActions('scheduled', 'pruning', ALL, undefined, true),
    ).toEqual({
      edit: false,
      complete: false,
      remove: false,
      recordMonitoring: false,
    });
  });
});

describe('who records the completion', () => {
  const operator = {
    id: 'u1',
    permissions: [PERMISSIONS.ACTIVITIES_VIEW, PERMISSIONS.ACTIVITIES_COMPLETE],
    all_farms: false,
  };

  it('lets a worker record only the activities assigned to it', () => {
    expect(
      activityActions('scheduled', 'pruning', operator, 'u1').complete,
    ).toBe(true);
    expect(
      activityActions('scheduled', 'pruning', operator, 'u2').complete,
    ).toBe(false);
  });

  it('lets whoever schedules record the activities of others', () => {
    const foreman = {
      ...operator,
      permissions: [...operator.permissions, PERMISSIONS.ACTIVITIES_ADD],
    };

    expect(
      activityActions('scheduled', 'pruning', foreman, 'u2').complete,
    ).toBe(true);
  });

  it('lets the producer record the activities of others', () => {
    expect(
      activityActions(
        'scheduled',
        'pruning',
        { ...operator, all_farms: true },
        'u2',
      ).complete,
    ).toBe(true);
  });

  it('does not offer a worker the result of a monitoring of others', () => {
    expect(
      activityActions('scheduled', 'phytosanitary_monitoring', operator, 'u2')
        .recordMonitoring,
    ).toBe(false);
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

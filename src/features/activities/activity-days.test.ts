import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import {
  effectiveState,
  groupActivitiesByDay,
  groupItemsByDay,
  toActivityOfDay,
} from './activity-days';

const TODAY = '2026-10-22';

describe('groupActivitiesByDay', () => {
  it('groups the activities under their scheduled day, earliest first', () => {
    const days = groupActivitiesByDay(
      [
        buildAgriculturalActivity({ id: 'c', scheduled_date: '2026-10-25' }),
        buildAgriculturalActivity({ id: 'a', scheduled_date: '2026-10-19' }),
        buildAgriculturalActivity({ id: 'b', scheduled_date: '2026-10-19' }),
      ],
      TODAY,
    );

    expect(days.map(({ date }) => date)).toEqual(['2026-10-19', '2026-10-25']);
    expect(days[0].activities.map(({ activity }) => activity.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('leaves out the days without activities', () => {
    expect(groupActivitiesByDay([], TODAY)).toEqual([]);
  });

  it('marks today', () => {
    const days = groupActivitiesByDay(
      [
        buildAgriculturalActivity({ id: 'a', scheduled_date: '2026-10-21' }),
        buildAgriculturalActivity({ id: 'b', scheduled_date: TODAY }),
      ],
      TODAY,
    );

    expect(days.map(({ isToday }) => isToday)).toEqual([false, true]);
  });

  it('computes the state with the date of the device, not with the saved one', () => {
    // La copia es de cuando la actividad estaba al día: hoy ya lleva tres días de retraso.
    const [day] = groupActivitiesByDay(
      [
        buildAgriculturalActivity({
          scheduled_date: '2026-10-19',
          state: 'scheduled',
          days_late: 0,
        }),
      ],
      TODAY,
    );

    expect(day.activities[0]).toMatchObject({ state: 'overdue', daysLate: 3 });
  });

  it('keeps a done activity under its scheduled day', () => {
    const [day] = groupActivitiesByDay(
      [
        buildAgriculturalActivity({
          scheduled_date: '2026-10-10',
          status: 'done',
          done_date: '2026-10-12',
        }),
      ],
      TODAY,
    );

    expect(day.date).toBe('2026-10-10');
    expect(day.activities[0]).toMatchObject({ state: 'done', daysLate: 0 });
  });

  it('says which activities have their completion waiting in the device', () => {
    const [day] = groupActivitiesByDay(
      [
        buildAgriculturalActivity({ id: 'a', scheduled_date: '2026-10-21' }),
        buildAgriculturalActivity({ id: 'b', scheduled_date: '2026-10-21' }),
        buildAgriculturalActivity({ id: 'c', scheduled_date: '2026-10-21' }),
      ],
      TODAY,
      new Map([
        ['a', 'pending'],
        ['c', 'error'],
      ]),
    );

    expect(day.activities.map(({ completion }) => completion)).toEqual([
      'pending',
      undefined,
      'error',
    ]);
    // Sigue sabiendo cómo iba la actividad: si el envío falla, vuelve a mostrarse así.
    expect(day.activities[0]).toMatchObject({ state: 'delayed', daysLate: 1 });
  });
});

describe('toActivityOfDay', () => {
  it('gives the activity with its state of today and the completion that waits', () => {
    const activity = buildAgriculturalActivity({
      id: 'x',
      scheduled_date: '2026-10-20',
    });

    expect(
      toActivityOfDay(activity, TODAY, new Map([['x', 'pending']])),
    ).toEqual({
      activity,
      state: 'delayed',
      daysLate: 2,
      completion: 'pending',
    });
  });

  it('leaves out the completion when there is none', () => {
    const item = toActivityOfDay(buildAgriculturalActivity(), TODAY);

    expect(item).not.toHaveProperty('completion');
  });
});

describe('effectiveState', () => {
  it('says done for an activity whose completion waits to be sent', () => {
    const activity = buildAgriculturalActivity({
      scheduled_date: '2026-10-25',
    });

    expect(
      effectiveState(
        toActivityOfDay(activity, TODAY, new Map([['a1', 'pending']])),
      ),
    ).toBe('done');
    expect(
      effectiveState(
        toActivityOfDay(activity, TODAY, new Map([['a1', 'error']])),
      ),
    ).toBe('scheduled');
    expect(effectiveState(toActivityOfDay(activity, TODAY))).toBe('scheduled');
  });
});

describe('groupItemsByDay', () => {
  it('groups items that already carry their state, and marks today', () => {
    const items = [
      toActivityOfDay(
        buildAgriculturalActivity({ id: 'b', scheduled_date: TODAY }),
        TODAY,
      ),
      toActivityOfDay(
        buildAgriculturalActivity({ id: 'a', scheduled_date: '2026-10-19' }),
        TODAY,
      ),
    ];

    const days = groupItemsByDay(items, TODAY);

    expect(days.map(({ date, isToday }) => [date, isToday])).toEqual([
      ['2026-10-19', false],
      [TODAY, true],
    ]);
    expect(days[0].activities[0]).toBe(items[1]);
  });
});

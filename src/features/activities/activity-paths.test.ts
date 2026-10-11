import { describe, expect, it } from 'vitest';

import { activitiesPath, activityCompletionPath } from './activity-paths';

describe('activitiesPath', () => {
  it('opens the list on the current month', () => {
    expect(activitiesPath()).toBe('/actividades');
  });

  it('opens the list on a month', () => {
    expect(activitiesPath('2026-11')).toBe('/actividades?mes=2026-11');
  });
});

describe('activityCompletionPath', () => {
  it('passes the activity as a parameter of a fixed route', () => {
    expect(activityCompletionPath('a1')).toBe('/actividades/realizar?id=a1');
  });
});

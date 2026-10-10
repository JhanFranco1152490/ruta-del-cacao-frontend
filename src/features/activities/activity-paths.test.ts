import { describe, expect, it } from 'vitest';

import { activitiesPath } from './activity-paths';

describe('activitiesPath', () => {
  it('opens the list on the current month', () => {
    expect(activitiesPath()).toBe('/actividades');
  });

  it('opens the list on a month', () => {
    expect(activitiesPath('2026-11')).toBe('/actividades?mes=2026-11');
  });
});

import { describe, expect, it } from 'vitest';

import {
  ACTIVITIES_PATH,
  SCHEDULE_MONITORING,
  SCHEDULE_PARAM,
  scheduleMonitoringPath,
} from './activities';

describe('scheduleMonitoringPath', () => {
  it('opens the schedule form for a monitoring', () => {
    expect(scheduleMonitoringPath()).toBe(
      `${ACTIVITIES_PATH}?${SCHEDULE_PARAM}=${SCHEDULE_MONITORING}`,
    );
  });

  it('carries the farm and the plot that were chosen', () => {
    expect(scheduleMonitoringPath({ farm: 'f1', plot: 'pl1' })).toBe(
      '/actividades?programar=monitoreo&finca=f1&parcela=pl1',
    );
  });

  it('leaves out what was not chosen', () => {
    expect(scheduleMonitoringPath({ farm: null, plot: 'pl1' })).toBe(
      '/actividades?programar=monitoreo&parcela=pl1',
    );
  });
});

import { describe, expect, it } from 'vitest';

import {
  HEALTH_PATH,
  healthHistoryPath,
  PESTS_DISEASES_PATH,
  monitoringPath,
  plotHistoryPath,
} from './health-paths';

describe('health paths', () => {
  it('names the catalog and the health section', () => {
    expect(PESTS_DISEASES_PATH).toBe('/plagas-enfermedades');
    expect(HEALTH_PATH).toBe('/sanidad');
  });

  it('passes the monitoring as a parameter of a fixed route', () => {
    expect(monitoringPath('a1')).toBe('/sanidad/monitoreo?id=a1');
  });

  it('opens the history of a plot in the health section', () => {
    expect(plotHistoryPath('pl1')).toBe('/sanidad?parcela=pl1');
  });

  it('opens the history of a farm, or of everything', () => {
    expect(healthHistoryPath({ farm: 'f1' })).toBe('/sanidad?finca=f1');
    expect(healthHistoryPath({})).toBe('/sanidad');
  });
});

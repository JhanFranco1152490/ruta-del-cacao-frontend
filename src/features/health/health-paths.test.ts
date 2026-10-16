import { describe, expect, it } from 'vitest';

import {
  HEALTH_PATH,
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

  it('passes the plot as a parameter of a fixed route', () => {
    expect(plotHistoryPath('pl1')).toBe(
      '/parcelas/historial-fitosanitario?id=pl1',
    );
  });
});

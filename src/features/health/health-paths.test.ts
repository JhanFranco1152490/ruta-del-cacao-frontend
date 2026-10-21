import { describe, expect, it } from 'vitest';

import {
  HEALTH_PATH,
  healthHistoryPath,
  PESTS_DISEASES_PATH,
  monitoringPath,
  plotHistoryPath,
  scheduledMonitoringPath,
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
    expect(plotHistoryPath('pl1')).toBe('/sanidad?vista=historial&parcela=pl1');
  });

  it('opens the history of a farm, or of everything', () => {
    expect(healthHistoryPath({ farm: 'f1' })).toBe(
      '/sanidad?vista=historial&finca=f1',
    );
    expect(healthHistoryPath({})).toBe('/sanidad?vista=historial');
  });

  it('opens a scheduled monitoring in the calendar of its month', () => {
    expect(scheduledMonitoringPath('a1', '2026-11-03')).toBe(
      '/actividades?mes=2026-11&actividad=a1',
    );
  });
});

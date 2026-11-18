import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';

import {
  availableReportTypes,
  isWithoutPeriod,
  resolveReportType,
} from './report-types';

const account = (...permissions: string[]) => ({ permissions });

describe('availableReportTypes', () => {
  it('offers the producer every type whose module the account can see', () => {
    const owner = account(
      PERMISSIONS.HARVESTS_VIEW,
      PERMISSIONS.LOTS_VIEW,
      PERMISSIONS.WAREHOUSE_VIEW_STOCK,
      PERMISSIONS.SALES_VIEW,
    );

    expect(availableReportTypes(owner, 'producer')).toEqual([
      'production',
      'quality',
      'inventory',
      'sales',
      'traceability',
    ]);
  });

  // Como el capataz de la demostración: ve cosechas y lotes, pero no las ventas ni sus precios.
  it('leaves out the types whose module the account cannot see', () => {
    const foreman = account(PERMISSIONS.HARVESTS_VIEW, PERMISSIONS.LOTS_VIEW);

    expect(availableReportTypes(foreman, 'producer')).toEqual([
      'production',
      'quality',
      'traceability',
    ]);
    expect(availableReportTypes(account(), 'producer')).toEqual([]);
  });

  it('offers the association its three types without looking at the modules', () => {
    expect(availableReportTypes(account(), 'association')).toEqual([
      'production',
      'quality',
      'sales',
    ]);
  });
});

describe('resolveReportType', () => {
  it('keeps the requested type only if the account can generate it', () => {
    expect(resolveReportType(['production', 'sales'], 'sales')).toBe('sales');
    expect(resolveReportType(['production'], 'sales')).toBeNull();
    expect(resolveReportType(['production'], 'zzz')).toBeNull();
    expect(resolveReportType(['production'], null)).toBeNull();
  });
});

describe('isWithoutPeriod', () => {
  it('says the inventory is today’s stock', () => {
    expect(isWithoutPeriod('inventory')).toBe(true);
    expect(isWithoutPeriod('production')).toBe(false);
    expect(isWithoutPeriod(null)).toBe(false);
  });
});

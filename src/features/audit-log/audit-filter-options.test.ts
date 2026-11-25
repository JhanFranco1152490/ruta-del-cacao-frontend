import { describe, expect, it } from 'vitest';

import { buildAuditOptions } from '@/test/factories';

import { actorOptions, changesCountLabel } from './audit-filter-options';

describe('actorOptions', () => {
  it('offers every account of the producer and marks the inactive ones', () => {
    expect(actorOptions(buildAuditOptions().actors)).toEqual([
      { id: 'acc-1', label: 'Ana Ejemplo' },
      { id: 'acc-2', label: 'Luis Ejemplo' },
      { id: 'acc-3', label: 'Marta Ejemplo (inactiva)' },
    ]);
  });
});

describe('changesCountLabel', () => {
  it('names how many changes the filters found', () => {
    expect(changesCountLabel(1)).toBe('1 cambio');
    expect(changesCountLabel(21)).toBe('21 cambios');
    expect(changesCountLabel(12000)).toBe('12.000 cambios');
  });
});

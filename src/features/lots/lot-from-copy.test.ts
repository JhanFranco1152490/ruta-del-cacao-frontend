import { describe, expect, it } from 'vitest';

import { buildDrying, buildFermentation } from '@/test/factories';

import { lotFromCopy } from './api';

describe('lotFromCopy', () => {
  it('builds the lot of a fermentation copy with its summary and no drying', () => {
    const process = buildFermentation();

    const lot = lotFromCopy({ kind: 'fermentation', process, savedAt: 1 });

    expect(lot.id).toBe(process.lot.id);
    expect(lot.producer).toEqual({
      id: process.lot.harvest.producer_id,
      member_code: '',
    });
    expect(lot.fermentation).toEqual({
      started_at: process.started_at,
      ended_at: null,
      facility: process.facility.name,
    });
    expect(lot.drying).toBeNull();
  });

  it('builds the lot of a drying copy with its summary and no fermentation', () => {
    const process = buildDrying();

    const lot = lotFromCopy({ kind: 'drying', process, savedAt: 1 });

    expect(lot.id).toBe(process.lot.id);
    expect(lot.fermentation).toBeNull();
    expect(lot.drying).toEqual({
      started_at: process.started_at,
      ended_at: null,
      final_moisture_pct: null,
      dry_weight_kg: null,
      yield_pct: null,
    });
  });
});

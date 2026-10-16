import { describe, expect, it } from 'vitest';

import { buildHarvest } from '@/test/factories';

import type { QueuedHarvest } from './harvest-queue';
import { harvestFilterOptions, harvestRows } from './harvest-rows';

const server = buildHarvest({
  id: 'h1',
  harvest_date: '2026-10-14',
  green_weight_kg: '120.5',
  lot: { id: 'l1', code: '000123-F02-P05-261014-1', status: 'generated' },
});
const other = buildHarvest({
  id: 'h2',
  harvest_date: '2026-10-20',
  plot: {
    id: 'pl9',
    code: 'P09',
    name: null,
    is_active: true,
    farm: { id: 'f9', code: 'F09', name: 'El Diviso', is_active: true },
  },
  variety: { id: 'v2', name: 'ICS-95', is_active: true },
  collector: { id: 'u2', full_name: 'Luis Rincón', is_active: true },
});

const queued = (overrides: Partial<QueuedHarvest> = {}): QueuedHarvest => ({
  id: 'q1',
  request: {
    id: 'q1',
    plot_id: 'pl1',
    harvest_date: '2026-10-22',
    green_weight_kg: '88',
    variety_id: 'v1',
    collector_id: 'u1',
  },
  label: 'P05 · Lote del río · 22 oct.',
  status: 'pending',
  ...overrides,
});

const rowsOf = (
  filters = {},
  waiting: QueuedHarvest[] = [queued()],
  month = '2026-10',
) =>
  harvestRows({ harvests: [server, other], queued: waiting, month, filters });

describe('harvestRows', () => {
  it('lists what waits in the phone and what reached the server, newest first', () => {
    expect(
      rowsOf().map(({ id, plot, farm, lotCode, queue }) => [
        id,
        plot,
        farm,
        lotCode,
        queue,
      ]),
    ).toEqual([
      ['q1', 'P05 · Lote del río', null, null, 'pending'],
      ['h2', 'P09', 'F09 · El Diviso', null, undefined],
      [
        'h1',
        'P05 · Lote del río',
        'F02 · La Esperanza',
        '000123-F02-P05-261014-1',
        undefined,
      ],
    ]);
  });

  it('keeps what waits in another month or already reached the server out', () => {
    const elsewhere = queued({
      request: { ...queued().request, harvest_date: '2026-09-30' },
    });
    const sent = queued({ id: 'h1' });

    expect(rowsOf({}, [elsewhere, sent]).map(({ id }) => id)).toEqual([
      'h2',
      'h1',
    ]);
  });

  it('marks what the server rejected', () => {
    expect(rowsOf({}, [queued({ status: 'error' })])[0].queue).toBe('error');
  });

  it('filters what waits by what it carries, and by farm through its plot', () => {
    expect(rowsOf({ plot: 'pl1' }).map(({ id }) => id)).toEqual(['q1', 'h1']);
    expect(rowsOf({ farm: 'f1' }).map(({ id }) => id)).toEqual(['q1', 'h1']);
    expect(rowsOf({ variety: 'v2' }).map(({ id }) => id)).toEqual(['h2']);
    expect(rowsOf({ collector: 'u2' }).map(({ id }) => id)).toEqual(['h2']);
  });

  it('leaves what waits out of the harvests already in a lot', () => {
    expect(rowsOf({ lot: 'with' }).map(({ id }) => id)).toEqual(['h1']);
    expect(rowsOf({ lot: 'without' }).map(({ id }) => id)).toEqual([
      'q1',
      'h2',
    ]);
  });
});

describe('harvestFilterOptions', () => {
  it('offers what appears in the month, once each and in order', () => {
    const options = harvestFilterOptions([server, other, server]);

    expect(options.farms.map(({ label }) => label)).toEqual([
      'F02 · La Esperanza',
      'F09 · El Diviso',
    ]);
    expect(options.plots.map(({ label }) => label)).toEqual([
      'P05 · Lote del río',
      'P09',
    ]);
    expect(options.varieties.map(({ label }) => label)).toEqual([
      'CCN-51',
      'ICS-95',
    ]);
    expect(options.collectors.map(({ label }) => label)).toEqual([
      'Cuenta de prueba',
      'Luis Rincón',
    ]);
    expect(options.farmOfPlot.get('pl9')).toBe('f9');
  });
});

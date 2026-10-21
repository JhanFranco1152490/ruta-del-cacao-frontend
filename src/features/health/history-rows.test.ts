import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import type { Detection } from './detection-status';
import { historyRows } from './history-rows';

const buildDetection = (overrides: Partial<Detection> = {}): Detection => ({
  id: 'd1',
  pest_disease: {
    id: 'monilia',
    name: 'Monilia',
    kind: 'disease',
    is_active: true,
  },
  other_description: null,
  affected_units: 12,
  incidence: '24.00',
  controls: [],
  control_request: null,
  ...overrides,
});

const monitoring = (
  id: string,
  overrides: Partial<
    NonNullable<ReturnType<typeof buildAgriculturalActivity>['monitoring']>
  >,
) =>
  buildAgriculturalActivity({
    id,
    activity_type: 'phytosanitary_monitoring',
    status: 'done',
    done_date: '2026-10-19',
    monitoring: {
      sampling_unit: 'trees',
      evaluated_units: 50,
      sampling_method: null,
      notes: null,
      no_presence: false,
      detections: [],
      detections_without_control: 0,
      evidence_count: 0,
      ...overrides,
    },
  });

describe('historyRows', () => {
  it('gives one row per detection and marks the first of each monitoring', () => {
    const rows = historyRows([
      monitoring('m1', {
        detections: [
          buildDetection({ id: 'd1' }),
          buildDetection({ id: 'd2' }),
        ],
      }),
    ]);

    expect(rows.map(({ key, first }) => [key, first])).toEqual([
      ['d1', true],
      ['d2', false],
    ]);
    expect(rows[0].date).toBe('2026-10-19');
  });

  it('gives one row without a detection when nothing was found', () => {
    const rows = historyRows([monitoring('m2', { no_presence: true })]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'm2', detection: null, first: true });
  });

  it('skips an activity that has no monitoring result', () => {
    expect(
      historyRows([buildAgriculturalActivity({ monitoring: null })]),
    ).toEqual([]);
  });
});

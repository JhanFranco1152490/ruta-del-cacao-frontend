import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_TYPE_OPTIONS,
  activityTitle,
  activityTypeLabel,
} from './activity-types';

describe('activity types', () => {
  it('names every type in Spanish', () => {
    expect(ACTIVITY_TYPE_OPTIONS.map(({ label }) => label)).toEqual([
      'Poda',
      'Fertilización',
      'Riego',
      'Control de malezas',
      'Monitoreo fitosanitario',
      'Control fitosanitario',
      'Limpieza o encalado',
      'Inventario',
      'Otro',
    ]);
    expect(activityTypeLabel('weed_control')).toBe('Control de malezas');
  });

  it('shows a type this version does not know as it arrives', () => {
    expect(activityTypeLabel('grafting')).toBe('grafting');
  });
});

describe('activityTitle', () => {
  it('is the label of the type', () => {
    expect(
      activityTitle({
        activity_type: 'fertilization',
        other_description: null,
      }),
    ).toBe('Fertilización');
  });

  it('is the description when the type is other', () => {
    expect(
      activityTitle({ activity_type: 'other', other_description: 'Resiembra' }),
    ).toBe('Resiembra');
  });

  it('falls back to the label when an other has no description', () => {
    expect(
      activityTitle({ activity_type: 'other', other_description: null }),
    ).toBe('Otro');
  });
});

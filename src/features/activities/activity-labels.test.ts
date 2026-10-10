import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_STATE_DISPLAY,
  ACTIVITY_TYPE_OPTIONS,
  activityStateText,
  activityTitle,
  activityTypeLabel,
  SCHEDULABLE_ACTIVITY_TYPE_OPTIONS,
} from './activity-labels';

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

  it('offers every type but the phytosanitary control to schedule', () => {
    const values = SCHEDULABLE_ACTIVITY_TYPE_OPTIONS.map(({ value }) => value);
    expect(values).toHaveLength(ACTIVITY_TYPE_OPTIONS.length - 1);
    expect(values).not.toContain('phytosanitary_control');
    expect(values).toContain('phytosanitary_monitoring');
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

describe('activity states', () => {
  it('gives each state its label and its tone', () => {
    expect(ACTIVITY_STATE_DISPLAY).toEqual({
      scheduled: { label: 'Programada', tone: 'info' },
      delayed: { label: 'Retrasada', tone: 'warn' },
      overdue: { label: 'Vencida', tone: 'err' },
      done: { label: 'Realizada', tone: 'ok' },
    });
  });

  it('says how many days a delayed or overdue activity is late', () => {
    expect(activityStateText('delayed', 1)).toBe('Retrasada · 1 día');
    expect(activityStateText('delayed', 2)).toBe('Retrasada · 2 días');
    expect(activityStateText('overdue', 5)).toBe('Vencida · 5 días');
  });

  it('says only the label when there is no delay to tell', () => {
    expect(activityStateText('scheduled', 0)).toBe('Programada');
    expect(activityStateText('done', 0)).toBe('Realizada');
  });
});

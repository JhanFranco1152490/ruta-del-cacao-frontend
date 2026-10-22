import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { activityFormDefaults, activityFormTexts } from './activity-form-setup';
import { EMPTY_ACTIVITY_FORM, toFormValues } from './schemas';

describe('activityFormDefaults', () => {
  it('starts from the activity being edited', () => {
    const activity = buildAgriculturalActivity();

    expect(activityFormDefaults(activity, { date: '2026-11-01' })).toEqual(
      toFormValues(activity),
    );
  });

  it('starts a new one from what the place it was opened from already says', () => {
    expect(
      activityFormDefaults(undefined, {
        farmId: 'f1',
        plotId: 'p1',
        date: '2026-11-01',
        activityType: 'phytosanitary_monitoring',
      }),
    ).toEqual({
      ...EMPTY_ACTIVITY_FORM,
      farm_id: 'f1',
      plot_id: 'p1',
      scheduled_date: '2026-11-01',
      activity_type: 'phytosanitary_monitoring',
    });
  });
});

describe('activityFormTexts', () => {
  it('names editing, scheduling a monitoring and scheduling a task', () => {
    expect(activityFormTexts(true, true).title).toBe('Editar actividad');
    expect(activityFormTexts(false, true).title).toBe('Programar monitoreo');
    expect(activityFormTexts(false, false)).toMatchObject({
      title: 'Programar actividad',
      submitLabel: 'Guardar',
    });
  });
});

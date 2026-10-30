import { describe, expect, it } from 'vitest';

import {
  isPostharvestAlertKind,
  POSTHARVEST_ALERT_TITLES,
} from './alert-kinds';

describe('POSTHARVEST_ALERT_TITLES', () => {
  it('names the pending records and the deviations', () => {
    expect(POSTHARVEST_ALERT_TITLES.fermentation_first_turn_due).toBe(
      'Se acerca el primer volteo',
    );
    expect(POSTHARVEST_ALERT_TITLES.drying_log_due).toBe(
      'Bitácora de secado pendiente',
    );
    expect(POSTHARVEST_ALERT_TITLES.fermentation_ph_high).toBe(
      'La fermentación no avanza',
    );
    expect(POSTHARVEST_ALERT_TITLES.drying_overdried).toBe('Sobresecado');
  });

  it('gives both slow drying conditions the same name', () => {
    expect(POSTHARVEST_ALERT_TITLES.drying_slow_stalled).toBe(
      POSTHARVEST_ALERT_TITLES.drying_slow_duration,
    );
  });
});

describe('isPostharvestAlertKind', () => {
  it('tells the postharvest kinds from the activity kinds', () => {
    expect(isPostharvestAlertKind('fermentation_turn_due')).toBe(true);
    expect(isPostharvestAlertKind('drying_near_target')).toBe(true);
    expect(isPostharvestAlertKind('activity_upcoming')).toBe(false);
    expect(isPostharvestAlertKind('toString')).toBe(false);
  });
});

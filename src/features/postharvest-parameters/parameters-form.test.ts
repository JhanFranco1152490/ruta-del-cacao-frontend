import { describe, expect, it } from 'vitest';

import { buildParameters } from '@/test/factories';

import {
  baselineText,
  changedKeys,
  hasUnsavedChanges,
  MAX_DAYS_MESSAGE,
  MAX_HOURS_MESSAGE,
  MAX_TURN_HOURS_MESSAGE,
  PH_MESSAGE,
  TEMPERATURE_MESSAGE,
  TWO_DECIMALS_MESSAGE,
  MIN_ABOVE_MAX_MESSAGE,
  originLine,
  parametersFormOf,
  parametersSchema,
  POSITIVE_DROP_MESSAGE,
  POSITIVE_INTEGER_MESSAGE,
  toParameterValues,
  valueText,
} from './parameters-form';

const baseline = buildParameters().values;
const valid = () => parametersFormOf(baseline);

const errorsOf = (changes: Record<string, string>) => {
  const result = parametersSchema.safeParse({ ...valid(), ...changes });
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [
      String(issue.path[0]),
      issue.message,
    ]),
  );
};

describe('parametersFormOf and toParameterValues', () => {
  it('writes the percentages with a comma for the form, and the whole numbers as they are', () => {
    const form = parametersFormOf(baseline);

    expect(form.entry_moisture_min_pct).toBe('55,0');
    expect(form.target_moisture_max_pct).toBe('7,5');
    expect(form.estimated_days_max).toBe('7');
    expect(form.slow_stall_window_hours).toBe('48');
  });

  it('sends the percentages as text with a point and the days and hours as numbers', () => {
    const values = toParameterValues({
      ...valid(),
      near_target_min_pct: '7,6',
      slow_duration_day: '9',
    });

    expect(values).toEqual({
      ...baseline,
      entry_moisture_min_pct: '55.0',
      entry_moisture_max_pct: '60.0',
      target_moisture_min_pct: '6.5',
      target_moisture_max_pct: '7.5',
      slow_stall_min_drop_pct: '4.0',
      slow_duration_moisture_pct: '10.0',
      accelerated_moisture_pct: '15.0',
      near_target_min_pct: '7.6',
      near_target_max_pct: '8.5',
      overdried_moisture_pct: '6.0',
      slow_duration_day: 9,
    });
  });
});

describe('parametersSchema', () => {
  it('accepts the baseline, with a comma or a point', () => {
    expect(parametersSchema.safeParse(valid()).success).toBe(true);
    expect(
      parametersSchema.safeParse({ ...valid(), near_target_min_pct: '7.6' })
        .success,
    ).toBe(true);
  });

  it('asks for every value', () => {
    expect(
      errorsOf({ overdried_moisture_pct: '', accelerated_day: '' }),
    ).toEqual({
      overdried_moisture_pct: 'Campo obligatorio',
      accelerated_day: 'Campo obligatorio',
    });
  });

  it('keeps the percentages between 0 and 100 with one decimal', () => {
    expect(errorsOf({ near_target_max_pct: '101' }).near_target_max_pct).toBe(
      'Debe estar entre 0 % y 100 %.',
    );
    expect(errorsOf({ near_target_max_pct: '8,55' }).near_target_max_pct).toBe(
      'Usa máximo 1 decimal.',
    );
  });

  it.each(['0', '-1', '2,5', 'abc'])(
    'asks for a whole number above zero in the days and hours (%s)',
    (value) => {
      expect(errorsOf({ accelerated_day: value }).accelerated_day).toBe(
        POSITIVE_INTEGER_MESSAGE,
      );
      expect(
        errorsOf({ slow_stall_window_hours: value }).slow_stall_window_hours,
      ).toBe(POSITIVE_INTEGER_MESSAGE);
    },
  );

  it('catches an extra zero in the days and in the hours', () => {
    expect(errorsOf({ estimated_days_max: '61' }).estimated_days_max).toBe(
      MAX_DAYS_MESSAGE,
    );
    expect(
      errorsOf({ slow_stall_window_hours: '241' }).slow_stall_window_hours,
    ).toBe(MAX_HOURS_MESSAGE);
    expect(errorsOf({ estimated_days_max: '60' })).toEqual({});
  });

  it('wants the humidity drop above zero', () => {
    expect(
      errorsOf({ slow_stall_min_drop_pct: '0' }).slow_stall_min_drop_pct,
    ).toBe(POSITIVE_DROP_MESSAGE);
  });

  it('points to the minimum when it is above the maximum, in each of the four ranges', () => {
    expect(
      errorsOf({ entry_moisture_min_pct: '62', entry_moisture_max_pct: '60' }),
    ).toEqual({ entry_moisture_min_pct: MIN_ABOVE_MAX_MESSAGE });
    expect(
      errorsOf({
        target_moisture_min_pct: '8',
        target_moisture_max_pct: '7,5',
      }),
    ).toEqual({ target_moisture_min_pct: MIN_ABOVE_MAX_MESSAGE });
    expect(
      errorsOf({ estimated_days_min: '9', estimated_days_max: '7' }),
    ).toEqual({ estimated_days_min: MIN_ABOVE_MAX_MESSAGE });
    expect(
      errorsOf({ near_target_min_pct: '9', near_target_max_pct: '8,5' }),
    ).toEqual({ near_target_min_pct: MIN_ABOVE_MAX_MESSAGE });
  });

  it('accepts a minimum equal to the maximum', () => {
    expect(
      errorsOf({ estimated_days_min: '7', estimated_days_max: '7' }),
    ).toEqual({});
  });

  it('does not compare a range while one of its ends is wrong', () => {
    expect(
      errorsOf({ entry_moisture_min_pct: '62', entry_moisture_max_pct: '' }),
    ).toEqual({ entry_moisture_max_pct: 'Campo obligatorio' });
  });

  describe('the fermentation values', () => {
    it.each(['0', '2,5', 'abc', '-1'])(
      'asks for whole hours above zero in the turn times (%s)',
      (value) => {
        expect(errorsOf({ first_turn_hours: value }).first_turn_hours).toBe(
          POSITIVE_INTEGER_MESSAGE,
        );
        expect(errorsOf({ next_turn_hours: value }).next_turn_hours).toBe(
          POSITIVE_INTEGER_MESSAGE,
        );
      },
    );

    it('catches an extra zero in the turn times', () => {
      expect(errorsOf({ first_turn_hours: '241' }).first_turn_hours).toBe(
        MAX_TURN_HOURS_MESSAGE,
      );
      expect(errorsOf({ next_turn_hours: '240' })).toEqual({});
    });

    it('keeps the temperature between 0 and 80 with one decimal', () => {
      expect(errorsOf({ temperature_max_c: '81' }).temperature_max_c).toBe(
        TEMPERATURE_MESSAGE,
      );
      expect(errorsOf({ temperature_min_c: '-1' }).temperature_min_c).toBe(
        TEMPERATURE_MESSAGE,
      );
      expect(errorsOf({ temperature_min_c: '40,55' }).temperature_min_c).toBe(
        'Usa máximo 1 decimal.',
      );
      expect(errorsOf({ temperature_min_c: '38,5' })).toEqual({});
    });

    it('keeps the pH between 0 and 14 with two decimals', () => {
      expect(errorsOf({ ph_max: '14,5' }).ph_max).toBe(PH_MESSAGE);
      expect(errorsOf({ ph_min: '4,123' }).ph_min).toBe(TWO_DECIMALS_MESSAGE);
      expect(errorsOf({ ph_min: '3,8', ph_max: '5,8' })).toEqual({});
    });

    it('points to the minimum when the temperature or the pH range is upside down', () => {
      expect(
        errorsOf({ temperature_min_c: '55', temperature_max_c: '50' }),
      ).toEqual({ temperature_min_c: MIN_ABOVE_MAX_MESSAGE });
      expect(errorsOf({ ph_min: '6', ph_max: '5,5' })).toEqual({
        ph_min: MIN_ABOVE_MAX_MESSAGE,
      });
    });

    it('sends the temperature and the pH as text and the turn times as numbers', () => {
      const values = toParameterValues({
        ...valid(),
        ph_min: '3,8',
        first_turn_hours: '36',
      });

      expect(values).toMatchObject({
        first_turn_hours: 36,
        next_turn_hours: 24,
        temperature_min_c: '40.0',
        ph_min: '3.8',
        ph_max: '5.50',
      });
    });
  });

  it('does not ask for the consistency between groups', () => {
    expect(errorsOf({ overdried_moisture_pct: '9' })).toEqual({});
  });
});

describe('changedKeys and hasUnsavedChanges', () => {
  it('marks only what differs from the baseline, by value and not by how it is written', () => {
    const form = {
      ...valid(),
      slow_duration_day: '9',
      entry_moisture_min_pct: '55',
    };

    expect(changedKeys(form, baseline)).toEqual(['slow_duration_day']);
    expect(changedKeys(valid(), baseline)).toEqual([]);
  });

  it('knows when something differs from what was loaded', () => {
    const loaded = valid();

    expect(hasUnsavedChanges(loaded, loaded)).toBe(false);
    expect(hasUnsavedChanges({ ...loaded, accelerated_day: '4' }, loaded)).toBe(
      true,
    );
    expect(
      hasUnsavedChanges({ ...loaded, overdried_moisture_pct: '6' }, loaded),
    ).toBe(false);
  });
});

describe('baselineText', () => {
  it('says the baseline of a value with its unit', () => {
    expect(baselineText('entry_moisture_min_pct', baseline)).toBe(
      'Predeterminado: 55 %',
    );
    expect(baselineText('target_moisture_min_pct', baseline)).toBe(
      'Predeterminado: 6,5 %',
    );
    expect(baselineText('estimated_days_min', baseline)).toBe(
      'Predeterminado: 5 días',
    );
    expect(baselineText('slow_stall_window_hours', baseline)).toBe(
      'Predeterminado: 48 horas',
    );
  });
});

describe('valueText', () => {
  it('writes each value with its unit and its fixed decimals', () => {
    expect(valueText('temperature_min_c', '40.0')).toBe('40,0 °C');
    expect(valueText('ph_min', '4.00')).toBe('4,00');
    expect(valueText('first_turn_hours', 48)).toBe('48 horas');
    expect(valueText('overdried_moisture_pct', '6.0')).toBe('6 %');
  });
});

describe('originLine', () => {
  it('says the baseline is in use when nothing was saved', () => {
    expect(originLine(buildParameters())).toBe(
      'Usas los valores predeterminados.',
    );
  });

  it('says who changed them and when', () => {
    expect(
      originLine(
        buildParameters({
          is_default: false,
          version: 3,
          updated_at: '2026-10-18T14:00:00Z',
          updated_by: { id: 'u1', full_name: 'Ana Gómez' },
        }),
      ),
    ).toBe('Personalizados · actualizados el 18 oct por Ana Gómez.');
  });

  it('leaves out the author when the account no longer exists', () => {
    expect(
      originLine(
        buildParameters({
          is_default: false,
          version: 1,
          updated_at: '2026-10-18T14:00:00Z',
        }),
      ),
    ).toBe('Personalizados · actualizados el 18 oct.');
  });
});

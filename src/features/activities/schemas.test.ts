import { describe, expect, expectTypeOf, it } from 'vitest';

import type { components } from '@/lib/api/schema';
import { buildAgriculturalActivity, buildAssignee } from '@/test/factories';

import {
  type ActivityFormInput,
  createActivityFormSchema,
  EMPTY_ACTIVITY_FORM,
  PAST_DATE_MESSAGE,
  toCreateRequest,
  toFormValues,
  toUpdateRequest,
} from './schemas';

type Schemas = components['schemas'];

const TODAY = '2026-10-22';

const valid: ActivityFormInput = {
  farm_id: 'f1',
  plot_id: 'pl1',
  activity_type: 'fertilization',
  other_description: '',
  scheduled_date: '2026-10-25',
  assignee_id: 'u1',
};

const parse = (
  input: Partial<ActivityFormInput>,
  original?: { scheduled_date: string },
) =>
  createActivityFormSchema({ today: TODAY, original }).safeParse({
    ...valid,
    ...input,
  });

const errorsOf = (result: ReturnType<typeof parse>) =>
  result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [
          issue.path.join('.'),
          issue.message,
        ]),
      );

describe('the activity form', () => {
  it('accepts a complete form', () => {
    expect(parse({}).success).toBe(true);
  });

  it('marks every required field that is missing', () => {
    const result = createActivityFormSchema({ today: TODAY }).safeParse(
      EMPTY_ACTIVITY_FORM,
    );

    expect(errorsOf(result)).toEqual({
      plot_id: 'Campo obligatorio',
      activity_type: 'Campo obligatorio',
      scheduled_date: 'Campo obligatorio',
      assignee_id: 'Campo obligatorio',
    });
  });

  it('rejects a type that is not in the list', () => {
    expect(
      errorsOf(parse({ activity_type: 'grafting' as never })).activity_type,
    ).toBe('Campo obligatorio');
  });

  it('accepts today and rejects yesterday when scheduling', () => {
    expect(parse({ scheduled_date: TODAY }).success).toBe(true);
    expect(errorsOf(parse({ scheduled_date: '2026-10-21' }))).toEqual({
      scheduled_date: PAST_DATE_MESSAGE,
    });
    expect(PAST_DATE_MESSAGE).toBe('La fecha debe ser actual o futura');
  });

  it('rejects a date that does not exist', () => {
    expect(errorsOf(parse({ scheduled_date: '2026-02-30' }))).toEqual({
      scheduled_date: 'Escribe una fecha válida.',
    });
  });

  it('asks what the labor is only with the type other', () => {
    expect(errorsOf(parse({ activity_type: 'other' }))).toEqual({
      other_description: 'Campo obligatorio',
    });
    expect(parse({ activity_type: 'pruning' }).success).toBe(true);
  });

  it('wants from 2 to 80 characters in the description', () => {
    const other = (other_description: string) =>
      parse({ activity_type: 'other', other_description });

    expect(errorsOf(other(' R ')).other_description).toBe(
      'Escribe al menos 2 caracteres.',
    );
    expect(errorsOf(other('x'.repeat(81))).other_description).toBe(
      'Usa máximo 80 caracteres.',
    );
    expect(other('x'.repeat(80)).success).toBe(true);
  });

  it('trims the description and drops it with any other type', () => {
    const other = parse({
      activity_type: 'other',
      other_description: '  Resiembra ',
    });
    const pruning = parse({
      activity_type: 'pruning',
      other_description: 'Resiembra',
    });

    expect(other.success && other.data.other_description).toBe('Resiembra');
    expect(pruning.success && pruning.data.other_description).toBeNull();
  });

  describe('editing', () => {
    const original = { scheduled_date: '2026-10-20' };

    it('keeps a past date that did not change, so a delayed one changes its assignee', () => {
      expect(
        parse({ scheduled_date: '2026-10-20', assignee_id: 'u2' }, original)
          .success,
      ).toBe(true);
    });

    it('wants today or later for a date that changes', () => {
      expect(
        errorsOf(parse({ scheduled_date: '2026-10-21' }, original)),
      ).toEqual({ scheduled_date: PAST_DATE_MESSAGE });
      expect(parse({ scheduled_date: '2026-10-23' }, original).success).toBe(
        true,
      );
    });
  });
});

describe('toCreateRequest', () => {
  const values = (input: Partial<ActivityFormInput> = {}) => {
    const result = parse(input);
    if (!result.success)
      throw new Error('El formulario de prueba no es válido');
    return result.data;
  };

  it('sends the plot, the type, the date, the assignee and the id of the device', () => {
    const body = toCreateRequest(values(), 'new-id');

    expectTypeOf(body).toExtend<Schemas['ActivityCreateRequest']>();
    expect(body).toEqual({
      id: 'new-id',
      plot_id: 'pl1',
      activity_type: 'fertilization',
      scheduled_date: '2026-10-25',
      assignee_id: 'u1',
    });
  });

  it('sends the description only with the type other', () => {
    expect(
      toCreateRequest(
        values({ activity_type: 'other', other_description: 'Resiembra' }),
        'new-id',
      ),
    ).toMatchObject({ activity_type: 'other', other_description: 'Resiembra' });
  });
});

describe('toFormValues', () => {
  it('fills the form with the activity', () => {
    expect(
      toFormValues(
        buildAgriculturalActivity({
          activity_type: 'other',
          other_description: 'Resiembra',
          scheduled_date: '2026-10-20',
          assignee: buildAssignee({ id: 'u7' }),
        }),
      ),
    ).toEqual({
      farm_id: 'f1',
      plot_id: 'pl1',
      activity_type: 'other',
      other_description: 'Resiembra',
      scheduled_date: '2026-10-20',
      assignee_id: 'u7',
    });
  });
});

describe('toUpdateRequest', () => {
  const activity = buildAgriculturalActivity({
    scheduled_date: '2026-10-25',
    version: 3,
  });
  const values = (input: Partial<ActivityFormInput>) => {
    const result = parse(
      { ...toFormValues(activity), ...input },
      { scheduled_date: activity.scheduled_date },
    );
    if (!result.success)
      throw new Error('El formulario de prueba no es válido');
    return result.data;
  };

  it('sends only what changed, with the version that was read', () => {
    const body = toUpdateRequest(
      values({ scheduled_date: '2026-10-28', assignee_id: 'u2' }),
      activity,
    );

    expectTypeOf(body).toExtend<
      Schemas['PatchedActivityUpdateRequest'] | null
    >();
    expect(body).toEqual({
      scheduled_date: '2026-10-28',
      assignee_id: 'u2',
      expected_version: 3,
    });
  });

  it('sends nothing when nothing changed', () => {
    expect(toUpdateRequest(values({}), activity)).toBeNull();
  });

  it('sends the description when the type becomes other', () => {
    expect(
      toUpdateRequest(
        values({ activity_type: 'other', other_description: 'Resiembra' }),
        activity,
      ),
    ).toEqual({
      activity_type: 'other',
      other_description: 'Resiembra',
      expected_version: 3,
    });
  });

  it('sends only the description when it is all that changed', () => {
    const other = buildAgriculturalActivity({
      activity_type: 'other',
      other_description: 'Resiembra',
      scheduled_date: '2026-10-25',
    });
    const result = parse(
      { ...toFormValues(other), other_description: 'Drenajes' },
      { scheduled_date: other.scheduled_date },
    );

    expect(result.success && toUpdateRequest(result.data, other)).toEqual({
      other_description: 'Drenajes',
      expected_version: 1,
    });
  });

  it('leaves the description to the server when the type stops being other', () => {
    const other = buildAgriculturalActivity({
      activity_type: 'other',
      other_description: 'Resiembra',
      scheduled_date: '2026-10-25',
    });
    const result = parse(
      { ...toFormValues(other), activity_type: 'pruning' },
      { scheduled_date: other.scheduled_date },
    );

    expect(result.success && toUpdateRequest(result.data, other)).toEqual({
      activity_type: 'pruning',
      expected_version: 1,
    });
  });
});

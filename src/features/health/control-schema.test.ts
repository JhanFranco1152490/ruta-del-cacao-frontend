import { describe, expect, it } from 'vitest';

import { PAST_DATE_MESSAGE } from '@/lib/activity-dates';

import {
  type ControlFormInput,
  createControlSchema,
  emptyControlForm,
  toDetectionControlRequest,
} from './control-schema';

const TODAY = '2026-10-22';
const schema = createControlSchema({
  today: TODAY,
  monitoringDate: '2026-10-19',
});

const form = (overrides: Partial<ControlFormInput> = {}): ControlFormInput => ({
  ...emptyControlForm('c1', 'scheduled', TODAY),
  ...overrides,
});

const errorsOf = (input: ControlFormInput) => {
  const result = schema.safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [
          issue.path.join('.'),
          issue.message,
        ]),
      );
};

describe('emptyControlForm', () => {
  it('starts a control done today, or one for later without a date', () => {
    expect(emptyControlForm('c1', 'done', TODAY)).toMatchObject({
      mode: 'done',
      done_date: TODAY,
      scheduled_date: '',
    });
    expect(emptyControlForm('c1', 'scheduled', TODAY)).toMatchObject({
      mode: 'scheduled',
      done_date: '',
      scheduled_date: '',
    });
  });
});

describe('the control form', () => {
  it('wants the date from today and the assignee of a control for later', () => {
    expect(errorsOf(form())).toEqual({
      scheduled_date: 'Indica la fecha',
      assignee_id: 'Elige el responsable',
    });
    expect(
      errorsOf(form({ scheduled_date: '2026-10-21', assignee_id: 'u1' })),
    ).toEqual({ scheduled_date: PAST_DATE_MESSAGE });
    expect(
      errorsOf(form({ scheduled_date: '2026-10-25', assignee_id: 'u1' })),
    ).toEqual({});
  });

  it('wants the date of a done control between the monitoring and today', () => {
    const done = (done_date: string) =>
      form({
        mode: 'done',
        done_date,
        assignee_id: 'u1',
        method: 'fruit_removal',
      });
    expect(errorsOf(done('2026-10-20'))).toEqual({});
    expect(errorsOf(done('2026-10-23'))).toEqual({
      done_date: 'La fecha no puede ser futura',
    });
    expect(errorsOf(done('2026-10-18'))).toEqual({
      done_date:
        'La fecha no puede ser anterior a la fecha del monitoreo (19 de octubre de 2026)',
    });
  });

  it('wants what was done and who did it, and the product applied', () => {
    expect(errorsOf(form({ mode: 'done', done_date: TODAY }))).toEqual({
      method: 'Indica qué hiciste',
      assignee_id: 'Elige el responsable',
    });
    expect(
      errorsOf(
        form({
          mode: 'done',
          done_date: TODAY,
          assignee_id: 'u1',
          method: 'product_application',
        }),
      ),
    ).toEqual({ inputs: 'Agrega el producto que aplicaste' });
  });
});

describe('toDetectionControlRequest', () => {
  const CAPTURED = '2026-10-22T15:00:00Z';

  it('sends a control for later with its date, assignee and optional plan', () => {
    expect(
      toDetectionControlRequest(
        schema.parse(
          form({
            scheduled_date: '2026-10-25',
            assignee_id: 'u1',
            method: 'other',
            method_description: ' Quemar las ramas ',
            planned_input_id: 'copper',
          }),
        ),
        CAPTURED,
      ),
    ).toEqual({
      id: 'c1',
      mode: 'scheduled',
      scheduled_date: '2026-10-25',
      assignee_id: 'u1',
      method: 'other',
      method_description: 'Quemar las ramas',
      planned_input_id: 'copper',
    });
  });

  it('sends a done control with its date, assignee and inputs', () => {
    expect(
      toDetectionControlRequest(
        schema.parse(
          form({
            mode: 'done',
            done_date: '2026-10-20',
            assignee_id: 'u1',
            method: 'product_application',
            inputs: [{ input_id: 'copper', quantity: '2,5' }],
          }),
        ),
        CAPTURED,
      ),
    ).toEqual({
      id: 'c1',
      mode: 'done',
      done_date: '2026-10-20',
      assignee_id: 'u1',
      method: 'product_application',
      method_description: null,
      inputs: [{ input_id: 'copper', quantity: '2.5' }],
      captured_at: CAPTURED,
    });
  });
});

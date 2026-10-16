import { describe, expect, it } from 'vitest';

import { PAST_DATE_MESSAGE } from '@/lib/activity-dates';

import { OTHER_PEST_DISEASE } from './monitoring-rules';
import { emptyControl, emptyDetection } from './monitoring-form';
import type {
  DetectionFormInput,
  MonitoringFormInput,
} from './monitoring-form';
import { createMonitoringSchema } from './monitoring-schema';

const TODAY = '2026-10-22';
// Programado el 8 de octubre, a las 9 de la mañana en Bogotá.
const SCHEDULED_AT = '2026-10-08T09:00:00-05:00';

const schema = createMonitoringSchema({
  today: TODAY,
  scheduledAt: SCHEDULED_AT,
});

const detection = (
  overrides: Partial<DetectionFormInput> = {},
): DetectionFormInput => ({
  ...emptyDetection('d1', 'c1'),
  pest_disease_id: 'monilia',
  affected_units: '12',
  ...overrides,
});

const form = (
  overrides: Partial<MonitoringFormInput> = {},
): MonitoringFormInput => ({
  done_date: '2026-10-19',
  sampling_unit: 'trees',
  evaluated_units: '50',
  sampling_method: 'zigzag',
  no_presence: false,
  notes: '',
  detections: [detection()],
  ...overrides,
});

const errorsOf = (input: MonitoringFormInput) => {
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

describe('the monitoring form', () => {
  it('accepts a monitoring with one detection and no control', () => {
    expect(errorsOf(form())).toEqual({});
  });

  it('accepts a monitoring without presence and without detections', () => {
    expect(errorsOf(form({ no_presence: true, detections: [] }))).toEqual({});
  });

  it('checks the date like the completion of an activity', () => {
    expect(errorsOf(form({ done_date: '2026-10-23' }))).toEqual({
      done_date: 'La fecha no puede ser futura',
    });
    expect(errorsOf(form({ done_date: '2026-10-07' }))).toEqual({
      done_date:
        'La fecha no puede ser anterior a la programación de la actividad (8 de octubre de 2026)',
    });
  });

  it('wants how many units were evaluated', () => {
    expect(errorsOf(form({ evaluated_units: '0' }))).toMatchObject({
      evaluated_units: 'Indica cuántas unidades evaluaste',
    });
    expect(errorsOf(form({ evaluated_units: '' }))).toMatchObject({
      evaluated_units: 'Indica cuántas unidades evaluaste',
    });
  });

  it('wants a detection or the mark of no presence', () => {
    expect(errorsOf(form({ detections: [] }))).toEqual({
      detections: 'Agrega al menos una detección o marca Sin presencia',
    });
  });

  it('ignores the detections left behind when marking no presence', () => {
    expect(
      errorsOf(
        form({
          no_presence: true,
          detections: [detection({ affected_units: '' })],
        }),
      ),
    ).toEqual({});
  });

  it('wants the affected units of each detection, up to the evaluated ones', () => {
    expect(
      errorsOf(form({ detections: [detection({ affected_units: '0' })] })),
    ).toEqual({
      'detections.0.affected_units': 'Indica las unidades afectadas',
    });
    expect(
      errorsOf(form({ detections: [detection({ affected_units: '60' })] })),
    ).toEqual({
      'detections.0.affected_units':
        'Las unidades afectadas no pueden superar las evaluadas (50)',
    });
  });

  it('wants the pest or disease of each detection', () => {
    expect(
      errorsOf(form({ detections: [detection({ pest_disease_id: '' })] })),
    ).toEqual({
      'detections.0.pest_disease_id': 'Elige la plaga o enfermedad',
    });
  });

  it('wants what was found when choosing Other, up to 100 characters', () => {
    const other = (text: string) =>
      detection({
        pest_disease_id: OTHER_PEST_DISEASE,
        other_description: text,
      });
    expect(errorsOf(form({ detections: [other(' ')] }))).toEqual({
      'detections.0.other_description': 'Escribe qué encontraste',
    });
    expect(errorsOf(form({ detections: [other('a'.repeat(101))] }))).toEqual({
      'detections.0.other_description': 'Usa máximo 100 caracteres.',
    });
  });

  it('marks a repeated pest and a repeated Other written in another way', () => {
    const repeated =
      'Esta plaga o enfermedad ya está en la lista. Modifica la detección existente';
    expect(
      errorsOf(form({ detections: [detection(), detection({ id: 'd2' })] })),
    ).toEqual({ 'detections.1.pest_disease_id': repeated });
    expect(
      errorsOf(
        form({
          detections: [
            detection({
              pest_disease_id: OTHER_PEST_DISEASE,
              other_description: 'Hormigas en hojas',
            }),
            detection({
              id: 'd2',
              pest_disease_id: OTHER_PEST_DISEASE,
              other_description: 'HORMIGAS en hojas',
            }),
          ],
        }),
      ),
    ).toEqual({ 'detections.1.other_description': repeated });
  });

  it('wants the notes up to 500 characters', () => {
    expect(errorsOf(form({ notes: 'a'.repeat(501) }))).toEqual({
      notes: 'Usa máximo 500 caracteres.',
    });
  });
});

describe('the control of a detection', () => {
  const withControl = (control: Partial<DetectionFormInput['control']>) =>
    form({
      detections: [
        detection({ control: { ...emptyControl('c1'), ...control } }),
      ],
    });

  it('wants what was done for a control done in the moment', () => {
    expect(errorsOf(withControl({ mode: 'done' }))).toEqual({
      'detections.0.control.method': 'Indica qué hiciste',
    });
    expect(
      errorsOf(withControl({ mode: 'done', method: 'fruit_removal' })),
    ).toEqual({});
  });

  it('wants the description of Other', () => {
    expect(errorsOf(withControl({ mode: 'done', method: 'other' }))).toEqual({
      'detections.0.control.method_description': 'Escribe qué hiciste',
    });
    expect(
      errorsOf(
        withControl({
          mode: 'scheduled',
          method: 'other',
          scheduled_date: TODAY,
          assignee_id: 'u1',
        }),
      ),
    ).toEqual({
      'detections.0.control.method_description': 'Escribe qué se va a hacer',
    });
  });

  it('wants the product applied and checks its rows like the completion', () => {
    expect(
      errorsOf(withControl({ mode: 'done', method: 'product_application' })),
    ).toEqual({
      'detections.0.control.inputs': 'Agrega el producto que aplicaste',
    });
    expect(
      errorsOf(
        withControl({
          mode: 'done',
          method: 'product_application',
          inputs: [{ input_id: 'cobre', quantity: '0' }],
        }),
      ),
    ).toEqual({
      'detections.0.control.inputs.0.quantity':
        'La cantidad debe ser mayor que cero',
    });
  });

  it('wants the date from today and the assignee of a control for later', () => {
    expect(errorsOf(withControl({ mode: 'scheduled' }))).toEqual({
      'detections.0.control.scheduled_date': 'Indica la fecha',
      'detections.0.control.assignee_id': 'Elige el responsable',
    });
    expect(
      errorsOf(
        withControl({
          mode: 'scheduled',
          scheduled_date: '2026-10-21',
          assignee_id: 'u1',
        }),
      ),
    ).toEqual({ 'detections.0.control.scheduled_date': PAST_DATE_MESSAGE });
  });

  it('asks nothing when the control is requested from who schedules', () => {
    expect(errorsOf(withControl({ mode: 'requested' }))).toEqual({});
  });
});

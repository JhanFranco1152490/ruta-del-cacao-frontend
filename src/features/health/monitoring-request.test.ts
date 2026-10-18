import { describe, expect, it } from 'vitest';

import { OTHER_PEST_DISEASE } from './monitoring-rules';
import { emptyControl, emptyDetection } from './monitoring-form';
import type {
  DetectionFormInput,
  MonitoringFormInput,
} from './monitoring-form';
import { createMonitoringSchema } from './monitoring-schema';
import { toMonitoringRequest } from './monitoring-request';
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

describe('toMonitoringRequest', () => {
  const CAPTURED = '2026-10-19T15:20:00Z';
  const toRequest = (input: MonitoringFormInput) =>
    toMonitoringRequest(schema.parse(input), CAPTURED);

  it('sends the sampling, the notes and each detection with its device id', () => {
    expect(
      toRequest(
        form({
          sampling_method: '',
          notes: ' Foco en la zona baja. ',
          detections: [
            detection(),
            detection({
              id: 'd2',
              pest_disease_id: OTHER_PEST_DISEASE,
              other_description: ' Hormigas en las hojas ',
              affected_units: '3',
            }),
          ],
        }),
      ),
    ).toEqual({
      done_date: '2026-10-19',
      sampling_unit: 'trees',
      evaluated_units: 50,
      sampling_method: null,
      notes: 'Foco en la zona baja.',
      no_presence: false,
      detections: [
        {
          id: 'd1',
          pest_disease_id: 'monilia',
          other_description: null,
          affected_units: 12,
          control: null,
          control_requested: false,
        },
        {
          id: 'd2',
          pest_disease_id: null,
          other_description: 'Hormigas en las hojas',
          affected_units: 3,
          control: null,
          control_requested: false,
        },
      ],
      captured_at: CAPTURED,
    });
  });

  it('sends no detections without presence, and no notes when empty', () => {
    expect(toRequest(form({ no_presence: true, notes: '  ' }))).toMatchObject({
      no_presence: true,
      detections: [],
      notes: null,
    });
  });

  it('sends a control done in the moment with its method and inputs', () => {
    const request = toRequest(
      form({
        detections: [
          detection({
            control: {
              ...emptyControl('c1'),
              mode: 'done',
              method: 'product_application',
              inputs: [{ input_id: 'cobre', quantity: '0,5' }],
            },
          }),
        ],
      }),
    );

    expect(request.detections?.[0].control).toEqual({
      id: 'c1',
      mode: 'done',
      method: 'product_application',
      method_description: null,
      inputs: [{ input_id: 'cobre', quantity: '0.5' }],
    });
  });

  it('sends a control for later with its date, assignee and optional plan', () => {
    const request = toRequest(
      form({
        detections: [
          detection({
            control: {
              ...emptyControl('c1'),
              mode: 'scheduled',
              scheduled_date: '2026-10-22',
              assignee_id: 'u1',
              method: 'other',
              method_description: ' Quemar las ramas ',
              planned_input_id: '',
            },
          }),
        ],
      }),
    );

    expect(request.detections?.[0].control).toEqual({
      id: 'c1',
      mode: 'scheduled',
      scheduled_date: '2026-10-22',
      assignee_id: 'u1',
      method: 'other',
      method_description: 'Quemar las ramas',
      planned_input_id: null,
    });
  });

  it('asks for the control instead of sending one when it is requested', () => {
    const request = toRequest(
      form({
        detections: [
          detection({
            control: { ...emptyControl('c1'), mode: 'requested' },
          }),
        ],
      }),
    );

    expect(request.detections?.[0]).toMatchObject({
      control: null,
      control_requested: true,
    });
  });
});

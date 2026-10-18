import { describe, expect, it } from 'vitest';

import {
  monitoringLabel,
  queuedToMonitoringForm,
} from './monitoring-correction';
import type { QueuedMonitoring } from './monitoring-queue';

const queued = (
  overrides: Partial<QueuedMonitoring> = {},
): QueuedMonitoring => ({
  activityId: 'a1',
  label: 'P-03 · 19 de octubre',
  status: 'error',
  request: {
    done_date: '2026-10-19',
    sampling_unit: 'pods',
    evaluated_units: 50,
    sampling_method: 'zigzag',
    notes: 'Foco en la zona baja.',
    no_presence: false,
    detections: [
      {
        id: 'd1',
        pest_disease_id: 'monilia',
        other_description: null,
        affected_units: 12,
        control: {
          id: 'c1',
          mode: 'done',
          method: 'product_application',
          method_description: null,
          inputs: [{ input_id: 'copper', quantity: '0.5' }],
        },
        control_requested: false,
      },
      {
        id: 'd2',
        pest_disease_id: null,
        other_description: 'Hormigas en hojas',
        affected_units: 3,
        control: {
          id: 'c2',
          mode: 'scheduled',
          scheduled_date: '2026-10-22',
          assignee_id: 'u1',
          method: null,
          method_description: null,
          planned_input_id: null,
        },
        control_requested: false,
      },
      {
        id: 'd3',
        pest_disease_id: 'trips',
        other_description: null,
        affected_units: 1,
        control: null,
        control_requested: true,
      },
    ],
  },
  ...overrides,
});

const newId = () => 'new-control';

describe('queuedToMonitoringForm', () => {
  it('opens what was captured, with the same ids', () => {
    const { values, unavailableRows } = queuedToMonitoringForm(
      queued(),
      new Set(['monilia', 'trips']),
      newId,
    );

    expect(unavailableRows).toEqual([]);
    expect(values).toEqual({
      done_date: '2026-10-19',
      sampling_unit: 'pods',
      evaluated_units: '50',
      sampling_method: 'zigzag',
      no_presence: false,
      notes: 'Foco en la zona baja.',
      detections: [
        {
          id: 'd1',
          pest_disease_id: 'monilia',
          other_description: '',
          affected_units: '12',
          control: {
            id: 'c1',
            mode: 'done',
            method: 'product_application',
            method_description: '',
            inputs: [{ input_id: 'copper', quantity: '0.5' }],
            scheduled_date: '',
            assignee_id: '',
            planned_input_id: '',
          },
        },
        {
          id: 'd2',
          pest_disease_id: 'other',
          other_description: 'Hormigas en hojas',
          affected_units: '3',
          control: {
            id: 'c2',
            mode: 'scheduled',
            method: '',
            method_description: '',
            inputs: [],
            scheduled_date: '2026-10-22',
            assignee_id: 'u1',
            planned_input_id: '',
          },
        },
        {
          id: 'd3',
          pest_disease_id: 'trips',
          other_description: '',
          affected_units: '1',
          control: {
            id: 'new-control',
            mode: 'requested',
            method: '',
            method_description: '',
            inputs: [],
            scheduled_date: '',
            assignee_id: '',
            planned_input_id: '',
          },
        },
      ],
    });
  });

  it('asks to choose again the pest the server rejected, keeping the rest', () => {
    const { values, unavailableRows } = queuedToMonitoringForm(
      queued({
        errorCode: 'pest_disease_inactive',
        errorData: { pest_disease_ids: ['monilia'] },
      }),
      new Set(['monilia', 'trips']),
      newId,
    );

    expect(unavailableRows).toEqual([0]);
    expect(values.detections[0]).toMatchObject({
      pest_disease_id: '',
      affected_units: '12',
    });
  });

  it('asks to choose again a pest that is no longer among the active ones', () => {
    const { unavailableRows } = queuedToMonitoringForm(
      queued(),
      new Set(['monilia']),
      newId,
    );

    expect(unavailableRows).toEqual([2]);
  });

  it('asks to choose again the inputs the server rejected, keeping their quantity', () => {
    const rejected = queued({
      errorCode: 'input_inactive',
      errorData: { input_ids: ['copper'] },
    });
    rejected.request.detections![1].control = {
      id: 'c2',
      mode: 'scheduled',
      scheduled_date: '2026-10-22',
      assignee_id: 'u1',
      planned_input_id: 'copper',
    };

    const { values } = queuedToMonitoringForm(
      rejected,
      new Set(['monilia', 'trips']),
      newId,
    );

    expect(values.detections[0].control.inputs).toEqual([
      { input_id: '', quantity: '0.5' },
    ]);
    expect(values.detections[1].control.planned_input_id).toBe('');
  });

  it('keeps the pests as they are while the catalog is not in the device', () => {
    const { unavailableRows } = queuedToMonitoringForm(
      queued(),
      undefined,
      newId,
    );

    expect(unavailableRows).toEqual([]);
  });
});

describe('monitoringLabel', () => {
  it('names a monitoring by its plot and its date', () => {
    expect(monitoringLabel('P-03', '2026-10-19')).toBe('P-03 · 19 de octubre');
  });
});

import { describe, expect, it } from 'vitest';

import { OTHER_PEST_DISEASE } from './monitoring-rules';
import { emptyControl, emptyDetection } from './monitoring-form';
import type {
  DetectionFormInput,
  MonitoringFormInput,
} from './monitoring-form';
import { createMonitoringSchema } from './monitoring-schema';
import { monitoringSummary } from './monitoring-summary';
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

describe('monitoringSummary', () => {
  const names = {
    plotCode: 'P-03',
    pestName: (id: string) => (id === 'monilia' ? 'Monilia' : id),
    assigneeName: (id: string) => (id === 'u1' ? 'Carlos Rincón' : id),
    photoCount: 2,
  };

  it('says what is going to be registered, detection by detection', () => {
    const values = schema.parse(
      form({
        detections: [
          detection({
            control: {
              ...emptyControl('c1'),
              mode: 'done',
              method: 'fruit_removal',
            },
          }),
          detection({
            id: 'd2',
            pest_disease_id: OTHER_PEST_DISEASE,
            other_description: 'Hormigas en hojas',
            affected_units: '3',
            control: {
              ...emptyControl('c2'),
              mode: 'scheduled',
              scheduled_date: '2026-10-22',
              assignee_id: 'u1',
            },
          }),
        ],
      }),
    );

    expect(monitoringSummary(values, names)).toEqual({
      heading: 'P-03 · 19 de octubre · 50 árboles evaluados',
      detections: [
        {
          title: 'Monilia: 12 árboles · 24 %',
          control: 'Control: remoción de frutos enfermos (hecho)',
        },
        {
          title: 'Otra (Hormigas en hojas): 3 árboles · 6 %',
          control: 'Control: programado para el 22 de octubre · Carlos Rincón',
        },
      ],
      photos: '2 fotos adjuntas',
    });
  });

  it('says the control is left for later or requested, and that nothing was found', () => {
    const requested = monitoringSummary(
      schema.parse(
        form({
          detections: [
            detection({
              control: { ...emptyControl('c1'), mode: 'requested' },
            }),
          ],
        }),
      ),
      { ...names, photoCount: 1 },
    );
    expect(requested.detections[0].control).toBe(
      'Control: se pidió que lo programen',
    );
    expect(requested.photos).toBe('1 foto adjunta');

    const none = monitoringSummary(schema.parse(form()), {
      ...names,
      photoCount: 0,
    });
    expect(none.detections[0].control).toBe('Control: ninguno por ahora');
    expect(none.photos).toBeNull();

    const clean = monitoringSummary(
      schema.parse(form({ no_presence: true, detections: [] })),
      names,
    );
    expect(clean.heading).toBe(
      'P-03 · 19 de octubre · 50 árboles evaluados · Sin presencia de plagas ni enfermedades',
    );
    expect(clean.detections).toEqual([]);
  });
});

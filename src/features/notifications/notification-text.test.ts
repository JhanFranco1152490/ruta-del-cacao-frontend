import { describe, expect, it } from 'vitest';

import type { components } from '@/lib/api/schema';
import {
  buildAgriculturalActivity,
  buildAssignee,
  buildNotification,
} from '@/test/factories';

import { describeNotification } from './notification-text';

type Notification = components['schemas']['Notification'];
type Activity = components['schemas']['AgriculturalActivity'];

const LUIS = buildAssignee({ id: 'u-luis', full_name: 'Luis Mora' });

const activity = (overrides: Partial<Activity> = {}) =>
  buildAgriculturalActivity({
    id: 'a1',
    activity_type: 'fertilization',
    scheduled_date: '2026-10-20',
    assignee: LUIS,
    plot: {
      id: 'pl1',
      code: 'P-03',
      name: null,
      is_active: true,
      farm: { id: 'f1', code: 'F01', name: 'La Esperanza', is_active: true },
    },
    ...overrides,
  });

const notice = (
  kind: Notification['kind'],
  overrides: Partial<Notification> = {},
) =>
  buildNotification({
    kind,
    condition_date: '2026-10-20',
    activity: activity(),
    ...overrides,
  });

// Quien lee: el Capataz (no es el responsable) o Luis (sí lo es).
const FOREMAN = 'u-foreman';
const describeFor = (
  notification: Notification,
  today: string,
  userId = FOREMAN,
) => describeNotification(notification, { userId, today });

describe('describeNotification · upcoming', () => {
  it('counts the days left to its date', () => {
    expect(describeFor(notice('activity_upcoming'), '2026-10-18')).toEqual({
      look: 'upcoming',
      title: 'Actividad próxima a su fecha',
      subject: 'Fertilización · P-03 · La Esperanza',
      detail: 'Faltan 2 días · 20 oct',
      stale: false,
      href: '/actividades?mes=2026-10&actividad=a1',
    });
    expect(describeFor(notice('activity_upcoming'), '2026-10-19').detail).toBe(
      'Es mañana · 20 oct',
    );
    expect(describeFor(notice('activity_upcoming'), '2026-10-20').detail).toBe(
      'Es hoy · 20 oct',
    );
  });

  it('names an activity of type Other by what was written', () => {
    const other = notice('activity_upcoming', {
      activity: activity({
        activity_type: 'other',
        other_description: 'Resiembra',
      }),
    });

    expect(describeFor(other, '2026-10-18').subject).toBe(
      'Resiembra · P-03 · La Esperanza',
    );
  });
});

describe('describeNotification · delayed', () => {
  const delayed = notice('activity_delayed');

  it('tells the assignee that it is theirs and until when it can be moved', () => {
    expect(describeFor(delayed, '2026-10-21', 'u-luis')).toMatchObject({
      look: 'delayed',
      title: 'Tu actividad está retrasada · 1 día de retraso',
      detail:
        'Regístrala si ya la hiciste. Se puede reprogramar hasta el 22 oct',
      stale: false,
    });
    expect(describeFor(delayed, '2026-10-22', 'u-luis')).toMatchObject({
      title: 'Último día para reprogramar tu actividad · 2 días de retraso',
      detail: 'Regístrala si ya la hiciste. Mañana queda vencida',
    });
  });

  it('tells the others who is in charge', () => {
    expect(describeFor(delayed, '2026-10-21')).toMatchObject({
      title: 'Actividad retrasada · 1 día de retraso',
      detail: 'Responsable: Luis Mora · se puede reprogramar hasta el 22 oct',
    });
    expect(describeFor(delayed, '2026-10-22')).toMatchObject({
      title: 'Actividad retrasada · 2 días de retraso',
      detail: 'Responsable: Luis Mora · último día para reprogramarla',
    });
  });

  it('is no longer current once the activity is overdue', () => {
    expect(describeFor(delayed, '2026-10-23')).toMatchObject({
      detail: 'Vencida desde el 23 oct',
      stale: true,
    });
  });
});

describe('describeNotification · overdue', () => {
  const overdue = notice('activity_overdue');

  it('counts the days late of today, not of when it arrived', () => {
    expect(describeFor(overdue, '2026-10-23', 'u-luis')).toMatchObject({
      look: 'overdue',
      title: 'Tu actividad está vencida · 3 días de retraso',
      detail: 'Vencida desde el 23 oct',
    });
    expect(describeFor(overdue, '2026-10-25')).toMatchObject({
      title: 'Actividad vencida · 5 días de retraso',
      detail: 'Responsable: Luis Mora · vencida desde el 23 oct',
    });
  });
});

describe('describeNotification · what the activity is now', () => {
  it('says that it was done, dimmed', () => {
    const done = notice('activity_overdue', {
      activity: activity({ status: 'done', done_date: '2026-10-24' }),
    });

    expect(describeFor(done, '2026-10-26')).toMatchObject({
      title: 'Actividad vencida',
      detail: 'Realizada el 24 oct',
      stale: true,
    });
  });

  it('says that it was moved, dimmed', () => {
    const moved = notice('activity_upcoming', {
      activity: activity({ scheduled_date: '2026-10-25' }),
    });

    expect(describeFor(moved, '2026-10-19')).toMatchObject({
      title: 'Actividad próxima a su fecha',
      detail: 'Reprogramada para el 25 oct',
      stale: true,
      href: '/actividades?mes=2026-10&actividad=a1',
    });
  });

  it('says that the date passed when an upcoming one was not recorded', () => {
    expect(
      describeFor(notice('activity_upcoming'), '2026-10-21'),
    ).toMatchObject({ detail: 'Ya pasó su fecha, el 20 oct', stale: true });
  });
});

describe('describeNotification · control pending', () => {
  type Detection = components['schemas']['DetectionOutput'];
  const detection = (overrides: Partial<Detection> = {}): Detection => ({
    id: 'd1',
    pest_disease: {
      id: 'monilia',
      name: 'Monilia',
      kind: 'disease',
      is_active: true,
    },
    other_description: null,
    affected_units: 12,
    incidence: '24.00',
    controls: [],
    control_request: {
      requested_by: { id: 'u-luis', full_name: 'Luis Mora' },
      requested_at: '2026-10-06T15:20:00Z',
      dismissed_by: null,
      dismissed_at: null,
    },
    ...overrides,
  });
  const pending = (found: Detection) =>
    notice('detection_control_pending', {
      detection_id: 'd1',
      condition_date: null,
      activity: activity({
        id: 'm1',
        activity_type: 'phytosanitary_monitoring',
        status: 'done',
        scheduled_date: '2026-10-05',
        done_date: '2026-10-06',
        monitoring: {
          sampling_unit: 'trees',
          evaluated_units: 50,
          sampling_method: null,
          notes: null,
          no_presence: false,
          detections: [found],
          detections_without_control: 1,
          evidence_count: 0,
        },
      }),
    });

  it('names the pest, the plot and who asked for it', () => {
    expect(describeFor(pending(detection()), '2026-10-07')).toEqual({
      look: 'control',
      title: 'Control pendiente',
      subject: 'Monilia · P-03 · La Esperanza',
      detail: 'Lo pidió Luis Mora el 6 oct',
      stale: false,
      href: '/actividades?mes=2026-10&actividad=m1',
    });
  });

  it('names what was written when the pest is Other', () => {
    const other = detection({
      pest_disease: null,
      other_description: 'Hormigas en hojas',
    });

    expect(describeFor(pending(other), '2026-10-07').subject).toBe(
      'Hormigas en hojas · P-03 · La Esperanza',
    );
  });

  it('is no longer current once it has a control or it needs none', () => {
    const controlled = detection({
      controls: [
        {
          id: 'c1',
          method: null,
          method_description: null,
          scheduled_date: '2026-10-20',
          state: 'scheduled',
          done_date: null,
        },
      ],
    });
    const dismissed = detection({
      control_request: {
        requested_by: null,
        requested_at: '2026-10-06T15:20:00Z',
        dismissed_by: { id: 'u-foreman', full_name: 'Carlos Rincón' },
        dismissed_at: '2026-10-09T15:00:00Z',
      },
    });

    expect(describeFor(pending(controlled), '2026-10-10')).toMatchObject({
      detail: 'Control programado el 20 oct',
      stale: true,
    });
    expect(describeFor(pending(dismissed), '2026-10-10')).toMatchObject({
      detail: 'No requiere control',
      stale: true,
    });
  });
});

describe('describeNotification · what this version does not know', () => {
  it('shows a generic notice without a link', () => {
    const unknown = buildNotification({
      kind: 'drying_overdried' as Notification['kind'],
      activity: null,
    });

    expect(describeFor(unknown, '2026-10-20')).toEqual({
      look: 'generic',
      title: 'Aviso',
      subject: null,
      detail: null,
      stale: false,
      href: null,
    });
  });
});

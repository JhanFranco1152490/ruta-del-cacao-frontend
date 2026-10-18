import { describe, expect, it } from 'vitest';

import {
  controlRowText,
  type Detection,
  detectionName,
  detectionStatus,
} from './detection-status';

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
  control_request: null,
  ...overrides,
});

describe('detectionName', () => {
  it('names the pest of the catalog, or what was written in Other', () => {
    expect(detectionName(detection())).toBe('Monilia');
    expect(
      detectionName(
        detection({
          pest_disease: null,
          other_description: 'Hormigas en hojas',
        }),
      ),
    ).toBe('Otra (Hormigas en hojas)');
  });
});

describe('detectionStatus', () => {
  it('has no status while a control attends it', () => {
    expect(
      detectionStatus(
        detection({
          controls: [
            {
              id: 'c1',
              method: 'fruit_removal',
              method_description: null,
              scheduled_date: '2026-10-19',
              state: 'done',
              done_date: '2026-10-19',
            },
          ],
        }),
      ),
    ).toBeNull();
  });

  it('says it has no control', () => {
    expect(detectionStatus(detection())).toEqual({
      kind: 'none',
      text: 'Sin control',
    });
  });

  it('says who asked for a control and when', () => {
    expect(
      detectionStatus(
        detection({
          control_request: {
            requested_by: { id: 'u2', full_name: 'Luis Mora' },
            requested_at: '2026-10-19T15:20:00Z',
            dismissed_by: null,
            dismissed_at: null,
          },
        }),
      ),
    ).toEqual({
      kind: 'requested',
      text: 'Control solicitado por Luis Mora · 19 oct',
    });
  });

  it('says who decided that it needs no control and when', () => {
    expect(
      detectionStatus(
        detection({
          control_request: {
            requested_by: { id: 'u2', full_name: 'Luis Mora' },
            requested_at: '2026-10-19T15:20:00Z',
            dismissed_by: { id: 'u1', full_name: 'Carlos Rincón' },
            dismissed_at: '2026-10-20T14:00:00Z',
          },
        }),
      ),
    ).toEqual({
      kind: 'dismissed',
      text: 'No requiere control · Carlos Rincón, 20 oct',
    });
  });

  it('does not name an account that was deleted', () => {
    expect(
      detectionStatus(
        detection({
          control_request: {
            requested_by: null,
            requested_at: '2026-10-19T15:20:00Z',
            dismissed_by: null,
            dismissed_at: null,
          },
        }),
      )?.text,
    ).toBe('Control solicitado · 19 oct');
  });
});

describe('controlRowText', () => {
  it('says what was done, when and how it goes', () => {
    expect(
      controlRowText({
        id: 'c1',
        method: 'fruit_removal',
        method_description: null,
        scheduled_date: '2026-10-19',
        state: 'done',
        done_date: '2026-10-19',
      }),
    ).toBe('Remoción de frutos enfermos · 19 de octubre · Realizado');
  });

  it('says what is planned, or that it is still to be decided', () => {
    expect(
      controlRowText({
        id: 'c2',
        method: 'other',
        method_description: 'Quemar las ramas',
        scheduled_date: '2026-10-25',
        state: 'scheduled',
        done_date: null,
      }),
    ).toBe('Quemar las ramas · 25 de octubre · Programado');
    expect(
      controlRowText({
        id: 'c3',
        method: null,
        method_description: null,
        scheduled_date: '2026-10-21',
        state: 'overdue',
        done_date: null,
      }),
    ).toBe('Por decidir qué se hace · 21 de octubre · Vencido');
  });
});

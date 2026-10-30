import { describe, expect, it } from 'vitest';

import type { components } from '@/lib/api/schema';
import { buildLotBrief, buildNotification } from '@/test/factories';

import { describeNotification } from './notification-text';

type Notification = components['schemas']['Notification'];

const LOT_HREF = '/lotes/detalle?id=l1';
const CONTEXT = { userId: 'u1', today: '2026-10-21' };

// Un lote en fermentación en C-02 desde el 19 oct. a las 8:00 (ver `buildLotBrief`).
const fermenting = buildLotBrief();

// El mismo lote, ya en secado en M-01 desde el 23 oct. a las 9:00.
const drying = buildLotBrief({
  status: 'drying',
  fermentation: {
    started_at: '2026-10-19T08:00:00-05:00',
    ended_at: '2026-10-23T08:30:00-05:00',
    facility: 'C-02',
  },
  drying: {
    started_at: '2026-10-23T09:00:00-05:00',
    ended_at: null,
    facility: 'M-01',
    final_moisture_pct: null,
    dry_weight_kg: null,
    yield_pct: null,
  },
});

const notice = (overrides: Partial<Notification>) =>
  describeNotification(
    buildNotification({
      activity: null,
      condition_date: null,
      lot: fermenting,
      ...overrides,
    }),
    CONTEXT,
  );

describe('describeNotification · pending postharvest records', () => {
  it('reminds of the first turn with its time and offers to record it', () => {
    expect(
      notice({
        kind: 'fermentation_first_turn_due',
        condition_at: '2026-10-21T08:00:00-05:00',
      }),
    ).toEqual({
      look: 'pending',
      title: 'Se acerca el primer volteo',
      subject: '000123-F02-P05-261014-1 · La Esperanza · cajón C-02',
      detail: 'Toca el 21 oct. 08:00',
      stale: false,
      href: LOT_HREF,
      origin: 'Fermentación',
      action: {
        label: 'Registrar volteo',
        href: '/fermentacion/volteo?lote=l1',
      },
    });
  });

  it('says since when a turn is pending', () => {
    expect(
      notice({
        kind: 'fermentation_turn_due',
        condition_at: '2026-10-22T08:10:00-05:00',
      }),
    ).toMatchObject({
      look: 'pending',
      title: 'Volteo pendiente',
      detail: 'Pendiente desde el 22 oct. 08:10',
      stale: false,
      action: {
        label: 'Registrar volteo',
        href: '/fermentacion/volteo?lote=l1',
      },
    });
  });

  it('says which drying day is missing its log, on the dryer of the lot', () => {
    expect(
      notice({
        kind: 'drying_log_due',
        lot: drying,
        created_at: '2026-10-26T10:05:00-05:00',
        condition_at: '2026-10-26T09:30:00-05:00',
      }),
    ).toEqual({
      look: 'pending',
      title: 'Bitácora de secado pendiente',
      subject: '000123-F02-P05-261014-1 · La Esperanza · marquesina M-01',
      detail: 'Día 4 · pendiente desde el 26 oct. 09:30',
      stale: false,
      href: LOT_HREF,
      origin: 'Secado',
      action: { label: 'Registrar bitácora', href: '/secado/bitacora?lote=l1' },
    });
  });

  it('dims a pending record that already arrived, without the action', () => {
    const view = notice({
      kind: 'fermentation_turn_due',
      condition_at: '2026-10-22T08:10:00-05:00',
      resolved_at: '2026-10-22T14:20:00-05:00',
    });

    expect(view).toMatchObject({
      detail: 'Ya se registró · 22 oct. 14:20',
      stale: true,
    });
    expect(view.action).toBeUndefined();
  });

  it('says the lot already left the stage when it did', () => {
    expect(
      notice({
        kind: 'fermentation_turn_due',
        lot: drying,
        condition_at: '2026-10-22T08:10:00-05:00',
        resolved_at: '2026-10-23T08:30:00-05:00',
      }),
    ).toMatchObject({
      detail: 'El lote ya terminó la fermentación',
      stale: true,
    });
    const finished = notice({
      kind: 'drying_log_due',
      lot: { ...drying, status: 'dried' },
      condition_at: '2026-10-26T09:30:00-05:00',
    });
    expect(finished).toMatchObject({
      detail: 'El lote ya terminó el secado',
      stale: true,
    });
    expect(finished.action).toBeUndefined();
  });

  it('leaves out the facility when the lot does not have that stage', () => {
    expect(
      notice({
        kind: 'drying_log_due',
        condition_at: '2026-10-26T09:30:00-05:00',
      }).subject,
    ).toBe('000123-F02-P05-261014-1 · La Esperanza');
  });
});

describe('describeNotification · postharvest deviations', () => {
  const turn = (
    overrides: Partial<Notification['fermentation_turn']> = {},
  ) => ({
    id: 't2',
    number: 2,
    turned_at: '2026-10-21T08:00:00-05:00',
    temperature_c: '37.5',
    ph: '5.10',
    ...overrides,
  });

  const log = {
    id: 'g4',
    day_number: 4,
    measured_at: '2026-10-26T15:30:00-05:00',
    moisture_pct: '5.8',
  };

  it('writes the temperature of the turn, without an action', () => {
    expect(
      notice({
        kind: 'fermentation_temperature_low',
        fermentation_turn: turn(),
      }),
    ).toEqual({
      look: 'deviation',
      title: 'Temperatura por debajo del rango',
      subject: '000123-F02-P05-261014-1 · La Esperanza · cajón C-02',
      detail: 'Volteo 2 · 37,5 °C',
      stale: false,
      href: LOT_HREF,
      origin: 'Fermentación',
    });
    expect(
      notice({
        kind: 'fermentation_temperature_high',
        fermentation_turn: turn({ temperature_c: '53' }),
      }).detail,
    ).toBe('Volteo 2 · 53,0 °C');
  });

  it('writes the pH of the turn, and the hours when it does not drop', () => {
    expect(
      notice({
        kind: 'fermentation_ph_low',
        fermentation_turn: turn({ number: 3, ph: '3.9' }),
      }).detail,
    ).toBe('Volteo 3 · pH 3,90');
    expect(
      notice({
        kind: 'fermentation_ph_high',
        fermentation_turn: turn({
          number: 4,
          ph: '6.10',
          turned_at: '2026-10-23T10:00:00-05:00',
        }),
      }).detail,
    ).toBe('Volteo 4 · pH 6,10 a las 98 h');
  });

  it.each([
    ['drying_slow_stalled', 'Secado lento – riesgo de hongo'],
    ['drying_slow_duration', 'Secado lento – riesgo de hongo'],
    ['drying_accelerated', 'Secado acelerado – riesgo de daño físico'],
    ['drying_near_target', 'Próximo a meta – preparar ensacado'],
    ['drying_overdried', 'Sobresecado'],
  ] as const)('writes the moisture of the log for %s', (kind, title) => {
    expect(notice({ kind, lot: drying, drying_log: log })).toEqual({
      look: 'deviation',
      title,
      subject: '000123-F02-P05-261014-1 · La Esperanza · marquesina M-01',
      detail: 'Día 4 · 5,8 %',
      stale: false,
      href: LOT_HREF,
      origin: 'Secado',
    });
  });

  it('keeps a deviation readable after the lot left the stage', () => {
    expect(
      notice({
        kind: 'fermentation_temperature_low',
        lot: drying,
        fermentation_turn: turn(),
      }),
    ).toMatchObject({ stale: false, detail: 'Volteo 2 · 37,5 °C' });
  });
});

describe('describeNotification · without the subject', () => {
  it('shows a lot kind without its lot as a generic notice', () => {
    expect(notice({ kind: 'drying_overdried', lot: null })).toMatchObject({
      look: 'generic',
      title: 'Aviso',
      href: null,
    });
  });
});

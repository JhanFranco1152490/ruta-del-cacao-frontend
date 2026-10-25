import { describe, expect, it } from 'vitest';

import { dryingLotActions, dryingStageAction } from './lot-actions';

const BOTH = { logLogs: true, manage: true };

describe('dryingLotActions', () => {
  it('offers to start a fermented lot, opening its form in Secado', () => {
    const [start, ...rest] = dryingLotActions(
      { id: 'l1', status: 'fermented' },
      BOTH,
    );

    expect(rest).toEqual([]);
    expect(start.label).toBe('Iniciar secado');
    expect(start.href).toBe('/secado?vista=listos&iniciar=l1');
  });

  it('goes straight to the field page to record a log, and opens the finish form', () => {
    const actions = dryingLotActions({ id: 'l1', status: 'drying' }, BOTH);

    expect(actions.map(({ label, href }) => [label, href])).toEqual([
      ['Registrar bitácora', '/secado/bitacora?lote=l1'],
      ['Finalizar secado', '/secado?finalizar=l1'],
      ['Ver en Secado', '/secado'],
    ]);
  });

  it('leaves out starting and finishing for whom only records logs', () => {
    const actions = dryingLotActions(
      { id: 'l1', status: 'drying' },
      { logLogs: true, manage: false },
    );

    expect(actions.map(({ id }) => id)).toEqual([
      'record-log',
      'see-in-drying',
    ]);
    expect(
      dryingLotActions(
        { id: 'l1', status: 'fermented' },
        { logLogs: true, manage: false },
      ),
    ).toEqual([]);
  });

  it('offers nothing before the drying nor once it is over', () => {
    for (const status of ['generated', 'fermenting', 'dried'] as const) {
      expect(dryingLotActions({ id: 'l1', status }, BOTH)).toEqual([]);
    }
  });
});

describe('dryingStageAction', () => {
  it('leads the fermented lots to the ones ready to dry', () => {
    expect(dryingStageAction('fermented', BOTH)).toMatchObject({
      label: 'Iniciar secado',
      href: '/secado?vista=listos',
    });
  });

  it('leads the lots in drying to Secado', () => {
    expect(dryingStageAction('drying', BOTH)).toMatchObject({
      label: 'Ir a Secado',
      href: '/secado',
    });
  });

  it('offers nothing in the other statuses, or without the permission', () => {
    for (const status of ['generated', 'fermenting', 'dried'] as const) {
      expect(dryingStageAction(status, BOTH)).toBeNull();
    }
    expect(
      dryingStageAction('fermented', { logLogs: true, manage: false }),
    ).toBeNull();
    expect(
      dryingStageAction('drying', { logLogs: false, manage: true }),
    ).toBeNull();
  });
});

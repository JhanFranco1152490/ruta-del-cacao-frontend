import { describe, expect, it } from 'vitest';

import { fermentationLotActions } from './lot-actions';

const BOTH = { logTurns: true, manage: true };

describe('fermentationLotActions', () => {
  it('offers to start a generated lot, opening its form in Fermentación', () => {
    const [start, ...rest] = fermentationLotActions(
      { id: 'l1', status: 'generated' },
      BOTH,
    );

    expect(rest).toEqual([]);
    expect(start.label).toBe('Iniciar fermentación');
    expect(start.href).toBe('/fermentacion?vista=listos&iniciar=l1');
  });

  it('goes straight to the field page to record a turn, and opens the finish form', () => {
    const actions = fermentationLotActions(
      { id: 'l1', status: 'fermenting' },
      BOTH,
    );

    expect(actions.map(({ label, href }) => [label, href])).toEqual([
      ['Registrar volteo', '/fermentacion/volteo?lote=l1'],
      ['Finalizar fermentación', '/fermentacion?finalizar=l1'],
      ['Ver en Fermentación', '/fermentacion'],
    ]);
  });

  it('leaves out starting and finishing for whom only records turns', () => {
    const actions = fermentationLotActions(
      { id: 'l1', status: 'fermenting' },
      { logTurns: true, manage: false },
    );

    expect(actions.map(({ id }) => id)).toEqual([
      'record-turn',
      'see-in-fermentation',
    ]);
    expect(
      fermentationLotActions(
        { id: 'l1', status: 'generated' },
        { logTurns: true, manage: false },
      ),
    ).toEqual([]);
  });

  it('offers nothing once the fermentation is over', () => {
    for (const status of ['fermented', 'drying', 'dried'] as const) {
      expect(fermentationLotActions({ id: 'l1', status }, BOTH)).toEqual([]);
    }
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildFermentation,
  buildFermentationTurn,
  buildHarvest,
  buildLot,
} from '@/test/factories';

import {
  cardFacts,
  countOverdue,
  fermentationsOfFarm,
  readyLotsOfFarm,
} from './fermentation-list';

// Iniciada el 15 oct. a las 07:00: sin volteos, el primero toca el 17 a las 07:00.
const STARTED = '2026-10-15T07:00:00-05:00';
const at = (iso: string) => new Date(iso);

const inFarm = (farmId: string, lotId: string) =>
  buildFermentation({
    lot: { ...buildFermentation().lot, id: lotId },
    farm: { id: farmId, code: 'F0', name: 'Finca' },
  });

describe('fermentationsOfFarm', () => {
  const list = [inFarm('f1', 'l1'), inFarm('f2', 'l2')];

  it('keeps those of the chosen farm', () => {
    expect(fermentationsOfFarm(list, 'f2').map(({ lot }) => lot.id)).toEqual([
      'l2',
    ]);
  });

  it('keeps all of them without a farm', () => {
    expect(fermentationsOfFarm(list, null)).toHaveLength(2);
  });
});

describe('readyLotsOfFarm', () => {
  const harvestIn = (farmId: string) => {
    const harvest = buildHarvest();
    return {
      ...harvest,
      plot: { ...harvest.plot, farm: { ...harvest.plot.farm, id: farmId } },
    };
  };
  const lots = [
    buildLot({ id: 'l1', harvest: harvestIn('f1') }),
    buildLot({ id: 'l2', harvest: harvestIn('f2') }),
  ];

  it('keeps the lots harvested in the chosen farm', () => {
    expect(readyLotsOfFarm(lots, 'f1').map(({ id }) => id)).toEqual(['l1']);
    expect(readyLotsOfFarm(lots, null)).toHaveLength(2);
  });
});

describe('countOverdue', () => {
  it('counts the fermentations whose next turn already passed', () => {
    const list = [
      buildFermentation({ started_at: STARTED }),
      buildFermentation({
        started_at: STARTED,
        turns: [
          buildFermentationTurn({ turned_at: '2026-10-17T08:00:00-05:00' }),
        ],
      }),
    ];

    expect(countOverdue(list, at('2026-10-17T09:00:00-05:00'))).toBe(1);
    expect(countOverdue(list, at('2026-10-18T09:00:00-05:00'))).toBe(2);
    expect(countOverdue(list, at('2026-10-16T09:00:00-05:00'))).toBe(0);
  });
});

describe('cardFacts', () => {
  it('counts the hours since the start with the clock of the device, not of the copy', () => {
    const facts = cardFacts(
      buildFermentation({ started_at: STARTED, elapsed_hours: '1.0' }),
      at('2026-10-17T11:40:00-05:00'),
    );

    expect(facts.elapsed).toBe('52 h de fermentación');
    expect(facts.lastTurn).toBeNull();
  });

  it('says how many turns and which was the last one', () => {
    const facts = cardFacts(
      buildFermentation({
        started_at: STARTED,
        turns: [
          buildFermentationTurn({
            id: 't2',
            turned_at: '2026-10-18T08:00:00-05:00',
            temperature_c: '47.5',
            ph: '4.85',
          }),
          buildFermentationTurn({
            id: 't1',
            turned_at: '2026-10-17T07:30:00-05:00',
          }),
        ],
      }),
      at('2026-10-18T09:00:00-05:00'),
    );

    expect(facts.elapsed).toBe('74 h de fermentación · 2 volteos');
    expect(facts.lastTurn).toBe('Volteo 2 · 47,5 °C · pH 4,85 · 18 oct. 08:00');
  });

  it('says when the next turn is due while it has not passed', () => {
    expect(
      cardFacts(
        buildFermentation({ started_at: STARTED }),
        at('2026-10-16T09:00:00-05:00'),
      ).next,
    ).toEqual({ overdue: false, text: 'Próximo volteo: 17 oct. 07:00' });
  });

  it('warns since when a turn is overdue, with the date if it was another day', () => {
    const fermentation = buildFermentation({ started_at: STARTED });

    expect(
      cardFacts(fermentation, at('2026-10-17T09:00:00-05:00')).next,
    ).toEqual({ overdue: true, text: 'Volteo pendiente desde las 07:00' });
    expect(
      cardFacts(fermentation, at('2026-10-18T09:00:00-05:00')).next,
    ).toEqual({
      overdue: true,
      text: 'Volteo pendiente desde el 17 oct. 07:00',
    });
  });
});

import { describe, expect, it } from 'vitest';

import { lotStages, stagePosition } from './lot-stages';

describe('lotStages', () => {
  it('marks what is done, what is current and what is left', () => {
    expect(
      lotStages('fermenting').map(({ status, state }) => [status, state]),
    ).toEqual([
      ['generated', 'done'],
      ['fermenting', 'current'],
      ['fermented', 'upcoming'],
      ['drying', 'upcoming'],
      ['dried', 'upcoming'],
    ]);
  });

  it('has nothing left once the lot is dry', () => {
    const states = lotStages('dried').map(({ state }) => state);

    expect(states.slice(0, 4)).toEqual(['done', 'done', 'done', 'done']);
    expect(states[4]).toBe('current');
  });

  it('names each stage like the status badge does', () => {
    expect(lotStages('generated')[1].label).toBe('En fermentación');
  });
});

describe('stagePosition', () => {
  it('counts the stage from one', () => {
    expect(stagePosition('generated')).toEqual({ position: 1, total: 5 });
    expect(stagePosition('drying')).toEqual({ position: 4, total: 5 });
  });
});

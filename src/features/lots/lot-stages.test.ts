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
      ['evaluated', 'upcoming'],
      ['classified', 'upcoming'],
    ]);
  });

  it('leaves the quality stages after the dry lot', () => {
    const states = lotStages('dried').map(({ state }) => state);

    expect(states.slice(0, 4)).toEqual(['done', 'done', 'done', 'done']);
    expect(states.slice(4)).toEqual(['current', 'upcoming', 'upcoming']);
  });

  it('has nothing left once the lot is classified', () => {
    expect(lotStages('classified').at(-1)?.state).toBe('current');
  });

  it('names each stage like the status badge does', () => {
    expect(lotStages('generated')[1].label).toBe('En fermentación');
  });
});

describe('lotStages of a discarded lot', () => {
  it('ends in Descartado after the evaluation', () => {
    expect(
      lotStages('discarded').map(({ status, state }) => [status, state]),
    ).toEqual([
      ['generated', 'done'],
      ['fermenting', 'done'],
      ['fermented', 'done'],
      ['drying', 'done'],
      ['dried', 'done'],
      ['evaluated', 'done'],
      ['discarded', 'current'],
    ]);
  });

  it('counts Descartado as the last stage', () => {
    expect(stagePosition('discarded')).toEqual({ position: 7, total: 7 });
  });
});

describe('stagePosition', () => {
  it('counts the stage from one', () => {
    expect(stagePosition('generated')).toEqual({ position: 1, total: 7 });
    expect(stagePosition('drying')).toEqual({ position: 4, total: 7 });
  });
});

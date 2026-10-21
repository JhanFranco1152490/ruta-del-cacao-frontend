import { describe, expect, it } from 'vitest';

import { initialFarm } from './initial-farm';

const farms = ['f1', 'f2', 'f3'];

describe('initialFarm', () => {
  it('says there is nothing to show without active farms', () => {
    expect(initialFarm({ farms: [], urlFarm: 'f1', remembered: 'f1' })).toEqual(
      { kind: 'no-farms' },
    );
  });

  it('opens the only farm', () => {
    expect(
      initialFarm({ farms: ['f1'], urlFarm: null, remembered: null }),
    ).toEqual({ kind: 'farm', farmId: 'f1' });
  });

  it('opens the farm in the URL before the remembered one', () => {
    expect(initialFarm({ farms, urlFarm: 'f2', remembered: 'f3' })).toEqual({
      kind: 'farm',
      farmId: 'f2',
    });
  });

  it('opens the remembered farm when it still reaches it', () => {
    expect(initialFarm({ farms, urlFarm: null, remembered: 'f3' })).toEqual({
      kind: 'farm',
      farmId: 'f3',
    });
  });

  it('ignores a farm in the URL that it does not reach and falls back', () => {
    expect(initialFarm({ farms, urlFarm: 'other', remembered: 'f3' })).toEqual({
      kind: 'farm',
      farmId: 'f3',
    });
  });

  it('opens the first farm when nothing usable is left to go by', () => {
    expect(
      initialFarm({ farms, urlFarm: 'other', remembered: 'gone' }),
    ).toEqual({ kind: 'farm', farmId: 'f1' });
  });
});

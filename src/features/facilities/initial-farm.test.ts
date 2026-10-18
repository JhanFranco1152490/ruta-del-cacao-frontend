import { describe, expect, it } from 'vitest';

import { initialFarm } from './initial-farm';

const farms = ['f1', 'f2', 'f3'];

describe('initialFarm', () => {
  it('says there is nothing to show without active farms', () => {
    expect(
      initialFarm({
        farms: [],
        urlFarm: 'f1',
        choose: false,
        remembered: 'f1',
      }),
    ).toEqual({ kind: 'no-farms' });
  });

  it('always opens the only farm, even when asked to choose', () => {
    expect(
      initialFarm({
        farms: ['f1'],
        urlFarm: null,
        choose: true,
        remembered: null,
      }),
    ).toEqual({ kind: 'farm', farmId: 'f1' });
  });

  it('opens the farm in the URL', () => {
    expect(
      initialFarm({ farms, urlFarm: 'f2', choose: false, remembered: 'f3' }),
    ).toEqual({ kind: 'farm', farmId: 'f2' });
  });

  it('asks again when the farm in the URL is not one it reaches', () => {
    expect(
      initialFarm({ farms, urlFarm: 'other', choose: false, remembered: 'f3' }),
    ).toEqual({ kind: 'choose' });
  });

  it('asks when told to choose, even with a remembered farm', () => {
    expect(
      initialFarm({ farms, urlFarm: null, choose: true, remembered: 'f3' }),
    ).toEqual({ kind: 'choose' });
  });

  it('opens the remembered farm when it still reaches it', () => {
    expect(
      initialFarm({ farms, urlFarm: null, choose: false, remembered: 'f3' }),
    ).toEqual({ kind: 'farm', farmId: 'f3' });
  });

  it('asks when the remembered farm is gone or no longer reached', () => {
    expect(
      initialFarm({ farms, urlFarm: null, choose: false, remembered: 'old' }),
    ).toEqual({ kind: 'choose' });
  });

  it('asks the first time, with nothing remembered', () => {
    expect(
      initialFarm({ farms, urlFarm: null, choose: false, remembered: null }),
    ).toEqual({ kind: 'choose' });
  });
});

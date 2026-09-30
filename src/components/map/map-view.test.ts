import { describe, expect, it } from 'vitest';

import { pointsKey, viewFor } from './map-view';

const CUCUTA = { latitude: 7.89, longitude: -72.5 };
const PAMPLONA = { latitude: 7.37, longitude: -72.65 };

describe('viewFor', () => {
  it('shows the operating area when there are no points', () => {
    expect(viewFor([])).toEqual({ kind: 'area' });
  });

  it('centers on a single point', () => {
    expect(viewFor([CUCUTA])).toEqual({ kind: 'point', center: CUCUTA });
  });

  it('frames every point when there are several', () => {
    expect(viewFor([CUCUTA, PAMPLONA])).toEqual({
      kind: 'bounds',
      points: [CUCUTA, PAMPLONA],
    });
  });
});

describe('pointsKey', () => {
  it('changes only when the positions change', () => {
    expect(pointsKey([CUCUTA])).toBe(pointsKey([{ ...CUCUTA }]));
    expect(pointsKey([CUCUTA])).not.toBe(pointsKey([PAMPLONA]));
  });
});

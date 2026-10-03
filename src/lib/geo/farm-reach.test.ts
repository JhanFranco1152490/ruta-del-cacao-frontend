import { describe, expect, it } from 'vitest';

import {
  maxDistanceFromFarmMetres,
  verticesTooFarFromFarm,
} from './farm-reach';

const FARM_POINT = { latitude: 7.8, longitude: -72.5 };
// Un grado de latitud son unos 111 km: 0,001° son unos 111 m.
const north = (metres: number) => ({
  latitude: 7.8 + metres / 111_195,
  longitude: -72.5,
});

describe('maxDistanceFromFarmMetres', () => {
  it('grows with the area of the farm', () => {
    // El doble del radio de una finca circular más 300 m de margen.
    expect(maxDistanceFromFarmMetres(12.5)).toBe(699);
    expect(maxDistanceFromFarmMetres(1)).toBe(413);
    expect(maxDistanceFromFarmMetres(100)).toBe(1428);
  });
});

describe('verticesTooFarFromFarm', () => {
  it('accepts vertices inside the limit, the edge included', () => {
    const limit = maxDistanceFromFarmMetres(12.5);

    expect(
      verticesTooFarFromFarm([north(100), north(limit - 5)], FARM_POINT, 12.5),
    ).toEqual([]);
  });

  it('reports which vertices are too far and how far', () => {
    const far = verticesTooFarFromFarm(
      [north(100), north(1500), north(2000)],
      FARM_POINT,
      12.5,
    );

    expect(far.map(({ index }) => index)).toEqual([1, 2]);
    expect(far[0].distanceMetres).toBeGreaterThan(1490);
    expect(far[0].distanceMetres).toBeLessThan(1510);
  });

  it('is more tolerant with a bigger farm', () => {
    expect(
      verticesTooFarFromFarm([north(1000)], FARM_POINT, 12.5),
    ).toHaveLength(1);
    expect(verticesTooFarFromFarm([north(1000)], FARM_POINT, 100)).toEqual([]);
  });
});

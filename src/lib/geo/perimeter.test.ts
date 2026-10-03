import { describe, expect, it } from 'vitest';

import { polygonPerimeterMetres } from './perimeter';
import { rect } from './test-shapes';

describe('polygonPerimeterMetres', () => {
  it('closes the ring and adds the four sides of a rectangle', () => {
    // 0,001° de latitud son unos 111 m, y de longitud, unos 110 m a esta latitud.
    expect(polygonPerimeterMetres(rect(0, 0, 1, 1))).toBeGreaterThan(430);
    expect(polygonPerimeterMetres(rect(0, 0, 1, 1))).toBeLessThan(450);
  });

  it('is zero without sides and the round trip of a single segment with two vertices', () => {
    const [first, second] = rect(0, 0, 1, 1);

    expect(polygonPerimeterMetres([])).toBe(0);
    expect(polygonPerimeterMetres([first])).toBe(0);
    expect(polygonPerimeterMetres([first, second])).toBeGreaterThan(200);
  });
});

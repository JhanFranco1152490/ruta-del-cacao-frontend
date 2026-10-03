import { describe, expect, it } from 'vitest';

import { bestFix, improvesAccuracy } from './gps-fix';

const reading = (accuracy: number, latitude = 7, longitude = -72) => ({
  latitude,
  longitude,
  accuracy,
});

describe('bestFix', () => {
  it('has nothing without readings', () => {
    expect(bestFix([])).toBeNull();
  });

  it('is the reading itself when there is only one', () => {
    expect(bestFix([reading(20, 7.5, -72.5)])).toEqual(reading(20, 7.5, -72.5));
  });

  it('reports the accuracy of the best reading, never a better one', () => {
    expect(bestFix([reading(40), reading(10), reading(15)])?.accuracy).toBe(10);
  });

  it('averages the readings that are not worse than twice the best', () => {
    const fix = bestFix([reading(10, 7.0, -72.0), reading(10, 7.2, -72.2)])!;

    expect(fix.latitude).toBeCloseTo(7.1, 10);
    expect(fix.longitude).toBeCloseTo(-72.1, 10);
  });

  it('leans toward the more precise readings', () => {
    const fix = bestFix([reading(10, 7.0), reading(20, 8.0)])!;

    // Pesos 1/100 y 1/400: el promedio queda a un quinto del camino hacia la peor.
    expect(fix.latitude).toBeCloseTo(7.2, 10);
  });

  it('ignores readings far worse than the best, which come from another source', () => {
    const fix = bestFix([
      reading(10, 7.0),
      reading(300, 9.0),
      reading(21, 9.0),
    ])!;

    expect(fix.latitude).toBeCloseTo(7, 10);
  });

  it('uses the best reading as is when the device gives no accuracy', () => {
    expect(bestFix([reading(Infinity, 7.3)])).toEqual(reading(Infinity, 7.3));
  });
});

describe('improvesAccuracy', () => {
  it('counts the first reading as an improvement', () => {
    expect(improvesAccuracy(null, 90)).toBe(true);
  });

  it('needs at least a tenth less error', () => {
    expect(improvesAccuracy(100, 89)).toBe(true);
    expect(improvesAccuracy(100, 95)).toBe(false);
    expect(improvesAccuracy(100, 100)).toBe(false);
  });
});

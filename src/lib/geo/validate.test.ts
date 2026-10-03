import { describe, expect, it } from 'vitest';

import { MAX_VERTICES } from './polygon';
import { rect } from './test-shapes';
import { polygonProblem } from './validate';

describe('polygonProblem', () => {
  it('accepts a triangle and a rectangle', () => {
    expect(polygonProblem(rect(0, 0, 1, 1).slice(0, 3))).toBeNull();
    expect(polygonProblem(rect(0, 0, 1, 1))).toBeNull();
  });

  it('accepts the largest polygon and rejects one more vertex', () => {
    const circle = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        latitude: 7.8 + 0.001 * Math.sin((2 * Math.PI * index) / count),
        longitude: -72.5 + 0.001 * Math.cos((2 * Math.PI * index) / count),
      }));

    expect(polygonProblem(circle(MAX_VERTICES))).toBeNull();
    expect(polygonProblem(circle(MAX_VERTICES + 1))).toBe('too_many_vertices');
  });

  it.each([0, 1, 2])('rejects %i vertices', (count) => {
    expect(polygonProblem(rect(0, 0, 1, 1).slice(0, count))).toBe(
      'too_few_vertices',
    );
  });

  it('rejects sides that cross', () => {
    const [a, b, c, d] = rect(0, 0, 1, 1);

    expect(polygonProblem([a, c, b, d])).toBe('crossing_sides');
  });

  it('rejects a repeated vertex', () => {
    const [a, b, c] = rect(0, 0, 1, 1);

    expect(polygonProblem([a, b, c, b])).toBe('repeated_vertices');
  });

  it('rejects vertices in a straight line', () => {
    expect(
      polygonProblem([
        { latitude: 7.8, longitude: -72.5 },
        { latitude: 7.8, longitude: -72.499 },
        { latitude: 7.8, longitude: -72.498 },
      ]),
    ).toBe('no_area');
  });
});

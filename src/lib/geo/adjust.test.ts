import { describe, expect, it } from 'vitest';

import { suggestAdjustment } from './adjust';
import { coordinateSet, rect } from './test-shapes';
import { polygonProblem } from './validate';

const points = (
  suggestion: NonNullable<ReturnType<typeof suggestAdjustment>>,
) => suggestion.map(({ point }) => point);

describe('suggestAdjustment', () => {
  it('moves the invading vertices to the border of the neighbour', () => {
    const suggestion = suggestAdjustment(rect(0, 0, 2, 1), [rect(1, 0, 3, 1)])!;

    expect(coordinateSet(points(suggestion))).toEqual(
      coordinateSet(rect(0, 0, 1, 1)),
    );
    const [kept] = rect(0, 0, 1, 1);
    const byKey = new Map(
      suggestion.map(({ point, isAdjusted }) => [
        `${point.longitude},${point.latitude}`,
        isAdjusted,
      ]),
    );
    expect(byKey.get(`${kept.longitude},${kept.latitude}`)).toBe(false);
    const [, moved] = rect(0, 0, 1, 1);
    expect(byKey.get(`${moved.longitude},${moved.latitude}`)).toBe(true);
  });

  it('adds the points where the borders cross', () => {
    const suggestion = suggestAdjustment(rect(0, 0, 2, 2), [rect(1, 1, 3, 3)])!;

    // Una L: se pierde la esquina invadida y aparecen los dos cruces y la esquina vecina.
    expect(suggestion).toHaveLength(6);
    expect(polygonProblem(points(suggestion))).toBeNull();
  });

  it('keeps away from every neighbour', () => {
    const suggestion = suggestAdjustment(rect(0, 0, 3, 1), [
      rect(-1, 0, 1, 1),
      rect(2, 0, 4, 1),
    ])!;

    expect(coordinateSet(points(suggestion))).toEqual(
      coordinateSet(rect(1, 0, 2, 1)),
    );
  });

  it('has no suggestion when the plot is inside a neighbour', () => {
    expect(suggestAdjustment(rect(1, 1, 2, 2), [rect(0, 0, 3, 3)])).toBeNull();
  });

  it('has no suggestion when cutting splits the plot', () => {
    expect(suggestAdjustment(rect(0, 0, 3, 1), [rect(1, -1, 2, 2)])).toBeNull();
  });

  it('has no suggestion when cutting leaves a hole', () => {
    expect(suggestAdjustment(rect(0, 0, 3, 3), [rect(1, 1, 2, 2)])).toBeNull();
  });
});

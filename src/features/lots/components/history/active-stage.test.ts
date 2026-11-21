import { describe, expect, it } from 'vitest';

import { activeStageIndex } from './active-stage';

const VIEWPORT = 800;
// Seis etapas de 350 px, la última termina en 2400 px; con 600 px de pie la página mide 3000.
const ABSOLUTE_TOPS = [300, 650, 1000, 1350, 1700, 2050];
const MAX_SCROLL = 3000 - VIEWPORT;

const readingAt = (scrollY: number) =>
  activeStageIndex(
    ABSOLUTE_TOPS.map((top) => top - scrollY),
    { viewportHeight: VIEWPORT, scrollY, maxScroll: MAX_SCROLL },
  );

describe('activeStageIndex', () => {
  it('starts on the first stage with the page at the top', () => {
    expect(readingAt(0)).toBe(0);
  });

  it('ends on the last stage with the page at the bottom', () => {
    expect(readingAt(MAX_SCROLL)).toBe(ABSOLUTE_TOPS.length - 1);
  });

  it('goes through every stage in order, the last ones included', () => {
    const seen: number[] = [];
    for (let scrollY = 0; scrollY <= MAX_SCROLL; scrollY += 10) {
      const index = readingAt(scrollY);
      if (seen.at(-1) !== index) seen.push(index);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('marks the first stage when there is nothing to scroll', () => {
    expect(
      activeStageIndex([100, 400], {
        viewportHeight: VIEWPORT,
        scrollY: 0,
        maxScroll: 0,
      }),
    ).toBe(0);
  });
});

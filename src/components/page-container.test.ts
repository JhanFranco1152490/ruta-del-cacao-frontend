import { describe, expect, it } from 'vitest';

import { pageContainerClass } from './page-container';

describe('pageContainerClass', () => {
  it('keeps the same margins and a different width for each size', () => {
    const wide = pageContainerClass('wide');
    const narrow = pageContainerClass('narrow');

    for (const classes of [wide, narrow]) {
      expect(classes).toContain('mx-auto');
      expect(classes).toContain('py-6');
      expect(classes).toContain('sm:px-8');
    }
    expect(wide).toContain('max-w-[1440px]');
    expect(narrow).toContain('max-w-4xl');
  });

  it('adds what the screen needs on top', () => {
    expect(pageContainerClass('wide', 'space-y-6')).toContain('space-y-6');
  });

  it('lets a screen set its own bottom padding, which wins over the shared one', () => {
    const classes = pageContainerClass('wide', 'pb-24');

    expect(classes).toContain('py-6');
    expect(classes).toContain('pb-24');
  });
});

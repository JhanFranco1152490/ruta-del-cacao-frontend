import { describe, expect, it } from 'vitest';

import { buildAuditChange } from '@/test/factories';

import { moreChangesLabel, splitChanges } from './visible-changes';

const changes = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    buildAuditChange({ field: `field_${index}` }),
  );

describe('splitChanges', () => {
  it('shows every change of a short entry', () => {
    expect(splitChanges(changes(3))).toEqual({
      shown: changes(3),
      rest: [],
    });
  });

  // «Ver 1 cambio más» ocuparía la misma línea que el cambio que esconde.
  it('shows the fourth change instead of a link to see one more', () => {
    expect(splitChanges(changes(4)).rest).toEqual([]);
  });

  it('keeps the first three and leaves the rest folded', () => {
    const { shown, rest } = splitChanges(changes(6));

    expect(shown.map(({ field }) => field)).toEqual([
      'field_0',
      'field_1',
      'field_2',
    ]);
    expect(rest).toHaveLength(3);
  });

  it('has nothing to show for an entry without changes', () => {
    expect(splitChanges([])).toEqual({ shown: [], rest: [] });
  });
});

describe('moreChangesLabel', () => {
  it('names how many changes are folded', () => {
    expect(moreChangesLabel(2)).toBe('Ver 2 cambios más');
    expect(moreChangesLabel(1)).toBe('Ver 1 cambio más');
  });
});

import { describe, expect, it } from 'vitest';

import { groupInOrder } from './group-in-order';

describe('groupInOrder', () => {
  it('keeps each group where its first item appears, with its items in order', () => {
    const items = [
      { id: 1, farm: 'b' },
      { id: 2, farm: 'a' },
      { id: 3, farm: 'b' },
    ];

    const groups = groupInOrder(
      items,
      (item) => item.farm,
      (first, key) => `Finca ${key.toUpperCase()} (${first.id})`,
    );

    expect(groups).toEqual([
      { key: 'b', title: 'Finca B (1)', items: [items[0], items[2]] },
      { key: 'a', title: 'Finca A (2)', items: [items[1]] },
    ]);
  });

  it('gives no groups for no items', () => {
    expect(groupInOrder([], String, String)).toEqual([]);
  });
});

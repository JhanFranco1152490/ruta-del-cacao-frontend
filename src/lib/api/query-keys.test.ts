import { describe, expect, it } from 'vitest';

import { queryKeys } from './query-keys';

// Invalidar una clave invalida todas las que empiezan igual: tras guardar un insumo se invalida
// `all()`, y eso tiene que alcanzar el catálogo de cualquier productor.
const startsWith = (key: readonly unknown[], prefix: readonly unknown[]) =>
  prefix.every((part, index) => key[index] === part);

describe('agricultural input query keys', () => {
  it('hangs every catalog from the key that writes invalidate', () => {
    const all = queryKeys.agriculturalInputs.all();
    expect(startsWith(queryKeys.agriculturalInputs.list(null), all)).toBe(true);
    expect(startsWith(queryKeys.agriculturalInputs.list('p-1'), all)).toBe(
      true,
    );
  });

  it('keeps the catalog of each producer apart', () => {
    expect(queryKeys.agriculturalInputs.list('p-1')).not.toEqual(
      queryKeys.agriculturalInputs.list('p-2'),
    );
    expect(queryKeys.agriculturalInputs.list(null)).not.toEqual(
      queryKeys.agriculturalInputs.list('p-1'),
    );
  });
});

describe('input stock query keys', () => {
  it('hangs the stock of every farm from the key that movements invalidate', () => {
    const all = queryKeys.inputStocks.all();
    expect(startsWith(queryKeys.inputStocks.byFarm('f-1'), all)).toBe(true);
    expect(queryKeys.inputStocks.byFarm('f-1')).not.toEqual(
      queryKeys.inputStocks.byFarm('f-2'),
    );
  });

  it('keeps the movements of each input in each farm apart', () => {
    const all = queryKeys.inputMovements.all();
    const movements = queryKeys.inputMovements.list('i-1', 'f-1');
    expect(startsWith(movements, all)).toBe(true);
    expect(movements).not.toEqual(queryKeys.inputMovements.list('i-1', 'f-2'));
    expect(movements).not.toEqual(queryKeys.inputMovements.list('i-2', 'f-1'));
  });
});

describe('agricultural activity query keys', () => {
  it('hangs every read from the key that writes invalidate', () => {
    const all = queryKeys.agriculturalActivities.all();
    const { month, detail, assignees, pending } =
      queryKeys.agriculturalActivities;
    expect(startsWith(month(null, '2026-10'), all)).toBe(true);
    expect(startsWith(pending(null), all)).toBe(true);
    expect(startsWith(detail('a-1'), all)).toBe(true);
    expect(startsWith(assignees(null), all)).toBe(true);
  });

  it('keeps each month of each producer apart', () => {
    const { month } = queryKeys.agriculturalActivities;
    expect(month(null, '2026-10')).not.toEqual(month(null, '2026-11'));
    expect(month('p-1', '2026-10')).not.toEqual(month('p-2', '2026-10'));
    expect(month(null, '2026-10')).not.toEqual(month('p-1', '2026-10'));
  });

  it('keeps the pending activities of each producer apart', () => {
    const { pending } = queryKeys.agriculturalActivities;
    expect(pending(null)).not.toEqual(pending('p-1'));
    expect(pending('p-1')).not.toEqual(pending('p-2'));
  });

  it('keeps the completion waiting in each device user apart', () => {
    const { queued } = queryKeys.agriculturalActivities;
    expect(queued('u-1', 'a-1')).not.toEqual(queued('u-2', 'a-1'));
    expect(queued('u-1', 'a-1')).not.toEqual(queued('u-1', 'a-2'));
  });
});

describe('pest and disease query keys', () => {
  it('hangs the screen list and the active catalog from the key that writes invalidate', () => {
    const all = queryKeys.pestsDiseases.all();
    expect(startsWith(queryKeys.pestsDiseases.list(), all)).toBe(true);
    expect(startsWith(queryKeys.pestsDiseases.active(), all)).toBe(true);
    expect(queryKeys.pestsDiseases.list()).not.toEqual(
      queryKeys.pestsDiseases.active(),
    );
  });
});

describe('plot health query keys', () => {
  it('hangs every read from the key that a monitoring or a control invalidates', () => {
    const all = queryKeys.health.all();
    const { history, withoutControl, evidence, evidenceFile } =
      queryKeys.health;
    expect(startsWith(history({}), all)).toBe(true);
    expect(startsWith(withoutControl(null), all)).toBe(true);
    expect(startsWith(evidence('a-1'), all)).toBe(true);
    expect(startsWith(evidenceFile('e-1'), all)).toBe(true);
  });

  it('keeps each history query apart under one key to invalidate them all', () => {
    const { history, historyAll } = queryKeys.health;
    expect(startsWith(history({ plot: 'pl-1' }), historyAll())).toBe(true);
    expect(history({ plot: 'pl-1' })).not.toEqual(history({ plot: 'pl-2' }));
  });

  it('keeps the waiting detections of each producer apart', () => {
    const { withoutControl } = queryKeys.health;
    expect(withoutControl(null)).not.toEqual(withoutControl('p-1'));
    expect(withoutControl('p-1')).not.toEqual(withoutControl('p-2'));
  });

  it('keeps the queued monitoring of each person and activity apart', () => {
    const { queued } = queryKeys.health;
    expect(queued('u-1', 'a-1')).not.toEqual(queued('u-2', 'a-1'));
    expect(queued('u-1', 'a-1')).not.toEqual(queued('u-1', 'a-2'));
  });
});

describe('notification query keys', () => {
  it('hangs the list and the count from the key that every change invalidates', () => {
    const { all, list, unreadCount } = queryKeys.notifications;
    expect(startsWith(list(), all())).toBe(true);
    expect(startsWith(unreadCount(), all())).toBe(true);
    expect(list()).not.toEqual(unreadCount());
  });

  it('keeps the push keys apart from the notifications', () => {
    const { config, subscription } = queryKeys.push;
    expect(startsWith(config(), queryKeys.notifications.all())).toBe(false);
    expect(config()).not.toEqual(subscription());
  });
});

describe('harvest query keys', () => {
  it('hangs every read from the key that writes invalidate', () => {
    const all = queryKeys.harvests.all();
    const { month, detail, collectors, queued } = queryKeys.harvests;
    expect(startsWith(month(null, '2026-10'), all)).toBe(true);
    expect(startsWith(detail('h-1'), all)).toBe(true);
    expect(startsWith(collectors(null), all)).toBe(true);
    expect(startsWith(queued('u-1', 'h-1'), all)).toBe(true);
  });

  it('keeps each month of each producer apart', () => {
    const { month } = queryKeys.harvests;
    expect(month(null, '2026-10')).not.toEqual(month(null, '2026-11'));
    expect(month('p-1', '2026-10')).not.toEqual(month('p-2', '2026-10'));
    expect(month(null, '2026-10')).not.toEqual(month('p-1', '2026-10'));
  });

  it('keeps the collectors of each producer apart', () => {
    const { collectors } = queryKeys.harvests;
    expect(collectors(null)).not.toEqual(collectors('p-1'));
  });

  it('keeps the harvest waiting in each device user apart', () => {
    const { queued } = queryKeys.harvests;
    expect(queued('u-1', 'h-1')).not.toEqual(queued('u-2', 'h-1'));
    expect(queued('u-1', 'h-1')).not.toEqual(queued('u-1', 'h-2'));
  });
});

describe('lot query keys', () => {
  it('hangs every read from the key that writes invalidate', () => {
    const all = queryKeys.lots.all();
    expect(startsWith(queryKeys.lots.list({ page: 1 }), all)).toBe(true);
    expect(startsWith(queryKeys.lots.detail('l-1'), all)).toBe(true);
    expect(startsWith(queryKeys.lots.summary({}), all)).toBe(true);
  });

  it('keeps each filtered page apart', () => {
    const { list } = queryKeys.lots;
    expect(list({ page: 1 })).not.toEqual(list({ page: 2 }));
    expect(list({ status: 'generated' })).not.toEqual(
      list({ status: 'dried' }),
    );
  });
});

describe('fermentation query keys', () => {
  it('hangs every read from the key that writes invalidate', () => {
    const { all, list, detail, startOptions } = queryKeys.fermentation;
    expect(startsWith(list(null), all())).toBe(true);
    expect(startsWith(detail('l1'), all())).toBe(true);
    expect(startsWith(startOptions('l1'), all())).toBe(true);
  });

  it('keeps each producer and each lot apart', () => {
    const { list, detail, startOptions } = queryKeys.fermentation;
    expect(list(null)).not.toEqual(list('p-1'));
    expect(detail('l1')).not.toEqual(detail('l2'));
    expect(detail('l1')).not.toEqual(startOptions('l1'));
  });
});

describe('post-harvest facility query keys', () => {
  it('hangs the list from the key that writes invalidate', () => {
    const all = queryKeys.facilities.all();
    expect(startsWith(queryKeys.facilities.list(null), all)).toBe(true);
    expect(startsWith(queryKeys.facilities.list('p-1'), all)).toBe(true);
  });

  it('keeps the list of each producer apart', () => {
    const { list } = queryKeys.facilities;
    expect(list(null)).not.toEqual(list('p-1'));
    expect(list('p-1')).not.toEqual(list('p-2'));
  });
});

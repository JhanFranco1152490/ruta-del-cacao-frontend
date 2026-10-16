import { describe, expect, it } from 'vitest';

import { getOfflineDb } from './db';
import { listQueuedByParent } from './queued-by-parent';
import { enqueue } from './sync-queue';

const newUser = () => `queued-by-parent-${crypto.randomUUID()}`;

const save = (
  userId: string,
  id: string,
  resource: string,
  parentId?: string,
) =>
  enqueue(userId, { id, resource, operation: 'create', parentId, payload: {} });

describe('listQueuedByParent', () => {
  it('lists the records of the given resources by their parent, with their status', async () => {
    const userId = newUser();
    await save(userId, 'c1', 'completions', 'a1');
    await save(userId, 'm1', 'monitorings', 'a2');
    await getOfflineDb(userId).queue.update('m1', { status: 'error' });

    const found = await listQueuedByParent(userId, [
      'completions',
      'monitorings',
    ]);

    expect(found).toEqual(
      expect.arrayContaining([
        { parentId: 'a1', resource: 'completions', status: 'pending' },
        { parentId: 'a2', resource: 'monitorings', status: 'error' },
      ]),
    );
    expect(found).toHaveLength(2);
  });

  it('leaves out other resources and records without a parent', async () => {
    const userId = newUser();
    await save(userId, 'f1', 'farms');
    await save(userId, 'p1', 'plots', 'f1');
    await save(userId, 'x1', 'completions');

    expect(await listQueuedByParent(userId, ['completions'])).toEqual([]);
  });

  it('finds nothing when no resource is asked for', async () => {
    const userId = newUser();
    await save(userId, 'c1', 'completions', 'a1');

    expect(await listQueuedByParent(userId, [])).toEqual([]);
  });
});

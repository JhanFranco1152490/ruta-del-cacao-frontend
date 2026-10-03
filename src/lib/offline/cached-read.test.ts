import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { readThroughCache } from './cached-read';

const userId = () => `cached-read-${crypto.randomUUID()}`;
const offline = () => Promise.reject(new TypeError('Failed to fetch'));

describe('readThroughCache', () => {
  it('returns fresh data and keeps a copy for when the server is unreachable', async () => {
    const id = userId();
    await readThroughCache(id, 'k', () => Promise.resolve([1]));

    const result = await readThroughCache(id, 'k', offline);

    expect(result.data).toEqual([1]);
    expect(result.savedAt).toEqual(expect.any(Number));
  });

  it('marks fresh data without a saved date', async () => {
    const result = await readThroughCache(userId(), 'k', () =>
      Promise.resolve('x'),
    );

    expect(result).toEqual({ data: 'x' });
  });

  it('does not hide an API error behind the copy', async () => {
    const id = userId();
    await readThroughCache(id, 'k', () => Promise.resolve([1]));
    const denied = new ApiError(403, {
      detail: 'Sin permiso.',
      code: 'permission_denied',
      fields: {},
    });

    await expect(
      readThroughCache(id, 'k', () => Promise.reject(denied)),
    ).rejects.toBe(denied);
  });

  it('fails when offline with nothing saved', async () => {
    await expect(readThroughCache(userId(), 'k', offline)).rejects.toThrow(
      'Failed to fetch',
    );
  });
});

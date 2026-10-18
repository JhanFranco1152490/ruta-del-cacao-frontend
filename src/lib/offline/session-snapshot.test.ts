import { beforeEach, describe, expect, it } from 'vitest';

import { buildSessionUser } from '@/test/factories';

import { getOfflineDb } from './db';
import { recordLogin } from './session-clock';
import {
  clearSessionSnapshot,
  readSessionSnapshot,
  saveSessionSnapshot,
} from './session-snapshot';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => window.localStorage.clear());

const someone = () =>
  buildSessionUser({ id: `snapshot-${crypto.randomUUID()}` });

describe('session snapshot', () => {
  it('returns the last confirmed account within the offline window', async () => {
    const user = someone();
    await recordLogin(user.id);
    await saveSessionSnapshot(user);

    expect(await readSessionSnapshot()).toEqual(user);
  });

  it('returns nothing once the offline window is over', async () => {
    const user = someone();
    await recordLogin(user.id, Date.now() - 8 * DAY);
    await saveSessionSnapshot(user);

    expect(await readSessionSnapshot()).toBeNull();
  });

  it('returns nothing when no account was confirmed on this device', async () => {
    expect(await readSessionSnapshot()).toBeNull();
  });

  it('clears what the device kept when the farms of the account change', async () => {
    const user = buildSessionUser({
      id: `snapshot-${crypto.randomUUID()}`,
      all_farms: false,
      farms: [
        { id: 'farm-a', code: 'F01', name: 'La Esperanza', is_active: true },
      ],
    });
    const cache = getOfflineDb(user.id).cache;
    const keep = { key: 'plots', value: [], fetchedAt: 1 };

    expect(await saveSessionSnapshot(user)).toBe(false);
    await cache.put(keep);
    // La misma cuenta confirmada otra vez, sin cambios: lo guardado se queda.
    expect(await saveSessionSnapshot({ ...user })).toBe(false);
    expect(await cache.get('plots')).toEqual(keep);

    const moved = {
      ...user,
      farms: [
        { id: 'farm-b', code: 'F01', name: 'El Recreo', is_active: true },
      ],
    };
    expect(await saveSessionSnapshot(moved)).toBe(true);
    expect(await cache.get('plots')).toBeUndefined();
  });

  it('forgets the account on logout', async () => {
    const user = someone();
    await recordLogin(user.id);
    await saveSessionSnapshot(user);

    await clearSessionSnapshot(user.id);

    expect(await readSessionSnapshot()).toBeNull();
    expect(window.localStorage.getItem('cacao-last-user')).toBeNull();
  });

  it('keeps the latest account when an older one logs out', async () => {
    const older = someone();
    const latest = someone();
    await recordLogin(latest.id);
    await saveSessionSnapshot(older);
    await saveSessionSnapshot(latest);

    await clearSessionSnapshot(older.id);

    expect(await readSessionSnapshot()).toEqual(latest);
  });
});

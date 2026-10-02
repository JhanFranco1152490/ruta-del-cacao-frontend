import { describe, expect, it } from 'vitest';

import type { SyncStatus } from '@/types/sync';

import { syncAttention } from './sync-attention';

const upToDate: SyncStatus = {
  isOnline: true,
  pendingCount: 0,
  errorCount: 0,
  isWithinOfflineWindow: true,
};

describe('syncAttention', () => {
  it('says nothing when everything is up to date', () => {
    expect(syncAttention(upToDate)).toBeNull();
  });

  it('tells there is no connection even with nothing pending', () => {
    expect(syncAttention({ ...upToDate, isOnline: false })).toEqual({
      kind: 'offline',
      count: 0,
      label: 'Sin conexión',
    });
  });

  it('counts what is waiting without a connection', () => {
    expect(
      syncAttention({ ...upToDate, isOnline: false, pendingCount: 2 }),
    ).toEqual({
      kind: 'offline',
      count: 2,
      label: 'Sin conexión, 2 pendientes',
    });
  });

  it('puts the errors first', () => {
    expect(
      syncAttention({ ...upToDate, pendingCount: 2, errorCount: 1 }),
    ).toEqual({
      kind: 'error',
      count: 3,
      label: '1 registro con error, 2 pendientes',
    });
  });

  it('asks to sign in once the offline window is over', () => {
    expect(
      syncAttention({
        ...upToDate,
        isWithinOfflineWindow: false,
        pendingCount: 1,
      }),
    ).toEqual({
      kind: 'expired',
      count: 1,
      label: 'Inicia sesión con conexión, 1 pendiente',
    });
  });
});

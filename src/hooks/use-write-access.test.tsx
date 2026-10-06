import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { syncActingProducer, writeActingProducer } from '@/lib/acting-producer';
import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { createTestQueryClient } from '@/test/render';

import { useWriteAccess } from './use-write-access';

const PRODUCER = '33333333-3333-4333-8333-333333333333';

function setup(user: Parameters<typeof buildSession>[0]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession(user));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useWriteAccess(), { wrapper }).result;
}

afterEach(() => {
  sessionStorage.clear();
  syncActingProducer(null);
});

describe('useWriteAccess', () => {
  it('lets whoever holds the permission write', () => {
    const access = setup({ permissions: [PERMISSIONS.FARMS_ADD] });

    expect(access.current.can(PERMISSIONS.FARMS_ADD)).toBe(true);
    expect(access.current.needsProducer).toBe(false);
  });

  it('refuses what the account lacks', () => {
    const access = setup({ permissions: [PERMISSIONS.FARMS_VIEW] });

    expect(access.current.can(PERMISSIONS.FARMS_ADD)).toBe(false);
    expect(access.current.has(PERMISSIONS.FARMS_ADD)).toBe(false);
  });

  it('asks the superuser for a producer before writing, but still reports the grant', () => {
    const access = setup({
      id: 'su1',
      producer_id: null,
      is_superuser: true,
      permissions: [PERMISSIONS.FARMS_ADD],
    });

    expect(access.current.needsProducer).toBe(true);
    expect(access.current.can(PERMISSIONS.FARMS_ADD)).toBe(false);
    expect(access.current.has(PERMISSIONS.FARMS_ADD)).toBe(true);
  });

  it('lets the superuser write once a producer is chosen', () => {
    writeActingProducer('su1', PRODUCER);
    const access = setup({
      id: 'su1',
      producer_id: null,
      is_superuser: true,
      permissions: [PERMISSIONS.FARMS_ADD],
    });

    expect(access.current.needsProducer).toBe(false);
    expect(access.current.can(PERMISSIONS.FARMS_ADD)).toBe(true);
  });

  it('never asks an association administrator for a producer', () => {
    const access = setup({
      producer_id: null,
      is_superuser: false,
      permissions: [PERMISSIONS.PRODUCERS_VIEW],
    });

    expect(access.current.needsProducer).toBe(false);
  });
});

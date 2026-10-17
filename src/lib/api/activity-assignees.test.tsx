import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { getOfflineDb } from '@/lib/offline/db';
import { buildAssignee } from '@/test/factories';
import { activityAssigneesHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useActivityAssignees } from './activity-assignees';

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

const newUser = () => `assignees-${crypto.randomUUID()}`;

describe('useActivityAssignees', () => {
  it('reads the accounts of the own producer and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(activityAssigneesHandler([buildAssignee()], requests));

    const { result } = render(() => useActivityAssignees(userId, null));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('');
    expect(result.current.data?.data).toEqual([buildAssignee()]);
    expect(
      await getOfflineDb(userId).cache.get('agricultural-activity-assignees'),
    ).toBeDefined();
  });

  it('asks for the chosen producer and keeps its copy apart', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(activityAssigneesHandler([], requests));

    const { result } = render(() => useActivityAssignees(userId, 'p2'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].get('producer')).toBe('p2');
    expect(
      await getOfflineDb(userId).cache.get(
        'agricultural-activity-assignees:producer:p2',
      ),
    ).toBeDefined();
  });

  it('asks for nothing while it is turned off', () => {
    const requests: URLSearchParams[] = [];
    server.use(activityAssigneesHandler([], requests));

    const { result } = render(() =>
      useActivityAssignees(newUser(), null, { enabled: false }),
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });
});

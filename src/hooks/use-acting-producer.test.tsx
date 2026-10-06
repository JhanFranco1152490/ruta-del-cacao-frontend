import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { syncActingProducer } from '@/lib/acting-producer';
import { queryKeys } from '@/lib/api/query-keys';
import { buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useActingProducer } from './use-acting-producer';

const PRODUCER = '33333333-3333-4333-8333-333333333333';

function mockSession(is_superuser: boolean) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(buildSession({ id: 'u1', is_superuser })),
    ),
  );
}

function setup() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useActingProducer(), { wrapper });
  return { queryClient, ...view };
}

beforeEach(() => {
  sessionStorage.clear();
  syncActingProducer(null);
});

describe('useActingProducer', () => {
  it('lets a superuser choose and clear a producer', async () => {
    mockSession(true);
    const { result } = setup();
    await waitFor(() => expect(result.current.isSuperuser).toBe(true));

    act(() => result.current.choose(PRODUCER));
    expect(result.current.producerId).toBe(PRODUCER);

    act(() => result.current.clear());
    expect(result.current.producerId).toBeNull();
  });

  it('ignores the choice of an account that is not a superuser', async () => {
    mockSession(false);
    const { result } = setup();
    await waitFor(() => expect(result.current.isSuperuser).toBe(false));

    act(() => result.current.choose(PRODUCER));

    expect(result.current.producerId).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it('drops everything loaded except the session when the producer changes', async () => {
    mockSession(true);
    const { result, queryClient } = setup();
    await waitFor(() => expect(result.current.isSuperuser).toBe(true));
    queryClient.setQueryData(queryKeys.farms.all(), ['finca del anterior']);

    act(() => result.current.choose(PRODUCER));

    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.farms.all())).toBeUndefined(),
    );
    expect(queryClient.getQueryData(queryKeys.session())).toBeDefined();
  });
});

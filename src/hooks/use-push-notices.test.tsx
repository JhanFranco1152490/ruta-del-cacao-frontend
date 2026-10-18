import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

// El navegador se simula en las pruebas de la suscripción: aquí solo lo que hacen los hooks.
vi.mock('@/lib/push/subscription', () => ({
  readPushState: vi.fn(async () => 'prompt'),
  enablePush: vi.fn(async () => 'active'),
  disablePush: vi.fn(async () => 'prompt'),
}));

import { enablePush } from '@/lib/push/subscription';

import {
  useDisablePush,
  useEnablePush,
  usePushConfig,
  usePushState,
} from './use-push-notices';

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  const view = renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { ...view, client };
};

beforeEach(() => vi.clearAllMocks());

describe('usePushConfig', () => {
  it('reads the public key of the server', async () => {
    server.use(
      http.get(apiUrl('/api/notifications/push-config'), () =>
        HttpResponse.json({ public_key: 'BNc' }),
      ),
    );

    const { result } = render(() => usePushConfig());

    await waitFor(() => expect(result.current.data?.public_key).toBe('BNc'));
  });
});

describe('usePushState', () => {
  it('asks the browser what this device has', async () => {
    const { result } = render(() => usePushState());

    await waitFor(() => expect(result.current.data).toBe('prompt'));
  });
});

describe('turning push on and off', () => {
  it('turns it on with the key and keeps what the browser answered', async () => {
    const { result, client } = render(() => useEnablePush());

    await act(() => result.current.mutateAsync('BNc'));

    expect(enablePush).toHaveBeenCalledWith('BNc');
    expect(client.getQueryData(queryKeys.push.subscription())).toBe('active');
  });

  it('turns it off and keeps that it is to decide again', async () => {
    const { result, client } = render(() => useDisablePush());
    client.setQueryData(queryKeys.push.subscription(), 'active');

    await act(() => result.current.mutateAsync());

    expect(client.getQueryData(queryKeys.push.subscription())).toBe('prompt');
  });
});

import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import {
  hasPendingLogout,
  markPendingLogout,
} from '@/lib/offline/pending-logout';
import { apiError, buildProducer, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useLogin, useLogout } from './api';

const LOGIN = apiUrl('/api/auth/login');
const LOGOUT = apiUrl('/api/auth/logout');
const session = buildSession({ email: 'nueva@example.com' });

function seededClient() {
  const client = createTestQueryClient();
  client.setQueryData(queryKeys.session(), buildSession());
  client.setQueryData(queryKeys.producers.detail('p1'), buildProducer());
  client.setQueryData(queryKeys.producers.list({}), { results: [] });
  return client;
}

function wrapper(client = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('auth api', () => {
  it("drops the previous person's cache and stores the new session on login", async () => {
    server.use(http.post(LOGIN, () => HttpResponse.json(session)));
    const client = seededClient();
    const { result } = renderHook(() => useLogin(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        login_method: 'email',
        email: 'nueva@example.com',
        password: 'cacao seguro',
      });
    });

    expect(
      client.getQueryData(queryKeys.producers.detail('p1')),
    ).toBeUndefined();
    expect(client.getQueryData(queryKeys.producers.list({}))).toBeUndefined();
    expect(client.getQueryData(queryKeys.session())).toEqual(session);
  });

  it('keeps the cache when the login is rejected', async () => {
    server.use(
      http.post(LOGIN, () =>
        apiError(401, 'invalid_credentials', 'Credenciales incorrectas.'),
      ),
    );
    const client = seededClient();
    const { result } = renderHook(() => useLogin(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current
        .mutateAsync({
          login_method: 'email',
          email: 'nueva@example.com',
          password: 'incorrecta',
        })
        .catch(() => undefined);
    });

    expect(client.getQueryData(queryKeys.producers.detail('p1'))).toBeDefined();
  });

  it('clears the whole cache after a successful logout', async () => {
    server.use(
      http.post(LOGOUT, () => new HttpResponse(null, { status: 204 })),
    );
    const client = seededClient();
    const { result } = renderHook(() => useLogout(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(
      client.getQueryData(queryKeys.producers.detail('p1')),
    ).toBeUndefined();
    expect(client.getQueryData(queryKeys.producers.list({}))).toBeUndefined();
    expect(client.getQueryData(queryKeys.session())).toBeUndefined();
  });

  it('keeps the cache when the server answers with an error', async () => {
    server.use(http.post(LOGOUT, () => apiError(500, 'internal_error')));
    const client = seededClient();
    const { result } = renderHook(() => useLogout(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    expect(result.current.isError).toBe(true);
    expect(client.getQueryData(queryKeys.producers.detail('p1'))).toBeDefined();
    expect(client.getQueryData(queryKeys.session())).toBeDefined();
    expect(hasPendingLogout()).toBe(false);
  });

  describe('without a connection', () => {
    beforeEach(() => window.localStorage.clear());

    async function signOutOffline(client = seededClient()) {
      server.use(http.post(LOGOUT, () => HttpResponse.error()));
      const { result } = renderHook(() => useLogout(), {
        wrapper: wrapper(client),
      });
      let outcome: unknown;
      await act(async () => {
        outcome = await result.current.mutateAsync();
      });
      return { client, outcome };
    }

    it('signs out on the device and leaves the server close pending', async () => {
      const { client, outcome } = await signOutOffline();

      expect(outcome).toBe('device');
      expect(hasPendingLogout()).toBe(true);
      expect(client.getQueryData(queryKeys.session())).toBeUndefined();
      expect(
        client.getQueryData(queryKeys.producers.detail('p1')),
      ).toBeUndefined();
    });

    it('forgets the device copy of the session so the app does not open again', async () => {
      await getOfflineDb('u1').meta.put({ key: 'session', value: '{}' });
      window.localStorage.setItem('cacao-last-user', 'u1');

      await signOutOffline();

      await waitFor(async () =>
        expect(await getOfflineDb('u1').meta.get('session')).toBeUndefined(),
      );
      expect(window.localStorage.getItem('cacao-last-user')).toBeNull();
    });

    it('keeps what is still waiting to be sent', async () => {
      await getOfflineDb('u1').queue.put({
        id: 'q1',
        resource: 'farms',
        operation: 'create',
        payload: {},
        status: 'pending',
        createdAt: 1,
        updatedAt: 1,
      });

      await signOutOffline();

      expect(await getOfflineDb('u1').queue.get('q1')).toBeDefined();
    });
  });

  it('closes a pending sign-out on the server before signing in again', async () => {
    const calls: string[] = [];
    server.use(
      http.post(LOGOUT, () => {
        calls.push('logout');
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(LOGIN, () => {
        calls.push('login');
        return HttpResponse.json(session);
      }),
    );
    markPendingLogout();
    const { result } = renderHook(() => useLogin(), {
      wrapper: wrapper(seededClient()),
    });

    await act(async () => {
      await result.current.mutateAsync({
        login_method: 'email',
        email: 'nueva@example.com',
        password: 'cacao seguro',
      });
    });

    expect(calls).toEqual(['logout', 'login']);
    expect(hasPendingLogout()).toBe(false);
  });

  it('does not sign in while the pending sign-out cannot be sent', async () => {
    let logins = 0;
    server.use(
      http.post(LOGOUT, () => HttpResponse.error()),
      http.post(LOGIN, () => {
        logins += 1;
        return HttpResponse.json(session);
      }),
    );
    markPendingLogout();
    const { result } = renderHook(() => useLogin(), {
      wrapper: wrapper(seededClient()),
    });

    await act(async () => {
      await result.current
        .mutateAsync({
          login_method: 'email',
          email: 'nueva@example.com',
          password: 'cacao seguro',
        })
        .catch(() => undefined);
    });

    expect(logins).toBe(0);
    expect(hasPendingLogout()).toBe(true);
  });

  it('records the login moment for the offline session clock', async () => {
    server.use(http.post(LOGIN, () => HttpResponse.json(session)));
    const client = seededClient();
    const { result } = renderHook(() => useLogin(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        login_method: 'email',
        email: 'nueva@example.com',
        password: 'cacao seguro',
      });
    });

    const meta = await getOfflineDb('u1').meta.get('lastLoginAt');
    expect(meta?.value).toBeDefined();
  });

  it('clears the offline cache of the signed-out user on logout', async () => {
    server.use(
      http.post(LOGOUT, () => new HttpResponse(null, { status: 204 })),
    );
    const client = seededClient();
    await getOfflineDb('u1').cache.put({
      key: 'farms:1',
      value: {},
      fetchedAt: Date.now(),
    });
    const { result } = renderHook(() => useLogout(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(await getOfflineDb('u1').cache.toArray()).toHaveLength(0);
  });

  it('forgets the device copy of the session on logout', async () => {
    server.use(
      http.post(LOGOUT, () => new HttpResponse(null, { status: 204 })),
    );
    const client = seededClient();
    await getOfflineDb('u1').meta.put({ key: 'session', value: '{}' });
    window.localStorage.setItem('cacao-last-user', 'u1');
    const { result } = renderHook(() => useLogout(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(async () =>
      expect(await getOfflineDb('u1').meta.get('session')).toBeUndefined(),
    );
    expect(window.localStorage.getItem('cacao-last-user')).toBeNull();
  });
});

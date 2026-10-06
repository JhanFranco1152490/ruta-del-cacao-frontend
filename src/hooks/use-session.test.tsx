import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  hasPendingLogout,
  markPendingLogout,
} from '@/lib/offline/pending-logout';
import { recordLogin } from '@/lib/offline/session-clock';
import {
  readSessionSnapshot,
  saveSessionSnapshot,
} from '@/lib/offline/session-snapshot';
import {
  buildSession,
  buildSessionUser,
  notAuthenticated,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { fetchSession, useSessionSource } from './use-session';

const ME = apiUrl('/api/auth/me');
const DAY = 24 * 60 * 60 * 1000;

async function deviceAccount({ daysAgo = 0 } = {}) {
  const user = buildSessionUser({ id: `me-${crypto.randomUUID()}` });
  await recordLogin(user.id, Date.now() - daysAgo * DAY);
  await saveSessionSnapshot(user);
  return user;
}

beforeEach(() => window.localStorage.clear());

describe('fetchSession', () => {
  it('returns the server session when it answers', async () => {
    server.use(
      http.get(ME, () =>
        HttpResponse.json(buildSession({ email: 'a@example.com' })),
      ),
    );

    const session = await fetchSession();

    expect(session.user.email).toBe('a@example.com');
    expect(session.fromDevice).toBeUndefined();
  });

  it('enters with the device copy when the server cannot be reached', async () => {
    const user = await deviceAccount();
    server.use(http.get(ME, () => HttpResponse.error()));

    expect(await fetchSession()).toEqual({ user, fromDevice: true });
  });

  describe('after signing out without a connection', () => {
    const LOGOUT = apiUrl('/api/auth/logout');

    it('closes the session on the server before asking who is signed in', async () => {
      const calls: string[] = [];
      server.use(
        http.post(LOGOUT, () => {
          calls.push('logout');
          return new HttpResponse(null, { status: 204 });
        }),
        http.get(ME, () => {
          calls.push('me');
          return notAuthenticated();
        }),
      );
      markPendingLogout();

      await expect(fetchSession()).rejects.toThrow();

      // Con las cookies todavía vivas, `me` habría devuelto la cuenta y deshecho el cierre.
      expect(calls).toEqual(['logout', 'me']);
      expect(hasPendingLogout()).toBe(false);
    });

    it('does not ask for the session, nor use the device copy, while it cannot reach the server', async () => {
      await deviceAccount();
      let asked = 0;
      server.use(
        http.post(LOGOUT, () => HttpResponse.error()),
        http.get(ME, () => {
          asked += 1;
          return HttpResponse.json(buildSession());
        }),
      );
      markPendingLogout();

      await expect(fetchSession()).rejects.toThrow();

      expect(asked).toBe(0);
      expect(hasPendingLogout()).toBe(true);
    });
  });

  it('asks for a connection once the offline window is over', async () => {
    await deviceAccount({ daysAgo: 8 });
    server.use(http.get(ME, () => HttpResponse.error()));

    await expect(fetchSession()).rejects.toThrow();
  });

  it('never uses the copy when the server rejects the session', async () => {
    await deviceAccount();
    server.use(
      http.get(ME, () => notAuthenticated()),
      http.post(apiUrl('/api/auth/refresh'), () => notAuthenticated()),
    );

    await expect(fetchSession()).rejects.toMatchObject({ status: 401 });
  });

  it('forgets the device copy once the server rejects the session', async () => {
    await deviceAccount();
    server.use(
      http.get(ME, () => notAuthenticated()),
      http.post(apiUrl('/api/auth/refresh'), () => notAuthenticated()),
    );

    await expect(fetchSession()).rejects.toMatchObject({ status: 401 });

    expect(await readSessionSnapshot()).toBeNull();
  });

  it('does not fall back when the request was cancelled', async () => {
    await deviceAccount();
    const controller = new AbortController();
    server.use(
      http.get(ME, () => {
        controller.abort();
        return HttpResponse.error();
      }),
    );

    await expect(fetchSession(controller.signal)).rejects.toThrow();
  });
});

describe('useSessionSource', () => {
  function renderSource() {
    const queryClient = createTestQueryClient();
    return renderHook(() => useSessionSource(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });
  }

  it('says the session was confirmed by the server', async () => {
    server.use(http.get(ME, () => HttpResponse.json(buildSession())));

    const { result } = renderSource();

    await waitFor(() => expect(result.current).toBe('server'));
  });

  it('asks the server again while on the device copy, and confirms it when it answers', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await deviceAccount();
      server.use(http.get(ME, () => HttpResponse.error()));
      const { result } = renderSource();
      await waitFor(() => expect(result.current).toBe('device'));

      server.use(http.get(ME, () => HttpResponse.json(buildSession())));
      await vi.advanceTimersByTimeAsync(30_000);

      await waitFor(() => expect(result.current).toBe('server'));
    } finally {
      vi.useRealTimers();
    }
  });
});

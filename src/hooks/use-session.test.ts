import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { recordLogin } from '@/lib/offline/session-clock';
import { saveSessionSnapshot } from '@/lib/offline/session-snapshot';
import {
  buildSession,
  buildSessionUser,
  notAuthenticated,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { fetchSession } from './use-session';

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

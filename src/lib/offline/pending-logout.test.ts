import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiError } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import {
  clearPendingLogout,
  flushPendingLogout,
  hasPendingLogout,
  markPendingLogout,
} from './pending-logout';

const LOGOUT = apiUrl('/api/auth/logout');

beforeEach(() => window.localStorage.clear());

describe('pending logout mark', () => {
  it('is off until a sign-out could not reach the server', () => {
    expect(hasPendingLogout()).toBe(false);
  });

  it('is set and cleared', () => {
    markPendingLogout();
    expect(hasPendingLogout()).toBe(true);

    clearPendingLogout();
    expect(hasPendingLogout()).toBe(false);
  });
});

describe('flushPendingLogout', () => {
  it('sends nothing when no sign-out is pending', async () => {
    let calls = 0;
    server.use(
      http.post(LOGOUT, () => {
        calls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await flushPendingLogout();

    expect(calls).toBe(0);
  });

  it('closes the session on the server and drops the mark', async () => {
    let calls = 0;
    server.use(
      http.post(LOGOUT, () => {
        calls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    markPendingLogout();

    await flushPendingLogout();

    expect(calls).toBe(1);
    expect(hasPendingLogout()).toBe(false);
  });

  it('keeps the mark and fails while the server cannot be reached', async () => {
    server.use(http.post(LOGOUT, () => HttpResponse.error()));
    markPendingLogout();

    await expect(flushPendingLogout()).rejects.toBeInstanceOf(TypeError);

    expect(hasPendingLogout()).toBe(true);
  });

  it.each([
    ['the session was already gone', 401],
    ['the server fails', 500],
  ])('drops the mark when the server answers and %s', async (_, status) => {
    server.use(http.post(LOGOUT, () => apiError(status, 'x')));
    markPendingLogout();

    await flushPendingLogout();

    // El servidor respondió: reintentar para siempre dejaría a la persona sin poder volver a entrar.
    expect(hasPendingLogout()).toBe(false);
  });
});

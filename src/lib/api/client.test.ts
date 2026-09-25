import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  apiError,
  buildSession,
  sessionExpired as expired,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { apiFetch } from './client';
import { ApiError } from './errors';

const PRODUCERS = apiUrl('/api/producers');
const CSRF = apiUrl('/api/auth/csrf');
const REFRESH = apiUrl('/api/auth/refresh');
const ME = apiUrl('/api/auth/me');
const LOGIN = apiUrl('/api/auth/login');

function count(method: 'get' | 'post', url: string, response: () => Response) {
  const state = { calls: 0 };
  server.use(
    http[method](url, () => {
      state.calls += 1;
      return response();
    }),
  );
  return state;
}

describe('apiFetch', () => {
  it('returns parsed JSON and sends cookies', async () => {
    let seen: { credentials: string; accept: string | null } | undefined;
    server.use(
      http.get(PRODUCERS, ({ request }) => {
        seen = {
          credentials: request.credentials,
          accept: request.headers.get('accept'),
        };
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(apiFetch('/api/producers')).resolves.toEqual({ ok: true });
    expect(seen).toEqual({
      credentials: 'include',
      accept: 'application/json',
    });
  });

  it('sends JSON bodies with the CSRF token on mutations', async () => {
    let seen:
      { csrf: string | null; type: string | null; body: unknown } | undefined;
    server.use(
      http.post(PRODUCERS, async ({ request }) => {
        seen = {
          csrf: request.headers.get('x-csrftoken'),
          type: request.headers.get('content-type'),
          body: await request.json(),
        };
        return HttpResponse.json({ id: '1' }, { status: 201 });
      }),
    );

    await apiFetch('/api/producers', {
      method: 'POST',
      body: { first_name: 'Ana' },
    });

    expect(seen).toEqual({
      csrf: 'test-csrf',
      type: 'application/json',
      body: { first_name: 'Ana' },
    });
  });

  it('asks for a fresh CSRF token on every mutation', async () => {
    const csrf = count('get', CSRF, () =>
      HttpResponse.json({ csrf_token: 'a' }),
    );
    server.use(
      http.post(PRODUCERS, () => new HttpResponse(null, { status: 204 })),
    );

    await apiFetch('/api/producers', { method: 'POST', body: {} });
    await apiFetch('/api/producers', { method: 'POST', body: {} });

    expect(csrf.calls).toBe(2);
  });

  it('shares one CSRF request between concurrent mutations', async () => {
    const csrf = count('get', CSRF, () =>
      HttpResponse.json({ csrf_token: 'a' }),
    );
    server.use(
      http.post(PRODUCERS, () => new HttpResponse(null, { status: 204 })),
    );

    await Promise.all([
      apiFetch('/api/producers', { method: 'POST', body: {} }),
      apiFetch('/api/producers', { method: 'POST', body: {} }),
    ]);

    expect(csrf.calls).toBe(1);
  });

  it('returns undefined for 204 responses', async () => {
    server.use(
      http.post(PRODUCERS, () => new HttpResponse(null, { status: 204 })),
    );

    await expect(
      apiFetch('/api/producers', { method: 'POST', body: {} }),
    ).resolves.toBeUndefined();
  });

  it('turns the uniform error body into an ApiError', async () => {
    server.use(
      http.get(PRODUCERS, () =>
        apiError(400, 'validation_error', 'Datos inválidos', {
          email: ['Correo inválido.'],
        }),
      ),
    );

    const error = await apiFetch('/api/producers').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'validation_error',
      fields: { email: ['Correo inválido.'] },
      message: 'Datos inválidos',
    });
  });

  it('wraps a non-JSON error response in an ApiError with a stable code', async () => {
    server.use(
      http.get(
        PRODUCERS,
        () => new HttpResponse('<html>Bad gateway</html>', { status: 502 }),
      ),
    );

    const error = await apiFetch('/api/producers').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 502, code: 'unexpected_response' });
  });

  it('lets network errors through without trying to renew the session', async () => {
    const refresh = count(
      'post',
      REFRESH,
      () => new HttpResponse(null, { status: 204 }),
    );
    server.use(http.get(PRODUCERS, () => HttpResponse.error()));

    await expect(apiFetch('/api/producers')).rejects.toBeInstanceOf(TypeError);
    expect(refresh.calls).toBe(0);
  });

  it('renews the session once on 401 and retries the request', async () => {
    const order: string[] = [];
    server.use(
      http.post(REFRESH, () => {
        order.push('refresh');
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(PRODUCERS, () => {
        order.push('producers');
        return order.filter((step) => step === 'producers').length === 1
          ? expired()
          : HttpResponse.json({ ok: true });
      }),
    );

    await expect(apiFetch('/api/producers')).resolves.toEqual({ ok: true });
    expect(order).toEqual(['producers', 'refresh', 'producers']);
  });

  it('shares a single renewal between concurrent 401s', async () => {
    const refresh = count(
      'post',
      REFRESH,
      () => new HttpResponse(null, { status: 204 }),
    );
    let expiredOnce = 0;
    server.use(
      http.get(PRODUCERS, () =>
        expiredOnce++ < 2 ? expired() : HttpResponse.json({ ok: true }),
      ),
    );

    const results = await Promise.all([
      apiFetch('/api/producers'),
      apiFetch('/api/producers'),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(refresh.calls).toBe(1);
  });

  it('gives up with a 401 when the renewal itself is rejected', async () => {
    const producers = count('get', PRODUCERS, expired);
    server.use(http.post(REFRESH, () => expired()));

    await expect(apiFetch('/api/producers')).rejects.toMatchObject({
      status: 401,
    });
    expect(producers.calls).toBe(1);
  });

  it('does not renew on login: a 401 there means wrong credentials', async () => {
    const refresh = count(
      'post',
      REFRESH,
      () => new HttpResponse(null, { status: 204 }),
    );
    server.use(
      http.post(LOGIN, () =>
        apiError(
          401,
          'invalid_credentials',
          'Usuario o contraseña incorrectos.',
        ),
      ),
    );

    await expect(
      apiFetch('/api/auth/login', { method: 'POST', body: {} }),
    ).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    expect(refresh.calls).toBe(0);
  });

  it('does renew for /api/auth/me because the access token expires after 15 minutes', async () => {
    const refresh = count(
      'post',
      REFRESH,
      () => new HttpResponse(null, { status: 204 }),
    );
    let calls = 0;
    const session = buildSession();
    server.use(
      http.get(ME, () =>
        calls++ === 0 ? expired() : HttpResponse.json(session),
      ),
    );

    await expect(apiFetch('/api/auth/me')).resolves.toEqual(session);
    expect(refresh.calls).toBe(1);
  });
});

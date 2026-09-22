import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  confirmPasswordReset,
  getCurrentUser,
  login,
  logout,
  requestPasswordReset,
} from './auth';

const identity = {
  user: {
    id: 'test-user',
    email: 'test@example.com',
    roles: ['producer'],
    permissions: [],
  },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
afterEach(() => vi.restoreAllMocks());

describe('auth API integration', () => {
  it.each([
    [
      'login',
      () =>
        login({
          loginMethod: 'email',
          email: 'test@example.com',
          password: 'test password',
        }),
    ],
    ['password-reset/request', () => requestPasswordReset('test@example.com')],
    [
      'password-reset/confirm',
      () => confirmPasswordReset('test-token', 'test password'),
    ],
    ['logout', () => logout()],
  ])('obtiene CSRF y envía cookies en %s', async (path, action) => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ csrf_token: 'masked-test-token' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await action();
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/auth/csrf',
    );
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe(`http://localhost:8000/api/auth/${path}`);
    expect(options).toMatchObject({
      credentials: 'include',
      cache: 'no-store',
      method: 'POST',
    });
    expect(new Headers(options?.headers).get('X-CSRFToken')).toBe(
      'masked-test-token',
    );
  });

  it('no envía credenciales si no puede obtener CSRF', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}));
    await expect(
      login({
        loginMethod: 'email',
        email: 'test@example.com',
        password: 'test password',
      }),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('comparte una sola renovación entre consultas simultáneas', async () => {
    let meCalls = 0;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) => {
        if (String(url).endsWith('/csrf')) return json({ csrf_token: 'csrf' });
        if (String(url).endsWith('/refresh'))
          return new Response(null, { status: 204 });
        return ++meCalls <= 2 ? json({}, 401) : json(identity);
      });
    await expect(
      Promise.all([getCurrentUser(), getCurrentUser()]),
    ).resolves.toEqual([identity, identity]);
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/refresh')),
    ).toHaveLength(1);
  });

  it('renueva la sesión vencida antes de reintentar el cierre', async () => {
    let logoutCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (String(url).endsWith('/csrf')) return json({ csrf_token: 'csrf' });
      if (String(url).endsWith('/logout') && ++logoutCalls === 1)
        return json({}, 401);
      return new Response(null, { status: 204 });
    });
    await logout();
    expect(logoutCalls).toBe(2);
  });

  it('detiene la renovación cuando el refresh devuelve 401', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) =>
        String(url).endsWith('/csrf')
          ? json({ csrf_token: 'csrf' })
          : json({}, 401),
      );
    await expect(getCurrentUser()).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('no renueva ante errores de red', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getCurrentUser()).rejects.toThrow('Failed to fetch');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('presenta los errores de validación de Django', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ csrf_token: 'csrf' }))
      .mockResolvedValueOnce(
        json({ new_password: ['Esta contraseña es demasiado común.'] }, 400),
      );
    await expect(
      confirmPasswordReset('test-token', 'test password'),
    ).rejects.toThrow('Esta contraseña es demasiado común.');
  });
});

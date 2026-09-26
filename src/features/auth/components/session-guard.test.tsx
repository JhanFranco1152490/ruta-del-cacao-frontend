import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  apiError,
  buildSession,
  notAuthenticated,
  sessionExpired as unauthorized,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import { SessionGuard } from './session-guard';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const ME = apiUrl('/api/auth/me');
const session = buildSession();

beforeEach(() => vi.clearAllMocks());

describe('SessionGuard', () => {
  it('shows a loading state, then the protected content', async () => {
    server.use(http.get(ME, () => HttpResponse.json(session)));
    renderWithProviders(<SessionGuard>contenido protegido</SessionGuard>);

    expect(screen.getByRole('status')).toHaveTextContent('Validando tu sesión');
    expect(await screen.findByText('contenido protegido')).toBeInTheDocument();
  });

  it('sends the person to login when there is no session and never shows the content', async () => {
    server.use(
      http.get(ME, unauthorized),
      http.post(apiUrl('/api/auth/refresh'), unauthorized),
    );
    renderWithProviders(<SessionGuard>contenido protegido</SessionGuard>);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument();
  });

  it('decides by status and not by error code when the 401 says not_authenticated', async () => {
    server.use(
      http.get(ME, notAuthenticated),
      http.post(apiUrl('/api/auth/refresh'), notAuthenticated),
    );
    renderWithProviders(<SessionGuard>contenido protegido</SessionGuard>);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument();
  });

  it('renews an expired access token instead of logging out', async () => {
    let calls = 0;
    server.use(
      http.get(ME, () =>
        calls++ === 0 ? unauthorized() : HttpResponse.json(session),
      ),
      http.post(
        apiUrl('/api/auth/refresh'),
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    renderWithProviders(<SessionGuard>contenido protegido</SessionGuard>);

    expect(await screen.findByText('contenido protegido')).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('lets the person retry a network error without redirecting to login', async () => {
    let failing = true;
    server.use(
      http.get(ME, () =>
        failing ? HttpResponse.error() : HttpResponse.json(session),
      ),
    );
    renderWithProviders(<SessionGuard>contenido protegido</SessionGuard>);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Revisa la conexión',
    );
    expect(router.replace).not.toHaveBeenCalled();
    failing = false;
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('contenido protegido')).toBeInTheDocument();
  });

  it('redirects when a later check of the session fails with 401', async () => {
    server.use(http.get(ME, () => HttpResponse.json(session)));
    const { queryClient } = renderWithProviders(
      <SessionGuard>contenido protegido</SessionGuard>,
    );
    await screen.findByText('contenido protegido');

    server.use(
      http.get(ME, unauthorized),
      http.post(apiUrl('/api/auth/refresh'), unauthorized),
    );
    await queryClient.invalidateQueries({ queryKey: ['session'] });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it.each([
    ['a network error', () => HttpResponse.error()],
    [
      'a server error',
      () => apiError(502, 'bad_gateway', 'Puerta de enlace no disponible.'),
    ],
  ])(
    'keeps the protected content when a later check fails with %s',
    async (_case, failure) => {
      server.use(http.get(ME, () => HttpResponse.json(session)));
      const { queryClient } = renderWithProviders(
        <SessionGuard>contenido protegido</SessionGuard>,
      );
      await screen.findByText('contenido protegido');

      server.use(http.get(ME, failure));
      // TanStack Query avisa a React en el siguiente tick: sin esperarlo, las aserciones corren
      // antes de que el fallo llegue a la pantalla y el caso pasaría también con el error visible.
      await act(async () => {
        await queryClient.refetchQueries({ queryKey: ['session'] });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(queryClient.getQueryState(['session'])?.status).toBe('error');
      expect(screen.getByText('contenido protegido')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(router.replace).not.toHaveBeenCalled();
    },
  );
});

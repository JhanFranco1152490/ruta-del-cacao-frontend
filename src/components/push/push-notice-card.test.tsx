import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { PushState } from '@/lib/push/subscription';
import { buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

// El navegador se simula en las pruebas de la suscripción: aquí, lo que dice y hace la tarjeta.
vi.mock('@/lib/push/subscription', () => ({
  readPushState: vi.fn(),
  enablePush: vi.fn(),
  disablePush: vi.fn(),
}));

import {
  disablePush,
  enablePush,
  readPushState,
} from '@/lib/push/subscription';

import { PushNoticeCard } from './push-notice-card';

const withState = (state: PushState) =>
  vi.mocked(readPushState).mockResolvedValue(state);

// Con la sesión confirmada por el servidor: hay conexión.
function renderCard(place: 'panel' | 'account') {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession());
  return renderWithProviders(<PushNoticeCard place={place} />, { queryClient });
}

const withKey = (public_key: string | null) =>
  server.use(
    http.get(apiUrl('/api/notifications/push-config'), () =>
      HttpResponse.json({ public_key }),
    ),
  );

beforeEach(() => {
  vi.clearAllMocks();
  withKey('BNc');
});

describe('PushNoticeCard', () => {
  it('offers to turn them on, and asks for the permission only when tapping', async () => {
    withState('prompt');
    vi.mocked(enablePush).mockResolvedValue('active');
    renderCard('panel');

    const button = await screen.findByRole('button', { name: 'Activar' });
    expect(
      screen.getByText('Recibe los avisos en este dispositivo'),
    ).toBeVisible();
    expect(enablePush).not.toHaveBeenCalled();

    await userEvent.click(button);

    expect(enablePush).toHaveBeenCalledWith('BNc');
    expect(
      await screen.findByText('Avisos activados en este dispositivo'),
    ).toBeVisible();
  });

  it('says how to unblock them when the person refuses', async () => {
    withState('prompt');
    vi.mocked(enablePush).mockResolvedValue('blocked');
    renderCard('panel');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Activar' }),
    );

    expect(
      await screen.findByText(
        'Los avisos están bloqueados en este navegador. Puedes activarlos en su configuración.',
      ),
    ).toBeVisible();
  });

  it('tells an iPhone to add the app to the home screen, without Activar', async () => {
    withState('ios-not-installed');
    renderCard('panel');

    expect(
      await screen.findByText(
        'Para recibir avisos en el iPhone, agrega la app a la pantalla de inicio (Compartir → Agregar a inicio).',
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Activar' }),
    ).not.toBeInTheDocument();
  });

  it('turns them off from the account', async () => {
    withState('active');
    vi.mocked(disablePush).mockResolvedValue('prompt');
    renderCard('account');

    expect(
      await screen.findByText('Avisos activados en este dispositivo'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(disablePush).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole('button', { name: 'Activar' }),
    ).toBeVisible();
  });

  it('goes under its own heading in the account', async () => {
    withState('prompt');
    renderCard('account');

    expect(
      await screen.findByRole('heading', {
        name: 'Avisos en este dispositivo',
      }),
    ).toBeVisible();
  });

  it('shows the blocked notice in the account', async () => {
    withState('blocked');
    renderCard('account');

    expect(
      await screen.findByText(/Los avisos están bloqueados en este navegador/),
    ).toBeVisible();
  });

  it('does not take room in the panel once they are on or blocked', async () => {
    withState('active');
    const { container } = renderCard('panel');

    await waitFor(() => expect(readPushState).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('is not there when the server has push turned off', async () => {
    withKey(null);
    withState('prompt');
    const { container } = renderCard('account');

    await waitFor(() => expect(readPushState).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('is not there when the browser cannot receive them', async () => {
    withState('unsupported');
    const { container } = renderCard('account');

    await waitFor(() => expect(readPushState).toHaveBeenCalled());
    // Tampoco el título de la sección: no hay nada debajo.
    expect(container).toBeEmptyDOMElement();
  });

  it('says why it cannot turn them on when the server fails', async () => {
    withState('prompt');
    vi.mocked(enablePush).mockRejectedValue(new Error('sin red'));
    renderCard('panel');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Activar' }),
    );

    // Un error también se anuncia aparte para el lector de pantalla.
    expect(
      await screen.findAllByText(
        'No fue posible activar los avisos. Inténtalo nuevamente.',
      ),
    ).not.toHaveLength(0);
  });
});

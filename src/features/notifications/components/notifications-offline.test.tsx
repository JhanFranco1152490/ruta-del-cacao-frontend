import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import { buildNotification, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import {
  NOTIFICATIONS_FIRST_PAGE_CACHE_KEY,
  UNREAD_COUNT_CACHE_KEY,
} from '../api';
import { NotificationCenter } from './notification-center';

let userId: string;
let sent: string[];

beforeEach(() => {
  userId = `offline-${crypto.randomUUID()}`;
  sent = [];
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  // Sin red, nada llega al servidor: las lecturas usan la copia del dispositivo.
  server.use(
    http.get(apiUrl('/api/notifications/unread-count'), () =>
      HttpResponse.error(),
    ),
    http.get(apiUrl('/api/notifications'), () => HttpResponse.error()),
    http.all(apiUrl('/api/notifications/*'), ({ request }) => {
      sent.push(`${request.method} ${new URL(request.url).pathname}`);
      return HttpResponse.error();
    }),
  );
});

afterEach(() => vi.restoreAllMocks());

async function saveCopy() {
  const db = getOfflineDb(userId);
  await db.cache.put({
    key: UNREAD_COUNT_CACHE_KEY,
    value: { count: 1 },
    fetchedAt: 1,
  });
  await db.cache.put({
    key: NOTIFICATIONS_FIRST_PAGE_CACHE_KEY,
    value: {
      count: 2,
      next: null,
      results: [
        buildNotification({ id: 'n1' }),
        buildNotification({ id: 'n2', read_at: '2026-10-17T12:00:00Z' }),
      ],
    },
    fetchedAt: 1,
  });
}

async function openPanel() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions: [PERMISSIONS.ACTIVITIES_VIEW] }),
  );
  renderWithProviders(<NotificationCenter />, { queryClient });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }),
  );
  return screen.findByRole('dialog', { name: 'Notificaciones' });
}

describe('the notifications without a connection', () => {
  it('shows the saved ones and says so', async () => {
    await saveCopy();
    const panel = await openPanel();

    expect(
      await within(panel).findByText(
        'Sin conexión · se muestran las notificaciones guardadas',
      ),
    ).toBeVisible();
    expect(within(panel).getAllByRole('listitem')).toHaveLength(2);
  });

  it('turns off marking and dismissing, saying why', async () => {
    await saveCopy();
    const panel = await openPanel();
    await within(panel).findAllByRole('listitem');

    for (const name of ['Marcar todas como leídas', 'Eliminar las leídas']) {
      const button = within(panel).getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(
        'Marcar y eliminar notificaciones necesita conexión.',
      );
    }
    for (const button of within(panel).getAllByRole('button', {
      name: 'Eliminar notificación',
    })) {
      expect(button).toBeDisabled();
    }
  });

  it('opens the activity without marking it as read', async () => {
    await saveCopy();
    const panel = await openPanel();

    const [first] = await within(panel).findAllByRole('link');
    await userEvent.click(first);

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Notificaciones' }),
      ).not.toBeInTheDocument(),
    );
    expect(sent).toEqual([]);
  });

  it('says that nothing was saved in this device', async () => {
    await getOfflineDb(userId).cache.put({
      key: UNREAD_COUNT_CACHE_KEY,
      value: { count: 1 },
      fetchedAt: 1,
    });
    const panel = await openPanel();

    expect(
      await within(panel).findByText(
        'Sin conexión, y este dispositivo no tiene notificaciones guardadas.',
      ),
    ).toBeVisible();
  });
});

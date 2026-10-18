import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { NotificationCenter } from './notification-center';

let read: string[];
let urls: string[];

beforeEach(() => {
  read = [];
  urls = [];
  server.use(
    http.get(apiUrl('/api/notifications/unread-count'), () =>
      HttpResponse.json({ count: 1 }),
    ),
    http.get(apiUrl('/api/notifications'), () =>
      HttpResponse.json({ count: 0, next: null, results: [] }),
    ),
    http.post(apiUrl('/api/notifications/:id/read'), ({ params }) => {
      read.push(String(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

afterEach(() => vi.restoreAllMocks());

function renderCenter(searchParams: string) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `links-${crypto.randomUUID()}`,
      permissions: [PERMISSIONS.ACTIVITIES_VIEW],
    }),
  );
  renderWithProviders(<NotificationCenter />, {
    queryClient,
    searchParams,
    onUrlUpdate: ({ queryString }) => urls.push(queryString),
  });
}

describe('the links of a push', () => {
  it('marks as read the notification of the link and takes it out of the URL', async () => {
    renderCenter('?mes=2026-10&actividad=a1&notificacion=n5');

    await waitFor(() => expect(read).toEqual(['n5']));
    await waitFor(() => expect(urls.at(-1)).toBe('?mes=2026-10&actividad=a1'));
  });

  it('waits for a connection to mark it', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderCenter('?notificacion=n5');

    await screen.findByRole('button', { name: /^Notificaciones/ });
    expect(read).toEqual([]);
    expect(urls).toEqual([]);
  });

  it('opens the panel for a push that sums up several', async () => {
    renderCenter('?notificaciones=abiertas');

    expect(
      await screen.findByRole('dialog', { name: 'Notificaciones' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(urls.at(-1)).toBe(''));
  });
});

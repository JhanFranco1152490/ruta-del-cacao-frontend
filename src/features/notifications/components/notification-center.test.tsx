import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { NotificationCenter } from './notification-center';

const countHandler = (count: number, calls: string[] = []) =>
  http.get(apiUrl('/api/notifications/unread-count'), () => {
    calls.push('count');
    return HttpResponse.json({ count });
  });

function renderCenter(user: Parameters<typeof buildSession>[0]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: `center-${crypto.randomUUID()}`, ...user }),
  );
  renderWithProviders(<NotificationCenter />, { queryClient });
}

const FOREMAN = { permissions: [PERMISSIONS.ACTIVITIES_VIEW] };

describe('NotificationCenter', () => {
  it('shows the bell with how many are unread', async () => {
    server.use(countHandler(3));
    renderCenter(FOREMAN);

    const bell = await screen.findByRole('button', {
      name: 'Notificaciones, 3 sin leer',
    });
    expect(bell).toHaveTextContent('3');
  });

  it('says 9+ from ten on', async () => {
    server.use(countHandler(12));
    renderCenter(FOREMAN);

    expect(
      await screen.findByRole('button', {
        name: 'Notificaciones, 12 sin leer',
      }),
    ).toHaveTextContent('9+');
  });

  it('shows the bell without a number when everything is read', async () => {
    server.use(countHandler(0));
    renderCenter(FOREMAN);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Notificaciones' }),
      ).not.toHaveTextContent(/\d/),
    );
  });

  it('is not there without the permission to see activities', () => {
    const calls: string[] = [];
    server.use(countHandler(3, calls));
    renderCenter({ permissions: [PERMISSIONS.PRODUCERS_VIEW] });

    expect(
      screen.queryByRole('button', { name: /^Notificaciones/ }),
    ).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('is not there for the technical account, which receives none', () => {
    const calls: string[] = [];
    server.use(countHandler(3, calls));
    renderCenter({ ...FOREMAN, producer_id: null });

    expect(
      screen.queryByRole('button', { name: /^Notificaciones/ }),
    ).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAgriculturalActivity,
  buildNotification,
  buildSession,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { NotificationCenter } from './notification-center';

type Notification = components['schemas']['Notification'];

// Domingo 18 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-18T17:00:00Z');

const NOW_ISO = NOW.toISOString();

let pages: Notification[][];
let read: string[];
let sent: string[];
let dismissed: Map<string, Notification>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  pages = [
    [
      buildNotification({ id: 'n1', created_at: '2026-10-18T15:00:00Z' }),
      buildNotification({
        id: 'n2',
        kind: 'activity_overdue',
        read_at: '2026-10-17T12:00:00Z',
        created_at: '2026-10-15T11:05:00Z',
        condition_date: '2026-10-12',
        activity: buildAgriculturalActivity({
          id: 'a2',
          activity_type: 'pruning',
          scheduled_date: '2026-10-12',
        }),
      }),
    ],
  ];
  read = [];
  sent = [];
  dismissed = new Map();
  server.use(
    http.get(apiUrl('/api/notifications/unread-count'), () =>
      HttpResponse.json({
        count: pages.flat().filter(({ read_at }) => !read_at).length,
      }),
    ),
    http.get(apiUrl('/api/notifications'), ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      return HttpResponse.json({
        count: pages.flat().length,
        next:
          page < pages.length
            ? apiUrl(`/api/notifications?page=${page + 1}`)
            : null,
        results: pages[page - 1] ?? [],
      });
    }),
    http.post(apiUrl('/api/notifications/:id/read'), ({ params }) => {
      read.push(String(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
    // Un backend en memoria: lo que se marca o se elimina cambia la lista y el número.
    http.post(apiUrl('/api/notifications/read-all'), () => {
      sent.push('read-all');
      pages = pages.map((page) =>
        page.map((item) => ({ ...item, read_at: item.read_at ?? NOW_ISO })),
      );
      return HttpResponse.json({ updated: 1 });
    }),
    http.post(apiUrl('/api/notifications/dismiss-read'), () => {
      sent.push('dismiss-read');
      pages = pages.map((page) => page.filter(({ read_at }) => !read_at));
      return HttpResponse.json({ dismissed: 1 });
    }),
    http.delete(apiUrl('/api/notifications/:id'), ({ params }) => {
      sent.push(`dismiss ${params.id}`);
      const id = String(params.id);
      pages = pages.map((page) =>
        page.filter((item) => {
          if (item.id !== id) return true;
          dismissed.set(id, item);
          return false;
        }),
      );
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(apiUrl('/api/notifications/:id/restore'), ({ params }) => {
      const id = String(params.id);
      sent.push(`restore ${id}`);
      const item = dismissed.get(id);
      if (item) pages = [[item, ...pages[0]], ...pages.slice(1)];
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

afterEach(() => vi.useRealTimers());

function renderCenter() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `panel-${crypto.randomUUID()}`,
      permissions: [PERMISSIONS.ACTIVITIES_VIEW],
    }),
  );
  renderWithProviders(<NotificationCenter />, { queryClient });
}

const openPanel = async () => {
  await userEvent.click(
    await screen.findByRole('button', { name: /^Notificaciones/ }),
  );
  return screen.findByRole('dialog', { name: 'Notificaciones' });
};

const rows = (panel: HTMLElement) =>
  within(
    within(panel).getByRole('list', { name: 'Notificaciones' }),
  ).getAllByRole('listitem');

describe('NotificationsPanel', () => {
  it('lists them in the order of the server, saying which are unread', async () => {
    renderCenter();
    const panel = await openPanel();

    await waitFor(() => expect(rows(panel)).toHaveLength(2));
    const [upcoming, overdue] = rows(panel);
    expect(upcoming).toHaveTextContent('Sin leer');
    expect(upcoming).toHaveTextContent('Actividad próxima a su fecha');
    expect(upcoming).toHaveTextContent('Fertilización · P03 · Finca de prueba');
    expect(upcoming).toHaveTextContent('Faltan 2 días · 20 oct');
    expect(upcoming).toHaveTextContent('hace 2 h');
    expect(overdue).not.toHaveTextContent('Sin leer');
    expect(overdue).toHaveTextContent('Actividad vencida · 6 días de retraso');
    expect(overdue).toHaveTextContent('15 oct');
  });

  it('tells a critical one apart while it is unread', async () => {
    pages = [
      [
        buildNotification({ id: 'n7', severity: 'critical' }),
        buildNotification({
          id: 'n8',
          severity: 'critical',
          read_at: '2026-10-18T12:00:00Z',
        }),
      ],
    ];
    renderCenter();
    const panel = await openPanel();

    await waitFor(() => expect(rows(panel)).toHaveLength(2));
    expect(rows(panel)[0]).toHaveTextContent('Importante');
    expect(rows(panel)[1]).not.toHaveTextContent('Importante');
  });

  it('marks one as read when opening it and goes to the activity', async () => {
    renderCenter();
    const panel = await openPanel();

    const link = await within(panel).findByRole('link', {
      name: /Actividad próxima a su fecha/,
    });
    expect(link).toHaveAttribute(
      'href',
      '/actividades?mes=2026-10&actividad=a1',
    );
    await userEvent.click(link);

    await waitFor(() => expect(read).toEqual(['n1']));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Notificaciones' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('does not mark again one that was already read', async () => {
    renderCenter();
    const panel = await openPanel();

    await userEvent.click(
      await within(panel).findByRole('link', { name: /Actividad vencida/ }),
    );

    expect(read).toEqual([]);
  });

  it('shows the next twenty with Ver más', async () => {
    pages.push([
      buildNotification({
        id: 'n3',
        created_at: '2026-10-10T12:00:00Z',
        read_at: '2026-10-11T12:00:00Z',
      }),
    ]);
    renderCenter();
    const panel = await openPanel();
    await waitFor(() => expect(rows(panel)).toHaveLength(2));

    await userEvent.click(
      within(panel).getByRole('button', { name: 'Ver más' }),
    );

    await waitFor(() => expect(rows(panel)).toHaveLength(3));
    expect(
      within(panel).queryByRole('button', { name: 'Ver más' }),
    ).not.toBeInTheDocument();
  });

  it('shows a kind it does not know without a link', async () => {
    pages = [
      [
        buildNotification({
          id: 'n9',
          kind: 'drying_overdried' as Notification['kind'],
          activity: null,
        }),
      ],
    ];
    renderCenter();
    const panel = await openPanel();

    await waitFor(() => expect(rows(panel)).toHaveLength(1));
    expect(rows(panel)[0]).toHaveTextContent('Aviso');
    expect(within(rows(panel)[0]).queryByRole('link')).not.toBeInTheDocument();
  });

  it('says when there is nothing', async () => {
    pages = [[]];
    renderCenter();
    const panel = await openPanel();

    expect(
      await within(panel).findByRole('heading', { name: 'Estás al día' }),
    ).toBeInTheDocument();
  });
});

describe('the actions of the panel', () => {
  it('marks all as read and leaves the bell without a number', async () => {
    renderCenter();
    const panel = await openPanel();

    await userEvent.click(
      await within(panel).findByRole('button', {
        name: 'Marcar todas como leídas',
      }),
    );

    await waitFor(() => expect(sent).toEqual(['read-all']));
    // Con el panel abierto, la cabecera queda fuera del alcance del lector de pantalla.
    expect(
      await screen.findByRole('button', {
        name: 'Notificaciones',
        hidden: true,
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(panel).queryByRole('button', {
          name: 'Marcar todas como leídas',
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it('dismisses the read ones after confirming how many', async () => {
    renderCenter();
    const panel = await openPanel();

    await userEvent.click(
      await within(panel).findByRole('button', {
        name: 'Eliminar las leídas',
      }),
    );
    const confirm = await screen.findByRole('dialog', {
      name: '¿Eliminar 1 notificación leída?',
    });
    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Eliminar' }),
    );

    await waitFor(() => expect(sent).toEqual(['dismiss-read']));
    await waitFor(() => expect(rows(panel)).toHaveLength(1));
    expect(
      within(panel).queryByRole('button', { name: 'Eliminar las leídas' }),
    ).not.toBeInTheDocument();
  });

  it('offers neither action when there is nothing to mark or dismiss', async () => {
    pages = [[]];
    renderCenter();
    const panel = await openPanel();

    await within(panel).findByRole('heading', { name: 'Estás al día' });
    expect(
      within(panel).queryAllByRole('button', { name: /Marcar|Eliminar/ }),
    ).toHaveLength(0);
  });

  it('dismisses one without asking, and brings it back with Deshacer', async () => {
    renderCenter();
    const panel = await openPanel();
    await waitFor(() => expect(rows(panel)).toHaveLength(2));

    await userEvent.click(
      within(rows(panel)[1]).getByRole('button', {
        name: 'Eliminar notificación',
      }),
    );

    expect(await screen.findByText('Notificación eliminada')).toBeVisible();
    await waitFor(() => expect(rows(panel)).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));

    await waitFor(() => expect(sent).toEqual(['dismiss n2', 'restore n2']));
    await waitFor(() => expect(rows(panel)).toHaveLength(2));
  });
});

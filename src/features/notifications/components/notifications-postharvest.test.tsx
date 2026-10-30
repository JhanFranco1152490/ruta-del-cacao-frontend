import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildLotBrief,
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

const NOW = new Date('2026-10-21T17:00:00Z');

const lotNotice = (overrides: Partial<Notification>) =>
  buildNotification({
    activity: null,
    condition_date: null,
    lot: buildLotBrief(),
    created_at: '2026-10-21T13:05:00Z',
    ...overrides,
  });

const TURN_DUE = lotNotice({
  id: 'n1',
  kind: 'fermentation_turn_due',
  condition_at: '2026-10-21T13:00:00Z',
});

let results: Notification[];
let read: string[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  results = [TURN_DUE];
  read = [];
  server.use(
    http.get(apiUrl('/api/notifications/unread-count'), () =>
      HttpResponse.json({
        count: results.filter(({ read_at }) => !read_at).length,
      }),
    ),
    http.get(apiUrl('/api/notifications'), () =>
      HttpResponse.json({ count: results.length, next: null, results }),
    ),
    http.post(apiUrl('/api/notifications/:id/read'), ({ params }) => {
      read.push(String(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

afterEach(() => vi.useRealTimers());

async function openPanel() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `postharvest-${crypto.randomUUID()}`,
      permissions: [PERMISSIONS.ACTIVITIES_VIEW],
    }),
  );
  renderWithProviders(<NotificationCenter />, { queryClient });
  await userEvent.click(
    await screen.findByRole('button', { name: /^Notificaciones/ }),
  );
  return screen.findByRole('dialog', { name: 'Notificaciones' });
}

const firstRow = async (panel: HTMLElement) => {
  const list = await within(panel).findByRole('list', {
    name: 'Notificaciones',
  });
  await waitFor(() =>
    expect(within(list).getAllByRole('listitem')).toHaveLength(results.length),
  );
  return within(list).getAllByRole('listitem')[0];
};

describe('postharvest notifications in the inbox', () => {
  it('says where a pending record comes from and offers to record it', async () => {
    const row = await firstRow(await openPanel());

    expect(row).toHaveTextContent('Fermentación');
    expect(row).toHaveTextContent('Volteo pendiente');
    expect(row).toHaveTextContent(
      '000123-F02-P05-261014-1 · La Esperanza · cajón C-02',
    );
    expect(
      within(row).getByRole('link', { name: /Volteo pendiente/ }),
    ).toHaveAttribute('href', '/lotes/detalle?id=l1');
    expect(
      within(row).getByRole('link', { name: 'Registrar volteo' }),
    ).toHaveAttribute('href', '/fermentacion/volteo?lote=l1');
  });

  it('marks it as read and closes the panel when recording from it', async () => {
    const panel = await openPanel();
    const row = await firstRow(panel);

    await userEvent.click(
      within(row).getByRole('link', { name: 'Registrar volteo' }),
    );

    await waitFor(() => expect(read).toEqual(['n1']));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Notificaciones' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('no longer offers to record what already arrived', async () => {
    results = [
      { ...TURN_DUE, resolved_at: '2026-10-21T14:20:00Z', read_at: null },
    ];
    const row = await firstRow(await openPanel());

    expect(row).toHaveTextContent('Ya se registró · 21 oct. 09:20');
    expect(
      within(row).queryByRole('link', { name: 'Registrar volteo' }),
    ).not.toBeInTheDocument();
  });

  it('offers the drying log on a pending drying day', async () => {
    results = [
      lotNotice({
        id: 'n2',
        kind: 'drying_log_due',
        condition_at: '2026-10-21T13:00:00Z',
        lot: buildLotBrief({
          status: 'drying',
          drying: {
            started_at: '2026-10-19T09:00:00-05:00',
            ended_at: null,
            facility: 'M-01',
            final_moisture_pct: null,
            dry_weight_kg: null,
            yield_pct: null,
          },
        }),
      }),
    ];
    const row = await firstRow(await openPanel());

    expect(row).toHaveTextContent('Secado');
    expect(
      within(row).getByRole('link', { name: 'Registrar bitácora' }),
    ).toHaveAttribute('href', '/secado/bitacora?lote=l1');
  });

  it('shows a deviation as a single link to the lot, critical while unread', async () => {
    results = [
      lotNotice({
        id: 'n3',
        kind: 'drying_overdried',
        severity: 'critical',
        lot: buildLotBrief({ status: 'drying' }),
        drying_log: {
          id: 'g4',
          day_number: 4,
          measured_at: '2026-10-21T15:30:00Z',
          moisture_pct: '5.8',
        },
      }),
    ];
    const row = await firstRow(await openPanel());

    expect(row).toHaveTextContent('Importante: Sobresecado');
    expect(row).toHaveTextContent('Día 4 · 5,8 %');
    expect(within(row).getAllByRole('link')).toHaveLength(1);
    expect(within(row).getByRole('link')).toHaveAttribute(
      'href',
      '/lotes/detalle?id=l1',
    );
  });

  it('keeps the activity notices without an origin', async () => {
    results = [buildNotification({ id: 'n4' })];
    const row = await firstRow(await openPanel());

    expect(row).toHaveTextContent('Actividad próxima a su fecha');
    expect(row).not.toHaveTextContent('Fermentación');
    expect(row).not.toHaveTextContent('Secado');
  });
});

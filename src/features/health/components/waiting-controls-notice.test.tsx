import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import {
  activityAssigneesHandler,
  agriculturalInputsHandler,
  apiUrl,
  inputStocksHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { WaitingControlsNotice } from './waiting-controls-notice';

type WaitingDetection = components['schemas']['WaitingDetection'];

const waiting = (
  overrides: Partial<WaitingDetection> = {},
): WaitingDetection => ({
  id: 'd1',
  pest_disease: {
    id: 'monilia',
    name: 'Monilia',
    kind: 'disease',
    is_active: true,
  },
  other_description: null,
  affected_units: 12,
  incidence: '24.00',
  sampling_unit: 'trees',
  monitoring: { id: 'm1', done_date: '2026-10-19' },
  plot: { id: 'pl1', code: 'P-03', farm: { id: 'f1', name: 'La Esperanza' } },
  control_requested_by: { id: 'u2', full_name: 'Luis Mora' },
  control_requested_at: '2026-10-19T15:20:00Z',
  ...overrides,
});

let detections: WaitingDetection[];

beforeEach(() => {
  detections = [
    waiting(),
    waiting({
      id: 'd2',
      pest_disease: null,
      other_description: 'Hormigas en hojas',
      incidence: '6.00',
    }),
  ];
  server.use(
    http.get(apiUrl('/api/phytosanitary-detections/without-control'), () =>
      HttpResponse.json({ results: detections }),
    ),
    agriculturalInputsHandler([]),
    inputStocksHandler([]),
    activityAssigneesHandler([]),
  );
});

function renderNotice(
  permissions: string[] = [
    PERMISSIONS.ACTIVITIES_VIEW,
    PERMISSIONS.ACTIVITIES_ADD,
  ],
  openActivity = vi.fn(),
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: `notice-${crypto.randomUUID()}`, permissions }),
  );
  renderWithProviders(
    <WaitingControlsNotice openActivity={openActivity} producer={null} />,
    { queryClient },
  );
  return openActivity;
}

describe('WaitingControlsNotice', () => {
  it('says how many detections wait for a control to who schedules', async () => {
    renderNotice();

    expect(
      await screen.findByText('2 detecciones esperan un control'),
    ).toBeVisible();
  });

  it('says it in singular for one', async () => {
    detections = [waiting()];
    renderNotice();

    expect(
      await screen.findByText('1 detección espera un control'),
    ).toBeVisible();
  });

  it('asks nothing and shows nothing to who cannot schedule', () => {
    let asked = false;
    server.use(
      http.get(apiUrl('/api/phytosanitary-detections/without-control'), () => {
        asked = true;
        return HttpResponse.json({ results: detections });
      }),
    );
    renderNotice([PERMISSIONS.ACTIVITIES_VIEW]);

    expect(asked).toBe(false);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows nothing when no detection waits', async () => {
    let asked = false;
    detections = [];
    server.use(
      http.get(apiUrl('/api/phytosanitary-detections/without-control'), () => {
        asked = true;
        return HttpResponse.json({ results: detections });
      }),
    );
    renderNotice();

    await waitFor(() => expect(asked).toBe(true));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('lists each detection with where, what, when and who asked', async () => {
    renderNotice();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver' }));

    const list = await screen.findByRole('list', {
      name: 'Detecciones que esperan un control',
    });
    const [first] = within(list).getAllByRole('listitem');
    expect(first).toHaveTextContent('P-03 · La Esperanza');
    expect(first).toHaveTextContent('Monilia 24 % de árboles');
    expect(first).toHaveTextContent(
      'Monitoreo del 19 de octubre · Lo pidió Luis Mora el 19 oct',
    );
    expect(
      within(first).getByRole('button', { name: 'Programar control' }),
    ).toBeVisible();
    expect(
      within(first).getByRole('button', { name: 'No requiere control' }),
    ).toBeVisible();
  });

  it('opens the monitoring of a detection', async () => {
    const openActivity = renderNotice();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver' }));
    const [first] = within(
      await screen.findByRole('list', {
        name: 'Detecciones que esperan un control',
      }),
    ).getAllByRole('listitem');
    await userEvent.click(
      within(first).getByRole('button', { name: 'Ver el monitoreo' }),
    );

    expect(openActivity).toHaveBeenCalledWith('m1');
  });

  it('counts one less when someone decides it needs no control', async () => {
    server.use(
      http.post(
        apiUrl('/api/phytosanitary-detections/:id/no-control-needed'),
        ({ params }) => {
          detections = detections.filter(({ id }) => id !== params.id);
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    renderNotice();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver' }));
    const [first] = within(
      await screen.findByRole('list', {
        name: 'Detecciones que esperan un control',
      }),
    ).getAllByRole('listitem');
    await userEvent.click(
      within(first).getByRole('button', { name: 'No requiere control' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Confirmar' }),
    );

    await waitFor(() =>
      expect(
        screen.getByText('1 detección espera un control'),
      ).toBeInTheDocument(),
    );
  });
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildFarm,
  buildPage,
  buildProducer,
  buildSession,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { FarmPicker } from './farm-picker';

function renderPicker(
  onPick = vi.fn(),
  session: Parameters<typeof buildSession>[0] = {},
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession(session));
  return renderWithProviders(<FarmPicker onPick={onPick} />, { queryClient });
}

describe('FarmPicker', () => {
  it('lists farms with their municipality and producer, and hands over the one chosen', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(apiUrl('/api/farms'), ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(
          buildPage([
            buildFarm({ id: 'f1', name: 'La Esperanza' }),
            buildFarm({
              id: 'f2',
              name: 'El Porvenir',
              producer: {
                id: 'p2',
                member_code: 'PROD-000008',
                first_name: 'Luis',
                last_name: 'Gómez',
              },
            }),
          ]),
        );
      }),
    );
    const onPick = vi.fn();
    renderPicker(onPick);

    await userEvent.click(screen.getByLabelText('Finca'));
    await userEvent.click(
      await screen.findByRole('option', {
        name: 'El Porvenir · Cúcuta · Luis Gómez · PROD-000008',
      }),
    );

    expect(onPick).toHaveBeenCalledWith('f2');
  });

  it('searches by what the person types', async () => {
    const searches: (string | null)[] = [];
    server.use(
      http.get(apiUrl('/api/farms'), ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('search'));
        return HttpResponse.json(buildPage([]));
      }),
    );
    renderPicker();

    await userEvent.click(screen.getByLabelText('Finca'));
    await userEvent.type(screen.getByLabelText('Finca'), 'Espe');

    await vi.waitFor(() => expect(searches.at(-1)).toBe('Espe'));
    expect(
      await screen.findByText('Ninguna finca coincide con la búsqueda.'),
    ).toBeVisible();
  });
});

describe('FarmPicker and the producer filter', () => {
  const PRODUCER = '33333333-3333-4333-8333-333333333333';
  const noProducerOfItsOwn = {
    producer_id: null,
    permissions: [PERMISSIONS.PRODUCERS_VIEW, PERMISSIONS.PLOTS_ADD],
  };

  function serveFarmsAndProducers(farmRequests: URLSearchParams[]) {
    server.use(
      http.get(apiUrl('/api/farms'), ({ request }) => {
        farmRequests.push(new URL(request.url).searchParams);
        return HttpResponse.json(buildPage([buildFarm({ id: 'f1' })]));
      }),
      http.get(apiUrl('/api/producers'), () =>
        HttpResponse.json(
          buildPage([
            {
              id: PRODUCER,
              member_code: 'PROD-000007',
              document_type: 'CC',
              identity_document: '1234567890',
              first_name: 'Ana',
              last_name: 'Prueba',
              municipality_code: '54001',
              status: 'active',
            },
          ]),
        ),
      ),
      http.get(apiUrl(`/api/producers/${PRODUCER}`), () =>
        HttpResponse.json(buildProducer({ id: PRODUCER, first_name: 'Ana' })),
      ),
    );
  }

  it('lets whoever has no producer of its own narrow the farms to one producer', async () => {
    const requests: URLSearchParams[] = [];
    serveFarmsAndProducers(requests);
    renderPicker(vi.fn(), noProducerOfItsOwn);

    await userEvent.click(await screen.findByLabelText('Productor'));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Ana Prueba · PROD-000007' }),
    );

    await vi.waitFor(() =>
      expect(requests.at(-1)?.get('producer')).toBe(PRODUCER),
    );
  });

  it('does not show it to a producer, who only sees its own farms', async () => {
    serveFarmsAndProducers([]);
    renderPicker(vi.fn(), {
      producer_id: 'p1',
      permissions: [PERMISSIONS.PLOTS_ADD],
    });

    await screen.findByLabelText('Finca');
    expect(screen.queryByLabelText('Productor')).not.toBeInTheDocument();
  });

  it('does not show it without permission to see producers', async () => {
    serveFarmsAndProducers([]);
    renderPicker(vi.fn(), {
      producer_id: null,
      permissions: [PERMISSIONS.PLOTS_ADD],
    });

    await screen.findByLabelText('Finca');
    expect(screen.queryByLabelText('Productor')).not.toBeInTheDocument();
  });
});

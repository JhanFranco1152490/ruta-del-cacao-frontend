import type { QueryClient } from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { apiError, buildProducer } from '@/test/factories';
import { apiUrl, municipalitiesHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import { ProducerEditorScreen } from './producer-editor-screen';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const PRODUCER = apiUrl('/api/producers/p1');

const DETAIL_KEY = queryKeys.producers.detail('p1');

let reads = 0;
let bodies: unknown[] = [];
let current = buildProducer();
let readFails = false;

// TanStack Query avisa a React en el siguiente tick: sin esperarlo, las aserciones corren antes
// de que el resultado del refetch llegue a la pantalla.
const refetchProducer = (queryClient: QueryClient) =>
  act(async () => {
    await queryClient.refetchQueries({ queryKey: DETAIL_KEY });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const waitForIdle = () => act(() => new Promise((r) => setTimeout(r, 50)));

beforeEach(() => {
  vi.clearAllMocks();
  reads = 0;
  bodies = [];
  current = buildProducer();
  readFails = false;
  server.use(
    municipalitiesHandler(),
    http.get(PRODUCER, () => {
      reads += 1;
      return readFails
        ? apiError(500, 'internal_error', 'Falla interna.')
        : HttpResponse.json(current);
    }),
    http.patch(PRODUCER, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(buildProducer({ version: 5 }));
    }),
  );
});

describe('ProducerEditorScreen', () => {
  it('loads the producer and shows the edit form with its data', async () => {
    server.use(http.get(PRODUCER, () => HttpResponse.json(buildProducer())));
    renderWithProviders(<ProducerEditorScreen id="p1" />);

    expect(await screen.findByLabelText('Nombres')).toHaveValue('Ana');
    expect(screen.getByLabelText('Apellidos')).toHaveValue('Prueba');
    expect(
      screen.getByRole('heading', { name: 'Editar productor' }),
    ).toBeInTheDocument();
  });

  it('shows the error when the producer cannot be loaded', async () => {
    server.use(
      http.get(PRODUCER, () =>
        apiError(404, 'not_found', 'El productor no existe.'),
      ),
    );
    renderWithProviders(<ProducerEditorScreen id="p1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El productor no existe.',
    );
    expect(
      screen.getByRole('link', { name: 'Volver a productores' }),
    ).toHaveAttribute('href', '/productores');
    expect(screen.queryByLabelText('Nombres')).not.toBeInTheDocument();
  });

  it('shows a generic message when the load fails without a server reply', async () => {
    server.use(http.get(PRODUCER, () => HttpResponse.error()));
    renderWithProviders(<ProducerEditorScreen id="p1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar la ficha del productor.',
    );
  });
});

describe('ProducerEditorScreen - background refreshes while editing', () => {
  async function typeLastName(user: ReturnType<typeof userEvent.setup>) {
    const lastName = await screen.findByLabelText('Apellidos');
    await user.clear(lastName);
    await user.type(lastName, 'Nueva');
  }

  it('keeps the typed values and the version the form started with when a refresh brings a newer record', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(
      <ProducerEditorScreen id="p1" />,
    );
    await typeLastName(user);

    current = buildProducer({ version: 4, first_name: 'Otra' });
    await refetchProducer(queryClient);
    expect(queryClient.getQueryData(DETAIL_KEY)).toMatchObject({ version: 4 });

    expect(screen.getByLabelText('Nombres')).toHaveValue('Ana');
    expect(screen.getByLabelText('Apellidos')).toHaveValue('Nueva');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(bodies).toEqual([
      expect.objectContaining({
        expected_version: 3,
        first_name: 'Ana',
        last_name: 'Nueva',
      }),
    ]);
  });

  it('keeps the form and the typed text when a background refresh fails', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(
      <ProducerEditorScreen id="p1" />,
    );
    await typeLastName(user);

    readFails = true;
    await refetchProducer(queryClient);

    expect(queryClient.getQueryState(DETAIL_KEY)?.status).toBe('error');
    expect(screen.getByLabelText('Apellidos')).toHaveValue('Nueva');
    expect(
      screen.queryByText('No fue posible abrir la ficha'),
    ).not.toBeInTheDocument();
  });

  it('does not refresh the record on its own while the form is open', async () => {
    renderWithProviders(<ProducerEditorScreen id="p1" />);
    await screen.findByLabelText('Nombres');

    act(() => {
      window.dispatchEvent(new Event('visibilitychange'));
    });
    await waitForIdle();

    expect(reads).toBe(1);
  });

  it('opens on the record already in the cache without asking for it again', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(DETAIL_KEY, buildProducer());
    renderWithProviders(<ProducerEditorScreen id="p1" />, { queryClient });

    expect(await screen.findByLabelText('Nombres')).toHaveValue('Ana');
    await waitForIdle();

    expect(reads).toBe(0);
  });
});

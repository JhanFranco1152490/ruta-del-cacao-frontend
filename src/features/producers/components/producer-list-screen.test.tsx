import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { OnUrlUpdateFunction } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { SessionGuard } from '@/features/auth/components/session-guard';
import { createQueryClient } from '@/lib/query-client';
import {
  apiError,
  buildPage,
  buildProducer,
  buildSession,
  notAuthenticated,
  sessionExpired,
} from '@/test/factories';
import { apiUrl, municipalitiesHandler } from '@/test/handlers';
import { expectVisibleFocusOutline } from '@/test/focus-outline';
import { renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import type { ProducerListItem } from '../api';
import { ProducerListScreen } from './producer-list-screen';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const PRODUCERS = apiUrl('/api/producers');
const ME = apiUrl('/api/auth/me');
const REFRESH = apiUrl('/api/auth/refresh');

function listItem(overrides: Partial<ProducerListItem> = {}) {
  const producer = buildProducer(overrides);
  return {
    id: producer.id,
    member_code: producer.member_code,
    document_type: producer.document_type,
    identity_document: producer.identity_document,
    first_name: producer.first_name,
    last_name: producer.last_name,
    municipality_code: producer.municipality_code,
    status: producer.status,
  } satisfies ProducerListItem;
}

let requests: URL[] = [];
const lastParams = () => requests.at(-1)!.searchParams;

function listHandler(results = [listItem()], count = results.length) {
  return http.get(PRODUCERS, ({ request }) => {
    requests.push(new URL(request.url));
    return HttpResponse.json(buildPage(results, count));
  });
}

const lastUrlUpdate = (spy: Mock<OnUrlUpdateFunction>) =>
  spy.mock.calls.at(-1)![0].searchParams;

beforeEach(() => {
  vi.clearAllMocks();
  requests = [];
  server.use(municipalitiesHandler(), listHandler());
});

describe('ProducerListScreen', () => {
  it('shows the producer with a masked document and the municipality name', async () => {
    renderWithProviders(<ProducerListScreen />);

    const row = (await screen.findByText('Ana Prueba')).closest('tr')!;
    expect(within(row).getByText('PROD-000001')).toBeInTheDocument();
    expect(within(row).getByText('CC ••••7890')).toBeInTheDocument();
    expect(within(row).queryByText(/1234567890/)).not.toBeInTheDocument();
    expect(await within(row).findByText('Cúcuta')).toBeInTheDocument();
    expect(within(row).queryByText('54001')).not.toBeInTheDocument();
    expect(within(row).getByText('Activo')).toBeInTheDocument();
    expect(
      within(row).getByRole('link', { name: /Ver\s?ficha de Ana Prueba/ }),
    ).toHaveAttribute('href', '/productores/p1');
    expect(
      within(row).getByRole('link', { name: /Editar\s?ficha de Ana Prueba/ }),
    ).toHaveAttribute('href', '/productores/p1/editar');
  });

  it('keeps the visible focus outline on the register link, the empty-state link and the search field', async () => {
    server.use(listHandler([]));
    renderWithProviders(<ProducerListScreen />);

    await screen.findByText('No hay productores para mostrar');
    const links = screen.getAllByRole('link', {
      name: /Registrar\s?productor/,
    });
    expect(links).toHaveLength(2);
    for (const link of links) expectVisibleFocusOutline(link);
    expectVisibleFocusOutline(screen.getByLabelText('Buscar productores'));
  });

  it('shows the empty state when there are no results', async () => {
    server.use(listHandler([]));
    renderWithProviders(<ProducerListScreen />);

    const empty = (await screen.findByText('No hay productores para mostrar'))
      .parentElement!;
    expect(
      within(empty).getByRole('link', { name: 'Registrar productor' }),
    ).toHaveAttribute('href', '/productores/nuevo');
  });

  it('shows the error and retries the load', async () => {
    let calls = 0;
    server.use(
      http.get(PRODUCERS, () =>
        calls++ === 0
          ? apiError(500, 'internal_error', 'Falla interna.')
          : HttpResponse.json(buildPage([listItem()])),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<ProducerListScreen />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar los productores. Inténtalo nuevamente.',
    );
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Ana Prueba')).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('searches after a pause, goes back to page 1 and reaches the URL', async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    const user = userEvent.setup();
    renderWithProviders(<ProducerListScreen />, {
      searchParams: '?pagina=2',
      onUrlUpdate,
    });
    await screen.findByText('Ana Prueba');

    await user.type(screen.getByLabelText('Buscar productores'), 'Prueba');

    await waitFor(() => expect(lastParams().get('search')).toBe('Prueba'));
    expect(lastParams().get('page')).toBe('1');
    // La pausa evita una petición por cada tecla.
    expect(requests.map((url) => url.searchParams.get('search'))).not.toContain(
      'P',
    );
    expect(lastUrlUpdate(onUrlUpdate).get('buscar')).toBe('Prueba');
    expect(lastUrlUpdate(onUrlUpdate).has('pagina')).toBe(false);
  });

  it('filters by status and by municipality', async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    const user = userEvent.setup();
    renderWithProviders(<ProducerListScreen />, { onUrlUpdate });
    await screen.findByText('Ana Prueba');
    await screen.findByRole('option', { name: 'Pamplona' });

    await user.selectOptions(
      screen.getByLabelText('Filtrar por estado'),
      'inactive',
    );
    await waitFor(() => expect(lastParams().get('status')).toBe('inactive'));

    await user.selectOptions(
      screen.getByLabelText('Filtrar por municipio'),
      '54518',
    );
    await waitFor(() =>
      expect(lastParams().get('municipality_code')).toBe('54518'),
    );
    expect(lastParams().get('status')).toBe('inactive');
    expect(lastUrlUpdate(onUrlUpdate).get('estado')).toBe('inactive');
    expect(lastUrlUpdate(onUrlUpdate).get('municipio')).toBe('54518');
  });

  it('labels both selects for assistive technology', async () => {
    renderWithProviders(<ProducerListScreen />);
    await screen.findByText('Ana Prueba');

    expect(
      screen.getByRole('combobox', { name: 'Filtrar por estado' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Filtrar por municipio' }),
    ).toBeInTheDocument();
  });

  it('paginates and respects the limits', async () => {
    server.use(listHandler([listItem()], 45));
    const user = userEvent.setup();
    renderWithProviders(<ProducerListScreen />);

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByText('45 productores encontrados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();
    await waitFor(() => expect(lastParams().get('page')).toBe('2'));

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Página 3 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('shows no pagination when everything fits in one page', async () => {
    renderWithProviders(<ProducerListScreen />);
    await screen.findByText('Ana Prueba');

    expect(
      screen.queryByRole('navigation', { name: 'Paginación de productores' }),
    ).not.toBeInTheDocument();
  });

  it('goes back to page 1 instead of showing an error when the page no longer exists', async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    server.use(
      http.get(PRODUCERS, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        return url.searchParams.get('page') === '99'
          ? apiError(404, 'not_found', 'Página inválida.')
          : HttpResponse.json(buildPage([listItem()]));
      }),
    );
    renderWithProviders(<ProducerListScreen />, {
      searchParams: '?pagina=99',
      onUrlUpdate,
    });

    expect(await screen.findByText('Ana Prueba')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(requests.map((url) => url.searchParams.get('page'))).toEqual([
      '99',
      '1',
    ]);
    expect(lastUrlUpdate(onUrlUpdate).has('pagina')).toBe(false);
  });

  it('shows the error for a 404 on page 1, where there is no earlier page to go back to', async () => {
    server.use(http.get(PRODUCERS, () => apiError(404, 'not_found')));
    renderWithProviders(<ProducerListScreen />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar los productores.',
    );
  });

  describe('when the session expires while using the list', () => {
    it.each([
      ['authentication_failed', sessionExpired],
      ['not_authenticated', notAuthenticated],
    ])(
      'sends the person to login from the guard on a 401 (%s), with no redirect logic of its own',
      async (_code, unauthorized) => {
        let sessionChecks = 0;
        server.use(
          http.get(ME, () =>
            sessionChecks++ === 0
              ? HttpResponse.json(buildSession())
              : unauthorized(),
          ),
          http.post(REFRESH, unauthorized),
          http.get(PRODUCERS, unauthorized),
        );

        renderWithProviders(
          <SessionGuard>
            <ProducerListScreen />
          </SessionGuard>,
          { queryClient: createQueryClient() },
        );

        await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
        expect(screen.queryByText('Ana Prueba')).not.toBeInTheDocument();
        expect(
          screen.queryByText('No fue posible cargar los productores.'),
        ).not.toBeInTheDocument();
      },
    );
  });
});

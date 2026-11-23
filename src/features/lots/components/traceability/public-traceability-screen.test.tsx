import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ASSOCIATION_NAME } from '@/config/association';
import { apiError, buildPublicTraceability } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { PublicTraceabilityScreen } from './public-traceability-screen';

const TOKEN = 'Xq3k9Lm2Pz7tRw1a';
const URL = apiUrl(`/api/public/lots/${TOKEN}`);

let requested: string[];

const serve = (response: () => Response) => server.use(http.get(URL, response));

beforeEach(() => {
  requested = [];
  resetLocation();
  server.events.on('request:start', ({ request }) => {
    requested.push(new globalThis.URL(request.url).pathname);
  });
});

afterEach(() => {
  server.events.removeAllListeners();
});

const renderScreen = (token = TOKEN) =>
  renderWithProviders(<PublicTraceabilityScreen token={token} />);

describe('PublicTraceabilityScreen', () => {
  it('presents the lot by its origin, its figures, its journey in order and its quality', async () => {
    serve(() => HttpResponse.json(buildPublicTraceability()));
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'CCN-51 de Arboledas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Cacao CCN-51 de la finca La Esperanza, Arboledas (Norte de Santander). Cosechado el 14 de marzo de 2026 y en bodega desde el 3 de abril de 2026.',
      ),
    ).toBeInTheDocument();

    const figures = screen.getByRole('region', { name: 'Cifras del lote' });
    expect(figures).toHaveTextContent('Fermentación');
    expect(figures).toHaveTextContent('6 días');
    expect(figures).toHaveTextContent('Secado');
    expect(figures).toHaveTextContent('8 días');
    expect(figures).toHaveTextContent('Bien fermentados');
    expect(figures).toHaveTextContent('82,0 %');
    expect(figures).toHaveTextContent('Primera calidad (G1)');
    expect(figures).toHaveTextContent('72,2 %');

    const steps = within(
      screen.getByRole('region', { name: 'Recorrido del lote' }),
    ).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual([
      'Cosecha14 de marzo de 2026',
      'Fermentación6 días, del 15 al 21 de marzo',
      'Secado8 días, del 21 al 29 de marzo',
      'Evaluación de calidad1 de abril de 2026',
      'Clasificación2 de abril de 2026',
      'Ingreso a bodega3 de abril de 2026',
    ]);

    const quality = screen.getByRole('region', { name: 'Calidad' });
    expect(
      within(quality).getByRole('img', {
        name: 'Reparto del cacao seco: G1 72,2 %, G2 17,8 %, Descarte 10,0 %',
      }),
    ).toBeInTheDocument();
    expect(quality).toHaveTextContent('G1');
    expect(quality).toHaveTextContent('Grano grande, primera calidad');
    expect(quality).toHaveTextContent('17,8 %');
    expect(quality).toHaveTextContent('Descarte');
    expect(quality).toHaveTextContent('10,0 %');
  });

  it('names the association at the foot', async () => {
    serve(() => HttpResponse.json(buildPublicTraceability()));
    renderScreen();
    expect(await screen.findByText(ASSOCIATION_NAME)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Información registrada por el productor en Ruta del Cacao.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a lot that is only classified without the warehouse step and without a discard', async () => {
    serve(() =>
      HttpResponse.json(
        buildPublicTraceability({
          stages: buildPublicTraceability().stages.slice(0, 5),
          quality: {
            well_fermented_pct: '90.0',
            g1_pct: '100.0',
            g2_pct: '0.0',
            discard_pct: null,
          },
        }),
      ),
    );
    renderScreen();

    await screen.findByRole('heading', { name: 'CCN-51 de Arboledas' });
    expect(screen.queryByText('Ingreso a bodega')).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Calidad' }),
    ).not.toHaveTextContent('Descarte');
    expect(
      screen.getByText(
        /Cosechado el 14 de marzo de 2026 y clasificado el 2 de abril de 2026\./,
      ),
    ).toBeInTheDocument();
  });

  it('never asks for the session nor sends the person to sign in', async () => {
    serve(() => HttpResponse.json(buildPublicTraceability()));
    renderScreen();
    await screen.findByRole('heading', { name: 'CCN-51 de Arboledas' });

    expect(requested).toEqual([`/api/public/lots/${TOKEN}`]);
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not take a 401 for a reason to leave: it is a failed reading', async () => {
    serve(() => apiError(401, 'authentication_failed', 'No autenticado.'));
    renderScreen();

    expect(
      await screen.findByText(/No pudimos cargar la información/),
    ).toBeInTheDocument();
    expect(requested).toEqual([`/api/public/lots/${TOKEN}`]);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('says no information was found for a code that does not exist', async () => {
    server.use(
      http.get(apiUrl('/api/public/lots/inventado'), () =>
        apiError(404, 'not_found', 'No encontrado.'),
      ),
    );
    renderScreen('inventado');
    expect(
      await screen.findByText('No se encontró información para este código.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'CCN-51 de Arboledas' }),
    ).not.toBeInTheDocument();
  });

  it('says too many queries on a 429 and does not offer to retry at once', async () => {
    serve(() => apiError(429, 'throttled', 'Demasiadas solicitudes.'));
    renderScreen();
    expect(
      await screen.findByText(
        'Hiciste muchas consultas seguidas. Intenta de nuevo en un minuto.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument();
  });

  it('offers to retry after an error and shows the lot when it works', async () => {
    let calls = 0;
    serve(() => {
      calls += 1;
      return calls === 1
        ? apiError(500, 'server_error', 'Error del servidor.')
        : HttpResponse.json(buildPublicTraceability());
    });
    renderScreen();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Reintentar' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'CCN-51 de Arboledas' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(calls).toBe(2));
  });
});

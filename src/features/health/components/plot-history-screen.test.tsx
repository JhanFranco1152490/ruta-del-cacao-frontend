import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildAgriculturalActivity,
  buildSession,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { PlotHistoryScreen } from './plot-history-screen';

type Schemas = components['schemas'];

const monitoring = buildAgriculturalActivity({
  id: 'm1',
  activity_type: 'phytosanitary_monitoring',
  status: 'done',
  done_date: '2026-10-19',
  completed_by: { id: 'u1', full_name: 'Carlos Rincón' },
  monitoring: {
    sampling_unit: 'trees',
    evaluated_units: 50,
    sampling_method: null,
    notes: null,
    no_presence: false,
    detections: [
      {
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
        controls: [],
        control_request: null,
      },
    ],
    detections_without_control: 1,
    evidence_count: 3,
  },
});

const summary: Schemas['PestSummary'][] = [
  {
    pest_disease: {
      id: 'monilia',
      name: 'Monilia',
      kind: 'disease',
      is_active: true,
    },
    other_description: null,
    sampling_unit: 'trees',
    latest_incidence: '24.00',
    previous_incidence: '31.00',
    latest_date: '2026-10-19',
  },
];

let requests: URLSearchParams[];

beforeEach(() => {
  requests = [];
  server.use(
    http.get(apiUrl('/api/plots/pl1'), () =>
      HttpResponse.json({
        id: 'pl1',
        code: 'P-03',
        farm: { id: 'f1', name: 'La Esperanza' },
      }),
    ),
    http.get(apiUrl('/api/plots/pl1/phytosanitary-history'), ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      // Con un filtro de plaga que no aparece, no hay registros.
      const empty = params.get('pest_disease') === 'trips';
      return HttpResponse.json({
        results: empty ? [] : [monitoring],
        summary: empty ? [] : summary,
      });
    }),
  );
});

function renderScreen(searchParams = '?id=pl1') {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: `history-screen-${crypto.randomUUID()}`,
      permissions: [PERMISSIONS.ACTIVITIES_VIEW],
    }),
  );
  renderWithProviders(<PlotHistoryScreen plotId="pl1" />, {
    queryClient,
    searchParams,
  });
}

describe('PlotHistoryScreen', () => {
  it('shows the plot, the summary by pest and each monitoring with its result', async () => {
    renderScreen();

    expect(
      await screen.findByText('Parcela P-03 · La Esperanza'),
    ).toBeVisible();
    const summaryList = await screen.findByRole('region', {
      name: 'Resumen por plaga',
    });
    expect(summaryList).toHaveTextContent(
      'Monilia: 24 % de árboles · antes 31 %',
    );
    // El primero de la lista es el monitoreo; los que siguen son de sus detecciones.
    const [item] = within(
      screen.getByRole('list', { name: 'Monitoreos' }),
    ).getAllByRole('listitem');
    expect(item).toHaveTextContent('lunes 19 de octubre de 2026');
    expect(item).toHaveTextContent('Registró Carlos Rincón · 3 fotos');
    expect(item).toHaveTextContent('Monilia · 12 árboles · 24 %');
    expect(item).toHaveTextContent('Sin control');
  });

  it('asks for the filters of the URL and offers the pests seen in the plot', async () => {
    renderScreen('?id=pl1&desde=2026-01-01&plaga=monilia');

    await screen.findByRole('list', { name: 'Monitoreos' });
    expect(
      requests.some(
        (params) =>
          params.toString() === 'from=2026-01-01&pest_disease=monilia',
      ),
    ).toBe(true);
    const pest = screen.getByLabelText('Plaga o enfermedad');
    expect(pest).toHaveValue('monilia');
    expect(
      within(pest)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Todas', 'Monilia']);
  });

  it('says that nothing matches the filters and clears them', async () => {
    renderScreen('?id=pl1&plaga=trips');

    expect(
      await screen.findByText('No hay registros con estos filtros'),
    ).toBeVisible();
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Limpiar filtros' })[0],
    );

    expect(
      await screen.findByRole('list', { name: 'Monitoreos' }),
    ).toBeInTheDocument();
  });

  it('says that the plot has no records yet', async () => {
    server.use(
      http.get(apiUrl('/api/plots/pl1/phytosanitary-history'), () =>
        HttpResponse.json({ results: [], summary: [] }),
      ),
    );
    renderScreen();

    expect(
      await screen.findByText(
        'No hay registros fitosanitarios para esta parcela',
      ),
    ).toBeVisible();
  });

  it('does not ask for a period whose start comes after its end', async () => {
    renderScreen('?id=pl1&desde=2026-10-20&hasta=2026-10-19');

    expect(
      await screen.findByText(
        'La fecha inicial no puede ser posterior a la final',
      ),
    ).toBeVisible();
    await waitFor(() => expect(requests.length).toBeGreaterThan(0));
    // Solo se pidió el historial sin filtros, para ofrecer las plagas.
    expect(requests.every((params) => params.toString() === '')).toBe(true);
  });

  it('says that the plot no longer exists', async () => {
    server.use(
      http.get(apiUrl('/api/plots/pl1'), () => apiError(404, 'not_found')),
    );
    renderScreen();

    expect(await screen.findByText('Esta parcela ya no existe')).toBeVisible();
  });
});

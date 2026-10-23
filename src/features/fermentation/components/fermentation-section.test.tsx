import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildFermentation,
  buildFermentationTurn,
  buildSession,
} from '@/test/factories';
import { apiUrl, csrfHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { enqueueTurn } from '../turn-queue';
import { FermentationSection, type SectionLot } from './fermentation-section';

// El 18 de octubre a las 09:00. La fermentación empezó el 15 a las 07:00.
const NOW = new Date('2026-10-18T09:00:00-05:00');

const LOT: SectionLot = {
  id: 'l1',
  code: '000123-F02-P05-261014-1',
  status: 'fermenting',
  greenWeightKg: '500.0',
  farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
};

const MANAGE = [
  PERMISSIONS.LOTS_VIEW,
  PERMISSIONS.FERMENTATION_LOG_TURNS,
  PERMISSIONS.FERMENTATION_MANAGE,
];

const withTurns = buildFermentation({
  over_capacity: true,
  turns: [
    buildFermentationTurn({
      id: 't1',
      turned_at: '2026-10-17T07:30:00-05:00',
      hours_since_start: '48.5',
      temperature_c: '45.0',
      ph: '4.90',
      notes: 'Masa caliente',
      version: 2,
    }),
  ],
});

let userId: string;

const serve = (fermentation = withTurns) =>
  server.use(
    http.get(apiUrl('/api/fermentation/l1'), () =>
      HttpResponse.json(fermentation),
    ),
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  userId = `section-${crypto.randomUUID()}`;
  resetLocation();
  serve();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderSection(lot: SectionLot = LOT, permissions: string[] = MANAGE) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  renderWithProviders(
    <FermentationSection
      facilitiesHref="/infraestructura?finca=f1"
      lot={lot}
    />,
    { queryClient },
  );
}

const section = () => screen.findByRole('region', { name: 'Fermentación' });
const turnsTable = () => screen.getByRole('table', { name: 'Volteos' });

describe('FermentationSection', () => {
  it('offers to start the fermentation of a generated lot', async () => {
    server.use(
      http.get(apiUrl('/api/fermentation/start-options'), () =>
        HttpResponse.json({
          facilities: [],
          responsibles: [],
          green_weight_kg: '500.0',
          earliest_start_at: '2026-10-14T00:00:00-05:00',
        }),
      ),
    );
    renderSection({ ...LOT, status: 'generated' });

    await userEvent.click(
      within(await section()).getByRole('button', {
        name: 'Iniciar fermentación',
      }),
    );
    expect(
      await screen.findByRole('heading', {
        name: `Iniciar fermentación · ${LOT.code}`,
      }),
    ).toBeInTheDocument();
  });

  it('shows nothing for a generated lot to whom cannot start it', () => {
    renderSection({ ...LOT, status: 'generated' }, [
      PERMISSIONS.LOTS_VIEW,
      PERMISSIONS.FERMENTATION_LOG_TURNS,
    ]);

    expect(
      screen.queryByRole('region', { name: 'Fermentación' }),
    ).not.toBeInTheDocument();
  });

  it('shows the box, the start, the responsible, the time and the next turn', async () => {
    renderSection();

    const card = await section();
    await within(card).findByText('C-01 · Superó la capacidad');
    expect(card).toHaveTextContent('15 oct. 07:00');
    expect(card).toHaveTextContent('Cuenta de prueba');
    expect(card).toHaveTextContent('74 h de fermentación');
    expect(card).toHaveTextContent('Volteo pendiente desde las 07:30');
  });

  it('lists the turns, with what each one measured and who recorded it', async () => {
    renderSection();

    await section();
    const rows = within(await screen.findByRole('table', { name: 'Volteos' }))
      .getAllByRole('row')
      .slice(1);
    expect(rows[0]).toHaveTextContent('Volteo 1');
    expect(rows[0]).toHaveTextContent('17 oct. 07:30');
    expect(rows[0]).toHaveTextContent('48,5 h');
    expect(rows[0]).toHaveTextContent('45 °C');
    expect(rows[0]).toHaveTextContent('4,9');
    expect(rows[0]).toHaveTextContent('Masa caliente');
    expect(rows[0]).toHaveTextContent('Cuenta de prueba');
    expect(
      within(rows[0]).getByRole('link', { name: 'Corregir el volteo 1' }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/fermentacion\/volteo\?lote=l1&id=t1/),
    );
  });

  it('shows a turn still on the phone as waiting to be sent, and waits for it to finish', async () => {
    await enqueueTurn(userId, {
      lotId: 'l1',
      request: {
        id: 'q1',
        turned_at: '2026-10-18T08:00:00-05:00',
        temperature_c: '46.0',
        ph: '4.80',
        notes: '',
        captured_at: null,
      },
      label: '',
    });
    renderSection();

    await section();
    await waitFor(() =>
      expect(turnsTable()).toHaveTextContent('Pendiente de enviar'),
    );
    expect(
      screen.getByRole('button', { name: 'Finalizar fermentación' }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        'Hay volteos de este lote sin enviar. Espera a que se envíen.',
      ),
    ).toBeInTheDocument();
  });

  it('offers to record a turn and to finish, but no longer to correct the start', async () => {
    renderSection();

    const card = await section();
    await within(card).findByRole('link', { name: /Registrar volteo/ });
    expect(
      within(card).queryByRole('button', { name: 'Corregir inicio' }),
    ).not.toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Finalizar fermentación' }),
    ).toBeEnabled();
  });

  it('without turns, offers to correct the start and does not let it finish', async () => {
    serve(buildFermentation());
    renderSection();

    const card = await section();
    expect(
      await within(card).findByRole('button', { name: 'Corregir inicio' }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Finalizar fermentación' }),
    ).toBeDisabled();
    expect(
      within(card).getByText('Registre al menos un volteo para finalizar'),
    ).toBeInTheDocument();
    expect(card).toHaveTextContent('Sin volteos todavía');
  });

  it('lets who only records turns do just that', async () => {
    renderSection(LOT, [
      PERMISSIONS.LOTS_VIEW,
      PERMISSIONS.FERMENTATION_LOG_TURNS,
    ]);

    const card = await section();
    await within(card).findByRole('link', { name: /Registrar volteo/ });
    expect(
      within(card).queryByRole('button', { name: 'Finalizar fermentación' }),
    ).not.toBeInTheDocument();
  });

  it('shows the fermentation from the copy without a connection, with what writes disabled', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'fermentation',
      value: [withTurns],
      fetchedAt: 1_760_000_000_000,
    });
    server.use(
      http.get(apiUrl('/api/fermentation/l1'), () => HttpResponse.error()),
    );
    renderSection();

    const card = await section();
    await within(card).findByText('C-01 · Superó la capacidad');
    expect(
      within(card).getByRole('link', { name: /Registrar volteo/ }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Finalizar fermentación' }),
    ).toBeDisabled();
    expect(
      within(card).getByText('Finalizar la fermentación necesita conexión.'),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Eliminar el volteo 1' }),
    ).toBeDisabled();
  });

  it('deletes a turn after confirming, with the version it read', async () => {
    const deletes: string[] = [];
    server.use(
      csrfHandler,
      http.delete(apiUrl('/api/fermentation/l1/turns/t1'), ({ request }) => {
        deletes.push(new URL(request.url).search);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderSection();

    await section();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Eliminar el volteo 1' }),
    );
    expect(
      await screen.findByText(
        '¿Eliminar el volteo 1 (17 oct. 07:30)? Esta acción no se puede deshacer.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('La fermentación no se podrá finalizar sin volteos.'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Eliminar volteo' }),
    );

    await waitFor(() => expect(deletes).toEqual(['?expected_version=2']));
    expect(await screen.findByText('Volteo eliminado')).toBeInTheDocument();
  });

  it('shows a finished fermentation as read only, with its end, duration and notes', async () => {
    serve(
      buildFermentation({
        lot: { ...withTurns.lot, status: 'fermented' },
        turns: withTurns.turns,
        next_turn_due_at: null,
        result: {
          ended_at: '2026-10-20T09:00:00-05:00',
          duration_hours: '122.0',
          turn_count: 1,
          notes: 'Grano con buen color al corte.',
        },
      }),
    );
    renderSection({ ...LOT, status: 'fermented' });

    const card = await section();
    await within(card).findByText('5 días y 2 h');
    expect(card).toHaveTextContent('20 oct. 09:00');
    expect(card).toHaveTextContent('Grano con buen color al corte.');
    expect(card).not.toHaveTextContent('Volteo pendiente');
    expect(card).not.toHaveTextContent('Próximo volteo');
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
  });
});

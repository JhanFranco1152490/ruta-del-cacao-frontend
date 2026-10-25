import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import { buildDrying, buildDryingLog, buildSession } from '@/test/factories';
import { apiUrl, csrfHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { enqueueLog } from '../log-queue';
import { DryingSection, type SectionLot } from './drying-section';

// El 24 de octubre a las 10:00. El secado empezó el 22 a las 14:00 (el 24 es el día 3).
const NOW = new Date('2026-10-24T10:00:00-05:00');

const LOT: SectionLot = {
  id: 'l1',
  code: '000123-F02-P05-261014-1',
  status: 'drying',
  greenWeightKg: '120.5',
  farm: { id: 'f1', code: 'F02', name: 'La Esperanza' },
};

const MANAGE = [
  PERMISSIONS.LOTS_VIEW,
  PERMISSIONS.DRYING_LOG,
  PERMISSIONS.DRYING_MANAGE,
];

const withLogs = buildDrying({
  entry_moisture_out_of_range: true,
  logs: [
    buildDryingLog({
      id: 'g1',
      day_number: 2,
      measured_at: '2026-10-23T16:00:00-05:00',
      moisture_pct: '12.4',
      sun_hours: '6.0',
      shade_hours: '2.0',
      turn_count: 2,
      turn_frequency_hours: '3.0',
      weather: 'partly_cloudy',
      notes: 'Grano parejo',
      version: 2,
    }),
  ],
});

let userId: string;

const serve = (drying = withLogs) =>
  server.use(
    http.get(apiUrl('/api/drying/l1'), () => HttpResponse.json(drying)),
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  userId = `drying-section-${crypto.randomUUID()}`;
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
    <DryingSection facilitiesHref="/infraestructura?finca=f1" lot={lot} />,
    { queryClient },
  );
}

const section = () => screen.findByRole('region', { name: 'Secado' });
const logsTable = () => screen.getByRole('table', { name: 'Bitácoras' });

describe('DryingSection', () => {
  it('offers to start the drying of a fermented lot', async () => {
    server.use(
      http.get(apiUrl('/api/drying/start-options'), () =>
        HttpResponse.json({
          facilities: [],
          responsibles: [],
          entry_moisture_range: { min: '55.0', max: '60.0' },
          earliest_start_at: '2026-10-14T00:00:00-05:00',
        }),
      ),
    );
    renderSection({ ...LOT, status: 'fermented' });

    await userEvent.click(
      within(await section()).getByRole('button', { name: 'Iniciar secado' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: `Iniciar secado · ${LOT.code}`,
      }),
    ).toBeInTheDocument();
  });

  it('shows nothing before the drying, nor for a fermented lot to whom cannot start it', () => {
    renderSection({ ...LOT, status: 'fermenting' });
    renderSection({ ...LOT, status: 'fermented' }, [
      PERMISSIONS.LOTS_VIEW,
      PERMISSIONS.DRYING_LOG,
    ]);

    expect(
      screen.queryByRole('region', { name: 'Secado' }),
    ).not.toBeInTheDocument();
  });

  it('shows the dryer, the start, the humidity, the responsible and the day', async () => {
    renderSection();

    const card = await section();
    await within(card).findByText('M-01');
    expect(card).toHaveTextContent('22 oct. 14:00');
    expect(card).toHaveTextContent('57,0 % · Fuera del rango esperado');
    expect(card).toHaveTextContent('Cuenta de prueba');
    expect(card).toHaveTextContent('Día 3 · 1 día y 20 h');
    expect(card).toHaveTextContent('6,5–7,5 %');
    expect(card).toHaveTextContent('Entre el día 5 y el 7');
    expect(card).toHaveTextContent('Falta registrarla');
  });

  it('lists every day, with what each log measured and who recorded it, and the empty days dimmed', async () => {
    renderSection();

    await section();
    const rows = within(await screen.findByRole('table', { name: 'Bitácoras' }))
      .getAllByRole('row')
      .slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Día 1');
    expect(rows[0]).toHaveTextContent('Sin bitácora');
    expect(rows[1]).toHaveTextContent('Día 2');
    expect(rows[1]).toHaveTextContent('23 oct');
    expect(rows[1]).toHaveTextContent('12,4 %');
    expect(rows[1]).toHaveTextContent('6,0 h al sol');
    expect(rows[1]).toHaveTextContent('2,0 h a la sombra');
    expect(rows[1]).toHaveTextContent('2 volteos');
    expect(rows[1]).toHaveTextContent('cada 3,0 h');
    expect(rows[1]).toHaveTextContent('Parcialmente nublado');
    expect(rows[1]).toHaveTextContent('Grano parejo');
    expect(rows[1]).toHaveTextContent('Registró Cuenta de prueba');
    expect(rows[2]).toHaveTextContent('Sin bitácora');
    expect(
      within(rows[1]).getByRole('link', {
        name: 'Corregir la bitácora del día 2',
      }),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/secado\/bitacora\?lote=l1&id=g1/),
    );
  });

  it('shows a log still on the phone in its day as waiting to be sent, and waits for it to finish', async () => {
    await enqueueLog(userId, {
      lotId: 'l1',
      request: {
        id: 'q1',
        measured_at: '2026-10-24T09:00:00-05:00',
        moisture_pct: '10.0',
        sun_hours: '2.0',
        shade_hours: null,
        turn_count: 0,
        turn_frequency_hours: null,
        weather: 'sunny',
        notes: '',
        captured_at: null,
      },
      label: '',
    });
    renderSection();

    await section();
    await waitFor(() =>
      expect(logsTable()).toHaveTextContent('Pendiente de enviar'),
    );
    expect(
      screen.getByRole('button', { name: 'Finalizar secado' }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        'Hay bitácoras de este lote sin enviar. Espera a que se envíen.',
      ),
    ).toBeInTheDocument();
  });

  it('offers to record a log and to finish, but no longer to correct the start', async () => {
    renderSection();

    const card = await section();
    await within(card).findByRole('link', { name: /Registrar bitácora/ });
    expect(
      within(card).queryByRole('button', { name: 'Corregir inicio' }),
    ).not.toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Finalizar secado' }),
    ).toBeEnabled();
  });

  it('without logs, offers to correct the start and does not let it finish', async () => {
    serve(buildDrying());
    renderSection();

    const card = await section();
    expect(
      await within(card).findByRole('button', { name: 'Corregir inicio' }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Finalizar secado' }),
    ).toBeDisabled();
    expect(
      within(card).getByText('Registra al menos una bitácora para finalizar.'),
    ).toBeInTheDocument();
  });

  it('lets who only records logs do just that', async () => {
    renderSection(LOT, [PERMISSIONS.LOTS_VIEW, PERMISSIONS.DRYING_LOG]);

    const card = await section();
    await within(card).findByRole('link', { name: /Registrar bitácora/ });
    expect(
      within(card).queryByRole('button', { name: 'Finalizar secado' }),
    ).not.toBeInTheDocument();
  });

  it('shows the drying from the copy without a connection, with what writes disabled', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'drying',
      value: [withLogs],
      fetchedAt: 1_760_000_000_000,
    });
    server.use(http.get(apiUrl('/api/drying/l1'), () => HttpResponse.error()));
    renderSection();

    const card = await section();
    await within(card).findByText('M-01');
    expect(
      within(card).getByRole('link', { name: /Registrar bitácora/ }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Finalizar secado' }),
    ).toBeDisabled();
    expect(
      within(card).getByText('Finalizar el secado necesita conexión.'),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('button', {
        name: 'Eliminar la bitácora del día 2',
      }),
    ).toBeDisabled();
  });

  it('deletes a log after confirming, with the version it read', async () => {
    const deletes: string[] = [];
    server.use(
      csrfHandler,
      http.delete(apiUrl('/api/drying/l1/logs/g1'), ({ request }) => {
        deletes.push(new URL(request.url).search);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderSection();

    await section();
    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Eliminar la bitácora del día 2',
      }),
    );
    expect(
      await screen.findByText(
        '¿Eliminar la bitácora del día 2 (23 oct)? Esta acción no se puede deshacer.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('El secado no se podrá finalizar sin bitácoras.'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Eliminar bitácora' }),
    );

    await waitFor(() => expect(deletes).toEqual(['?expected_version=2']));
    expect(await screen.findByText('Bitácora eliminada')).toBeInTheDocument();
  });

  it('shows a finished drying as read only, with its duration, sun hours and yield', async () => {
    serve(
      buildDrying({
        lot: { ...withLogs.lot, status: 'dried' },
        logs: withLogs.logs,
        result: {
          ended_at: '2026-10-27T10:00:00-05:00',
          duration_hours: '116.0',
          days: 5,
          total_sun_hours: '30.0',
          final_moisture_pct: '7.0',
          dry_weight_kg: '60.0',
          yield_pct: '49.8',
        },
      }),
    );
    renderSection({ ...LOT, status: 'dried' });

    const card = await section();
    await within(card).findByText('49,8 %');
    expect(card).toHaveTextContent('27 oct. 10:00');
    expect(card).toHaveTextContent('4 días y 20 h · 5 días');
    expect(card).toHaveTextContent('30,0 h');
    expect(card).toHaveTextContent('7,0 %');
    expect(card).toHaveTextContent('60,0 kg');
    expect(card).not.toHaveTextContent('Falta registrarla');
    expect(within(card).getAllByRole('row')).toHaveLength(6);
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
  });
});

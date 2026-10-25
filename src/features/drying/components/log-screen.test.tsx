import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildDrying,
  buildDryingLog,
  buildSession,
} from '@/test/factories';
import { apiUrl, csrfHandler, dryingsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { FREQUENCY_REQUIRED_MESSAGE } from '../log-form';
import {
  enqueueLog,
  getQueuedLog,
  listQueuedLogs,
  logQueueId,
  type LogPayload,
} from '../log-queue';
import { LogScreen } from './log-screen';

// 24 de octubre a las 10:00 en Bogotá. El secado empezó el 22 a las 14:00 (el 24 es el día 3).
const NOW = new Date('2026-10-24T10:00:00-05:00');
const CODE = '000123-F02-P05-261014-1';

const withLog = buildDrying({
  logs: [
    buildDryingLog({
      id: 'dl1',
      measured_at: '2026-10-23T16:00:00-05:00',
      moisture_pct: '14.2',
      sun_hours: '6.0',
      version: 3,
    }),
  ],
});

const lotHref = (id: string) => `/lotes/detalle?id=${id}`;

let userId: string;

beforeEach(async () => {
  userId = `log-screen-${crypto.randomUUID()}`;
  vi.clearAllMocks();
  resetLocation();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  // La sesión se confirmó hoy: dentro de la ventana sin conexión.
  await recordLogin(userId);
  server.use(dryingsHandler([buildDrying()]));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderScreen(props: Partial<Parameters<typeof LogScreen>[0]> = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [PERMISSIONS.DRYING_LOG, PERMISSIONS.LOTS_VIEW],
    }),
  );
  renderWithProviders(<LogScreen lotHref={lotHref} lotId="l1" {...props} />, {
    queryClient,
  });
}

const field = (name: string) => screen.getByLabelText(name);
const setTime = (value: string) =>
  fireEvent.change(field('Fecha y hora de la medición'), {
    target: { value },
  });
const save = async () =>
  userEvent.click(await screen.findByRole('button', { name: /^Guardar/ }));

async function fillDay() {
  await userEvent.type(await screen.findByLabelText('Humedad (%)'), '12,4');
  await userEvent.type(field('Horas al sol'), '6');
  await userEvent.type(field('Volteos del día'), '0');
  await userEvent.click(screen.getByLabelText('Soleado'));
}

describe('LogScreen', () => {
  it('names the day it will be and the dryer, and counts the hours since the start', async () => {
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'Bitácora del día 3' }),
    ).toBeInTheDocument();
    expect(screen.getByText(`${CODE} · M-01`)).toBeInTheDocument();
    expect(field('Fecha y hora de la medición')).toHaveValue(
      '2026-10-24T10:00',
    );
    expect(
      screen.getByText('Día 3 de secado · 44 h desde el inicio'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Meta: 6,5–7,5 %')).toBeInTheDocument();
  });

  it('saves the log on the device, goes back and says which day it was', async () => {
    renderScreen();

    await fillDay();
    await userEvent.type(field('Observaciones (opcional)'), 'Grano parejo');
    await save();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/secado'));
    const [queued] = await listQueuedLogs(userId);
    expect(queued).toMatchObject({
      lotId: 'l1',
      label: `${CODE} · bitácora del día 3 · 24 oct`,
      request: {
        moisture_pct: '12.4',
        sun_hours: '6',
        shade_hours: null,
        turn_count: 0,
        turn_frequency_hours: null,
        weather: 'sunny',
        notes: 'Grano parejo',
        captured_at: NOW.toISOString(),
      },
    });
    expect(new Date(queued.request.measured_at).toISOString()).toBe(
      '2026-10-24T15:00:00.000Z',
    );
    expect(
      await screen.findByText('Bitácora del día 3 registrada'),
    ).toBeInTheDocument();
  });

  it('asks how often it was turned only when it was turned, and sends it then', async () => {
    renderScreen();

    await screen.findByRole('heading', { name: 'Bitácora del día 3' });
    expect(
      screen.queryByLabelText('Cada cuántas horas (h)'),
    ).not.toBeInTheDocument();
    await userEvent.type(field('Humedad (%)'), '12,4');
    await userEvent.type(field('Horas al sol'), '6');
    await userEvent.type(field('Volteos del día'), '2');
    await userEvent.click(screen.getByLabelText('Nublado'));
    await save();

    expect(
      await screen.findByText(FREQUENCY_REQUIRED_MESSAGE),
    ).toBeInTheDocument();
    await userEvent.type(field('Cada cuántas horas (h)'), '3');
    await save();

    await waitFor(async () =>
      expect((await listQueuedLogs(userId))[0]?.request).toMatchObject({
        turn_count: 2,
        turn_frequency_hours: '3',
        weather: 'cloudy',
      }),
    );
  });

  it('recalls the previous log and counts the day by the date chosen', async () => {
    server.use(dryingsHandler([withLog]));
    renderScreen();

    expect(
      await screen.findByText('Bitácora anterior: día 2 · 23 oct · 14,2 %'),
    ).toBeInTheDocument();
    setTime('2026-10-23T09:00');
    expect(
      await screen.findByRole('heading', { name: 'Bitácora del día 2' }),
    ).toBeInTheDocument();
  });

  it('marks what is missing and what is out of range, and saves nothing', async () => {
    renderScreen();

    await save();
    expect(
      (await screen.findAllByText('Campo obligatorio')).length,
    ).toBeGreaterThanOrEqual(3);

    await userEvent.type(field('Humedad (%)'), '120');
    await userEvent.type(field('Horas al sol'), '30');
    await save();

    expect(
      await screen.findByText('Debe estar entre 0 % y 100 %.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Debe estar entre 0 y 24 horas.'),
    ).toBeInTheDocument();
    expect(await listQueuedLogs(userId)).toEqual([]);
  });

  it('does not accept more hours than the day had', async () => {
    renderScreen();

    await fillDay();
    await userEvent.clear(field('Horas al sol'));
    await userEvent.type(field('Horas al sol'), '8');
    await userEvent.type(field('Horas a la sombra'), '4');
    await save();

    // El error ocupa el lugar de la pista del campo.
    expect(
      await screen.findByText('Ese día el secado tuvo 10,0 horas.'),
    ).toBeInTheDocument();
    expect(await listQueuedLogs(userId)).toEqual([]);
  });

  it('does not save a second log on the same date, and points to the lot', async () => {
    server.use(dryingsHandler([withLog]));
    renderScreen();

    await screen.findByRole('heading', { name: 'Bitácora del día 3' });
    setTime('2026-10-23T18:00');
    await fillDay();
    await save();

    expect(
      await screen.findByText(
        'Ya existe un registro para esta fecha (23 oct.)',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver la bitácora' }),
    ).toHaveAttribute('href', '/lotes/detalle?id=l1');
    expect(await listQueuedLogs(userId)).toEqual([]);
  });

  it('saves on the phone without a connection', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(
      await screen.findByRole('button', { name: 'Guardar en el teléfono' }),
    ).toBeInTheDocument();
  });

  it('says when the lot is not in drying', async () => {
    server.use(
      http.get(apiUrl('/api/drying/l9'), () => apiError(404, 'not_found')),
    );
    renderScreen({ lotId: 'l9' });

    expect(
      await screen.findByRole('heading', {
        name: 'Este lote no está en secado.',
      }),
    ).toBeInTheDocument();
  });

  it('says when the drying already finished', async () => {
    server.use(
      dryingsHandler([]),
      http.get(apiUrl('/api/drying/l1'), () =>
        HttpResponse.json(
          buildDrying({
            result: {
              ended_at: '2026-10-27T10:00:00-05:00',
              duration_hours: '116.0',
              days: 5,
              total_sun_hours: '30.0',
              final_moisture_pct: '7.0',
              dry_weight_kg: '60.0',
              yield_pct: '32.3',
            },
          }),
        ),
      ),
    );
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'El secado de este lote ya se finalizó.',
      }),
    ).toBeInTheDocument();
  });

  describe('correcting a log the server rejected', () => {
    const rejected: LogPayload = {
      lotId: 'l1',
      request: {
        id: 'q9',
        measured_at: '2026-10-24T08:00:00-05:00',
        moisture_pct: '12.4',
        sun_hours: '4.0',
        shade_hours: null,
        turn_count: 0,
        turn_frequency_hours: null,
        weather: 'sunny',
        notes: '',
        captured_at: null,
      },
      label: `${CODE} · bitácora del día 3 · 24 oct`,
    };

    beforeEach(async () => {
      await enqueueLog(userId, rejected);
      await getOfflineDb(userId).queue.update(logQueueId('q9'), {
        status: 'error',
        errorCode: 'validation_error',
        errorMessage: 'Las horas no son válidas.',
      });
    });

    it('opens with what was captured and sends it again', async () => {
      renderScreen({ pendingId: 'q9' });

      expect(
        await screen.findByRole('heading', {
          name: 'Corregir bitácora del día 3',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('No se pudo sincronizar: Las horas no son válidas.'),
      ).toBeInTheDocument();
      expect(field('Fecha y hora de la medición')).toHaveValue(
        '2026-10-24T08:00',
      );
      expect(field('Humedad (%)')).toHaveValue('12,4');

      await userEvent.clear(field('Horas al sol'));
      await userEvent.type(field('Horas al sol'), '3');
      await save();

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith('/secado'),
      );
      expect(await getQueuedLog(userId, 'q9')).toMatchObject({
        status: 'pending',
        request: { sun_hours: '3' },
      });
      expect(await screen.findByText('Bitácora corregida')).toBeInTheDocument();
    });

    it('says when it is no longer on the device', async () => {
      renderScreen({ pendingId: 'nope' });

      expect(
        await screen.findByRole('heading', {
          name: 'Esta bitácora ya no está pendiente.',
        }),
      ).toBeInTheDocument();
    });
  });

  describe('correcting a log of the server', () => {
    beforeEach(() => {
      server.use(dryingsHandler([withLog]));
    });

    it('sends only what changed, with the version it read', async () => {
      const bodies: unknown[] = [];
      server.use(
        csrfHandler,
        http.patch(apiUrl('/api/drying/l1/logs/dl1'), async ({ request }) => {
          bodies.push(await request.json());
          return HttpResponse.json(buildDryingLog({ id: 'dl1' }));
        }),
      );
      renderScreen({ logId: 'dl1' });

      expect(
        await screen.findByRole('heading', {
          name: 'Corregir bitácora del día 2',
        }),
      ).toBeInTheDocument();
      expect(field('Humedad (%)')).toHaveValue('14,2');
      await userEvent.clear(field('Humedad (%)'));
      await userEvent.type(field('Humedad (%)'), '13,8');
      await save();

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith('/secado'),
      );
      expect(bodies).toEqual([{ moisture_pct: '13.8', expected_version: 3 }]);
      expect(
        await screen.findByText('Bitácora del día 2 corregida'),
      ).toBeInTheDocument();
      expect(await listQueuedLogs(userId)).toEqual([]);
    });

    it('marks the date when another log was recorded on it', async () => {
      server.use(
        csrfHandler,
        http.patch(apiUrl('/api/drying/l1/logs/dl1'), () =>
          HttpResponse.json(
            {
              detail: 'Ya existe un registro para esta fecha',
              code: 'duplicate_drying_log_date',
              fields: {
                measured_at: ['Ya existe un registro para esta fecha'],
              },
            },
            { status: 409 },
          ),
        ),
      );
      renderScreen({ logId: 'dl1' });

      await screen.findByRole('heading', {
        name: 'Corregir bitácora del día 2',
      });
      setTime('2026-10-22T20:00');
      await save();

      expect(
        await screen.findByText('Ya existe un registro para esta fecha'),
      ).toBeInTheDocument();
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('needs a connection', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      renderScreen({ logId: 'dl1' });

      expect(
        await screen.findByText('Corregir una bitácora necesita conexión.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    });
  });
});

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
  buildFermentation,
  buildFermentationTurn,
  buildSession,
} from '@/test/factories';
import { apiUrl, csrfHandler, fermentationsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import {
  enqueueTurn,
  getQueuedTurn,
  listQueuedTurns,
  turnQueueId,
  type TurnPayload,
} from '../turn-queue';
import { TurnScreen } from './turn-screen';

// 17 de octubre a las 09:00 en Bogotá. La fermentación empezó el 15 a las 07:00.
const NOW = new Date('2026-10-17T09:00:00-05:00');
const CODE = '000123-F02-P05-261014-1';

const withTurn = buildFermentation({
  turns: [
    buildFermentationTurn({
      id: 'ft1',
      turned_at: '2026-10-17T07:30:00-05:00',
      temperature_c: '45.0',
      ph: '4.90',
      version: 3,
    }),
  ],
});

const lotHref = (id: string) => `/lotes/detalle?id=${id}`;

let userId: string;

beforeEach(async () => {
  userId = `turn-screen-${crypto.randomUUID()}`;
  vi.clearAllMocks();
  resetLocation();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  // La sesión se confirmó hoy: dentro de la ventana sin conexión.
  await recordLogin(userId);
  server.use(fermentationsHandler([buildFermentation()]));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderScreen(props: Partial<Parameters<typeof TurnScreen>[0]> = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [PERMISSIONS.FERMENTATION_LOG_TURNS, PERMISSIONS.LOTS_VIEW],
    }),
  );
  renderWithProviders(<TurnScreen lotHref={lotHref} lotId="l1" {...props} />, {
    queryClient,
  });
}

const field = (name: string) => screen.getByLabelText(name);
const setTime = (value: string) =>
  fireEvent.change(field('Fecha y hora del volteo'), { target: { value } });
const save = async () =>
  userEvent.click(await screen.findByRole('button', { name: /^Guardar/ }));

describe('TurnScreen', () => {
  it('names the turn it will be, the box and the start, and counts the hours', async () => {
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: `Volteo 1 · ${CODE}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'C-01 · F02 · La Esperanza · inició el 15 oct. a las 07:00',
      ),
    ).toBeInTheDocument();
    expect(field('Fecha y hora del volteo')).toHaveValue('2026-10-17T09:00');
    expect(screen.getByText('50 h desde el inicio')).toBeInTheDocument();
    expect(
      screen.getByText('La temperatura de la masa, en el centro del cajón.'),
    ).toBeInTheDocument();
  });

  it('saves the turn on the device, goes back and says which turn it was', async () => {
    renderScreen();

    await userEvent.type(
      await screen.findByLabelText('Temperatura (°C)'),
      '45,5',
    );
    await userEvent.type(field('pH'), '4,85');
    await userEvent.type(field('Observaciones'), 'Masa caliente');
    await save();

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/fermentacion'),
    );
    const [queued] = await listQueuedTurns(userId);
    expect(queued).toMatchObject({
      lotId: 'l1',
      label: `${CODE} · volteo 1 · 17 oct. 09:00`,
      request: {
        temperature_c: '45.5',
        ph: '4.85',
        notes: 'Masa caliente',
        captured_at: NOW.toISOString(),
      },
    });
    expect(new Date(queued.request.turned_at).toISOString()).toBe(
      '2026-10-17T14:00:00.000Z',
    );
    expect(await screen.findByText('Volteo 1 registrado')).toBeInTheDocument();
  });

  it('numbers the turn after those of the server and of the phone, and recalls the last one', async () => {
    server.use(fermentationsHandler([withTurn]));
    await enqueueTurn(userId, {
      lotId: 'l1',
      request: {
        id: 'q1',
        turned_at: '2026-10-17T08:00:00-05:00',
        temperature_c: '46.0',
        ph: '4.80',
        notes: '',
        captured_at: null,
      },
      label: '',
    });
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: `Volteo 3 · ${CODE}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Volteo anterior: 2 · 17 oct. 08:00 · 46,0 °C · pH 4,80',
      ),
    ).toBeInTheDocument();

    setTime('2026-10-17T07:45');
    expect(
      await screen.findByRole('heading', { name: `Volteo 2 · ${CODE}` }),
    ).toBeInTheDocument();
  });

  it('marks what is missing and what is out of range, and saves nothing', async () => {
    renderScreen();

    await save();
    expect(await screen.findAllByText('Campo obligatorio')).toHaveLength(2);

    await userEvent.type(field('Temperatura (°C)'), '81');
    await userEvent.type(field('pH'), '15');
    await save();

    expect(
      await screen.findByText(
        'La temperatura debe ser mayor que 0 °C y hasta 80 °C.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('pH válido entre 0 y 14')).toBeInTheDocument();
    expect(await listQueuedTurns(userId)).toEqual([]);
  });

  it('does not save a second turn in the same minute, and points to the turns', async () => {
    server.use(fermentationsHandler([withTurn]));
    renderScreen();

    await screen.findByRole('heading', { name: `Volteo 2 · ${CODE}` });
    setTime('2026-10-17T07:30');
    await userEvent.type(field('Temperatura (°C)'), '45');
    await userEvent.type(field('pH'), '4,9');
    await save();

    expect(
      await screen.findByText('Ya hay un volteo registrado a las 07:30.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver los volteos' }),
    ).toHaveAttribute('href', '/lotes/detalle?id=l1');
    expect(await listQueuedTurns(userId)).toEqual([]);
  });

  it('saves on the phone without a connection', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(
      await screen.findByRole('button', { name: 'Guardar en el teléfono' }),
    ).toBeInTheDocument();
  });

  it('says when the lot is not in fermentation', async () => {
    server.use(
      http.get(apiUrl('/api/fermentation/l9'), () =>
        apiError(404, 'not_found'),
      ),
    );
    renderScreen({ lotId: 'l9' });

    expect(
      await screen.findByRole('heading', {
        name: 'Este lote no está en fermentación.',
      }),
    ).toBeInTheDocument();
  });

  it('says when the fermentation already finished', async () => {
    server.use(
      fermentationsHandler([]),
      http.get(apiUrl('/api/fermentation/l1'), () =>
        HttpResponse.json(
          buildFermentation({
            result: {
              ended_at: '2026-10-20T09:00:00-05:00',
              duration_hours: '122.0',
              turn_count: 5,
              notes: '',
            },
          }),
        ),
      ),
    );
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'La fermentación de este lote ya se finalizó.',
      }),
    ).toBeInTheDocument();
  });

  describe('correcting a turn the server rejected', () => {
    const rejected: TurnPayload = {
      lotId: 'l1',
      request: {
        id: 'q9',
        turned_at: '2026-10-17T08:00:00-05:00',
        temperature_c: '45.0',
        ph: '4.90',
        notes: '',
        captured_at: null,
      },
      label: `${CODE} · volteo 1 · 17 oct. 08:00`,
    };

    beforeEach(async () => {
      await enqueueTurn(userId, rejected);
      await getOfflineDb(userId).queue.update(turnQueueId('q9'), {
        status: 'error',
        errorCode: 'duplicate_turn_time',
        errorMessage: 'Ya hay un volteo registrado a esa hora.',
      });
    });

    it('opens with what was captured and sends it again', async () => {
      renderScreen({ pendingId: 'q9' });

      expect(
        await screen.findByRole('heading', { name: 'Corregir volteo 1' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'No se pudo sincronizar: Ya hay un volteo registrado a esa hora.',
        ),
      ).toBeInTheDocument();
      expect(field('Fecha y hora del volteo')).toHaveValue('2026-10-17T08:00');
      expect(field('Temperatura (°C)')).toHaveValue('45,0');

      setTime('2026-10-17T08:10');
      await save();

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith('/fermentacion'),
      );
      expect(await getQueuedTurn(userId, 'q9')).toMatchObject({
        status: 'pending',
      });
      expect(await screen.findByText('Volteo corregido')).toBeInTheDocument();
    });

    it('says when it is no longer on the device', async () => {
      renderScreen({ pendingId: 'nope' });

      expect(
        await screen.findByRole('heading', {
          name: 'Este volteo ya no está pendiente.',
        }),
      ).toBeInTheDocument();
    });
  });

  describe('correcting a turn of the server', () => {
    beforeEach(() => {
      server.use(fermentationsHandler([withTurn]));
    });

    it('sends only what changed, with the version it read', async () => {
      const bodies: unknown[] = [];
      server.use(
        csrfHandler,
        http.patch(
          apiUrl('/api/fermentation/l1/turns/ft1'),
          async ({ request }) => {
            bodies.push(await request.json());
            return HttpResponse.json(
              buildFermentationTurn({ id: 'ft1', ph: '4.85' }),
            );
          },
        ),
      );
      renderScreen({ turnId: 'ft1' });

      expect(
        await screen.findByRole('heading', { name: 'Corregir volteo 1' }),
      ).toBeInTheDocument();
      expect(field('pH')).toHaveValue('4,90');
      await userEvent.clear(field('pH'));
      await userEvent.type(field('pH'), '4,85');
      await save();

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith('/fermentacion'),
      );
      expect(bodies).toEqual([{ ph: '4.85', expected_version: 3 }]);
      expect(await screen.findByText('Volteo 1 corregido')).toBeInTheDocument();
      expect(await listQueuedTurns(userId)).toEqual([]);
    });

    it('marks the time when another turn was recorded at that minute', async () => {
      server.use(
        csrfHandler,
        http.patch(apiUrl('/api/fermentation/l1/turns/ft1'), () =>
          HttpResponse.json(
            {
              detail: 'Ya hay un volteo registrado a esa hora.',
              code: 'duplicate_turn_time',
              fields: {
                turned_at: ['Ya hay un volteo registrado a esa hora.'],
              },
            },
            { status: 409 },
          ),
        ),
      );
      renderScreen({ turnId: 'ft1' });

      await screen.findByRole('heading', { name: 'Corregir volteo 1' });
      setTime('2026-10-17T08:30');
      await save();

      expect(
        await screen.findByText('Ya hay un volteo registrado a esa hora.'),
      ).toBeInTheDocument();
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('needs a connection', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      renderScreen({ turnId: 'ft1' });

      expect(
        await screen.findByText('Corregir un volteo necesita conexión.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    });
  });
});

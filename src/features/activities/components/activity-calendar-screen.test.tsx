import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildAgriculturalActivity,
  buildAssignee,
  buildFarm,
  buildPlot,
  buildSession,
} from '@/test/factories';
import {
  activityAssigneesHandler,
  agriculturalActivitiesHandler,
  apiUrl,
  farmsHandler,
  plotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { pick } from '@/test/search-select';
import { server } from '@/test/server';

import { discard } from '@/lib/offline/sync-queue';

import { completionQueueId, enqueueCompletion } from '../completion-queue';
import { ActivityCalendarScreen } from './activity-calendar-screen';

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

let userId: string;
let urls: string[];

beforeEach(() => {
  userId = `activity-list-${crypto.randomUUID()}`;
  urls = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderScreen({
  searchParams = '',
  permissions = [PERMISSIONS.ACTIVITIES_VIEW] as string[],
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions,
    }),
  );
  return renderWithProviders(<ActivityCalendarScreen />, {
    queryClient,
    searchParams,
    onUrlUpdate: ({ queryString }) => urls.push(queryString),
  });
}

const dayOf = (name: string) => screen.findByRole('region', { name });

const offline = () =>
  http.get(apiUrl('/api/agricultural-activities'), () => HttpResponse.error());

describe('ActivityCalendarScreen', () => {
  it('asks for the current month and lists its activities by day', async () => {
    const requests: URLSearchParams[] = [];
    server.use(
      agriculturalActivitiesHandler(
        [
          buildAgriculturalActivity({
            id: 'a1',
            activity_type: 'weed_control',
            scheduled_date: '2026-10-19',
          }),
          buildAgriculturalActivity({
            id: 'a2',
            activity_type: 'pruning',
            scheduled_date: '2026-10-22',
            assignee: buildAssignee({ full_name: 'Otra cuenta de prueba' }),
          }),
        ],
        requests,
      ),
    );

    renderScreen();

    const monday = await dayOf('lunes 19 de octubre');
    expect(within(monday).getByText('Control de malezas')).toBeInTheDocument();
    expect(within(monday).getByText('P-03')).toBeInTheDocument();
    expect(within(monday).getByText('Finca de prueba')).toBeInTheDocument();
    const today = await dayOf('jueves 22 de octubre');
    expect(within(today).getByText('Hoy')).toBeInTheDocument();
    expect(within(today).getByText('Poda')).toBeInTheDocument();
    expect(
      within(today).getByText('Otra cuenta de prueba'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'octubre de 2026' }),
    ).toBeInTheDocument();
    expect(requests[0].toString()).toBe('from=2026-10-01&to=2026-10-31');
  });

  it('says the state of each activity with the date of the device', async () => {
    server.use(
      agriculturalActivitiesHandler([
        buildAgriculturalActivity({ id: 'a1', scheduled_date: '2026-10-17' }),
        buildAgriculturalActivity({ id: 'a2', scheduled_date: '2026-10-21' }),
        buildAgriculturalActivity({ id: 'a3', scheduled_date: '2026-10-22' }),
        buildAgriculturalActivity({
          id: 'a4',
          scheduled_date: '2026-10-05',
          status: 'done',
          done_date: '2026-10-05',
        }),
      ]),
    );

    renderScreen();

    expect(await screen.findByText('Vencida · 5 días')).toBeInTheDocument();
    expect(screen.getByText('Retrasada · 1 día')).toBeInTheDocument();
    expect(
      within(await dayOf('jueves 22 de octubre')).getByText('Programada'),
    ).toBeInTheDocument();
    expect(
      within(await dayOf('lunes 5 de octubre')).getByText('Realizada'),
    ).toBeInTheDocument();
  });

  it('names an activity of type other by its description and marks an inactive assignee', async () => {
    server.use(
      agriculturalActivitiesHandler([
        buildAgriculturalActivity({
          activity_type: 'other',
          other_description: 'Resiembra',
          assignee: buildAssignee({ is_active: false }),
        }),
      ]),
    );

    renderScreen();

    expect(await screen.findByText('Resiembra')).toBeInTheDocument();
    expect(
      within(await dayOf('martes 20 de octubre')).getByText(
        'Cuenta de prueba (cuenta inactiva)',
      ),
    ).toBeInTheDocument();
  });

  it('marks an assignee who no longer works on the farm of the plot', async () => {
    server.use(
      agriculturalActivitiesHandler([
        buildAgriculturalActivity({
          assignee: buildAssignee({ id: 'moved', full_name: 'Luis Rincón' }),
        }),
      ]),
      activityAssigneesHandler([
        buildAssignee({
          id: 'moved',
          full_name: 'Luis Rincón',
          farm_ids: ['f2'],
        }),
      ]),
    );

    renderScreen();

    expect(
      await within(await dayOf('martes 20 de octubre')).findByText(
        'Luis Rincón (responsable fuera de la finca)',
      ),
    ).toBeInTheDocument();
  });

  it('moves to the next and the previous month, in the address', async () => {
    const requests: URLSearchParams[] = [];
    server.use(agriculturalActivitiesHandler([], requests));
    renderScreen();
    await screen.findByText('No hay actividades programadas en este periodo');

    await userEvent.click(
      screen.getByRole('button', { name: 'Mes siguiente' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'noviembre de 2026' }),
    ).toBeInTheDocument();
    expect(urls.at(-1)).toBe('?mes=2026-11');
    expect(requests.map((request) => request.get('from'))).toContain(
      '2026-11-01',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));

    expect(
      await screen.findByRole('heading', { name: 'septiembre de 2026' }),
    ).toBeInTheDocument();
    expect(urls.at(-1)).toBe('?mes=2026-09');
  });

  it('comes back to the current month with Hoy and cleans the address', async () => {
    server.use(agriculturalActivitiesHandler([]));
    renderScreen({ searchParams: '?mes=2027-02' });
    expect(
      await screen.findByRole('heading', { name: 'febrero de 2027' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));

    expect(
      await screen.findByRole('heading', { name: 'octubre de 2026' }),
    ).toBeInTheDocument();
    expect(urls.at(-1)).toBe('');
    expect(screen.getByRole('button', { name: 'Hoy' })).toBeDisabled();
  });

  it('falls back to the current month with a malformed month in the address', async () => {
    const requests: URLSearchParams[] = [];
    server.use(agriculturalActivitiesHandler([], requests));

    renderScreen({ searchParams: '?mes=2026-13' });

    expect(
      await screen.findByRole('heading', { name: 'octubre de 2026' }),
    ).toBeInTheDocument();
    await screen.findByText('No hay actividades programadas en este periodo');
    expect(requests[0].get('from')).toBe('2026-10-01');
  });

  it('says that a month has no activities', async () => {
    server.use(agriculturalActivitiesHandler([]));

    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'No hay actividades programadas en este periodo',
      }),
    ).toBeInTheDocument();
  });

  it('shows the saved copy without a network and says so', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'agricultural-activities:2026-10',
      value: [buildAgriculturalActivity({ activity_type: 'irrigation' })],
      fetchedAt: 1_700_000_000_000,
    });
    server.use(offline());

    renderScreen();

    expect(
      within(await dayOf('martes 20 de octubre')).getByText('Riego'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sin conexión: estás viendo la última copia de las actividades.',
    );
  });

  it('says that a month never loaded needs a connection and offers today', async () => {
    server.use(offline());

    renderScreen({ searchParams: '?mes=2027-02' });

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión para ver las actividades de este mes.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ir a hoy' }),
    ).toBeInTheDocument();
  });

  it('offers to retry when the server fails', async () => {
    server.use(
      http.get(apiUrl('/api/agricultural-activities'), () =>
        apiError(500, 'server_error', 'Falló.'),
      ),
    );

    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar las actividades.',
    );
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('opens the detail of an activity and closes it', async () => {
    server.use(
      agriculturalActivitiesHandler([
        buildAgriculturalActivity({
          activity_type: 'pruning',
          scheduled_date: '2026-10-20',
        }),
      ]),
    );
    renderScreen();

    await userEvent.click(await screen.findByRole('button', { name: /Poda/ }));

    const detail = await screen.findByRole('dialog');
    expect(
      within(detail).getByRole('heading', { name: 'Poda' }),
    ).toBeInTheDocument();
    expect(detail).toHaveTextContent('martes 20 de octubre de 2026');
    expect(within(detail).getByRole('status')).toHaveTextContent(
      'Retrasada · 2 días',
    );

    await userEvent.click(
      within(detail).getByRole('button', { name: 'Cerrar' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  describe('scheduling', () => {
    const CAN_SCHEDULE = [
      PERMISSIONS.ACTIVITIES_VIEW,
      PERMISSIONS.ACTIVITIES_ADD,
    ];

    it('hides the button from who cannot schedule', async () => {
      server.use(agriculturalActivitiesHandler([]));

      renderScreen();

      await screen.findByText('No hay actividades programadas en este periodo');
      expect(
        screen.queryByRole('button', { name: 'Programar actividad' }),
      ).not.toBeInTheDocument();
    });

    it('opens the form and closes it without saving', async () => {
      server.use(
        agriculturalActivitiesHandler([]),
        farmsHandler([]),
        activityAssigneesHandler([]),
      );
      renderScreen({ permissions: CAN_SCHEDULE });

      await userEvent.click(
        await screen.findByRole('button', { name: 'Programar actividad' }),
      );

      const form = await screen.findByRole('dialog');
      expect(
        within(form).getByRole('heading', { name: 'Programar actividad' }),
      ).toBeInTheDocument();

      await userEvent.click(
        within(form).getByRole('button', { name: 'Cancelar' }),
      );

      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      );
    });

    it('says that an activity was scheduled and offers its month when it is another', async () => {
      const scheduled: unknown[] = [];
      server.use(
        http.get(apiUrl('/api/agricultural-activities'), ({ request }) => {
          const from = new URL(request.url).searchParams.get('from');
          return HttpResponse.json({
            results: from === '2026-11-01' ? scheduled : [],
          });
        }),
        farmsHandler([buildFarm({ id: 'f1', name: 'La Esperanza' })]),
        plotsHandler([buildPlot({ id: 'pl1', code: 'P-01' })]),
        activityAssigneesHandler([buildAssignee({ id: 'u1' })]),
        http.post(
          apiUrl('/api/agricultural-activities'),
          async ({ request }) => {
            const body = (await request.json()) as Record<string, string>;
            const created = buildAgriculturalActivity({
              id: body.id,
              activity_type: 'pruning',
              scheduled_date: body.scheduled_date,
            });
            scheduled.push(created);
            return HttpResponse.json(created, { status: 201 });
          },
        ),
      );
      renderScreen({ permissions: CAN_SCHEDULE });
      await userEvent.click(
        await screen.findByRole('button', { name: 'Programar actividad' }),
      );
      const form = await screen.findByRole('dialog');
      const field = (name: string) => within(form).getByLabelText(name);
      await pick('Parcela', 'P-01 · 2,4 ha', form);
      await userEvent.selectOptions(field('Tipo de actividad'), 'pruning');
      fireEvent.change(field('Fecha programada'), {
        target: { value: '2026-11-03' },
      });
      await within(field('Responsable')).findByRole('option', {
        name: 'Cuenta de prueba',
      });
      await userEvent.selectOptions(field('Responsable'), 'u1');

      await userEvent.click(
        within(form).getByRole('button', { name: 'Guardar' }),
      );

      expect(
        await screen.findByText('Actividad programada'),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('dialog', { name: 'Programar actividad' }),
      ).not.toBeInTheDocument();

      await userEvent.click(
        screen.getByRole('button', { name: 'Ver en su mes' }),
      );

      expect(
        within(await dayOf('martes 3 de noviembre')).getByText('Poda'),
      ).toBeInTheDocument();
      expect(urls.at(-1)).toBe('?mes=2026-11');
    });

    it('disables scheduling without a connection and says why', async () => {
      await getOfflineDb(userId).cache.put({
        key: 'agricultural-activities:2026-10',
        value: [],
        fetchedAt: 1_700_000_000_000,
      });
      server.use(offline());

      renderScreen({ permissions: CAN_SCHEDULE });

      const button = await screen.findByRole('button', {
        name: 'Programar actividad',
      });
      await waitFor(() => expect(button).toBeDisabled());
      expect(button).toHaveAccessibleDescription(
        'Programar una actividad necesita conexión.',
      );
    });
  });

  describe('editing', () => {
    const CAN_EDIT = [
      PERMISSIONS.ACTIVITIES_VIEW,
      PERMISSIONS.ACTIVITIES_CHANGE,
    ];
    const pruning = buildAgriculturalActivity({
      activity_type: 'pruning',
      scheduled_date: '2026-10-26',
      version: 2,
    });

    const openEdit = async () => {
      await userEvent.click(
        await screen.findByRole('button', { name: /Poda/ }),
      );
      await userEvent.click(
        await screen.findByRole('button', { name: 'Editar' }),
      );
      return screen.findByRole('heading', { name: 'Editar actividad' });
    };

    it('reschedules an activity from its detail and shows it in its new day', async () => {
      let saved = pruning;
      server.use(
        http.get(apiUrl('/api/agricultural-activities'), () =>
          HttpResponse.json({ results: [saved] }),
        ),
        activityAssigneesHandler([buildAssignee()]),
        http.patch(
          apiUrl('/api/agricultural-activities/a1'),
          async ({ request }) => {
            const body = (await request.json()) as Record<string, string>;
            saved = { ...saved, scheduled_date: body.scheduled_date };
            return HttpResponse.json(saved);
          },
        ),
      );
      renderScreen({ permissions: CAN_EDIT });
      await openEdit();

      fireEvent.change(screen.getByLabelText('Fecha programada'), {
        target: { value: '2026-10-29' },
      });
      await userEvent.click(
        screen.getByRole('button', { name: 'Guardar cambios' }),
      );

      expect(
        await screen.findByText('Actividad actualizada'),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('dialog', { name: 'Editar actividad' }),
      ).not.toBeInTheDocument();
      expect(
        within(await dayOf('jueves 29 de octubre')).getByText('Poda'),
      ).toBeInTheDocument();
    });

    it('comes back to the detail when the edition is cancelled', async () => {
      server.use(
        agriculturalActivitiesHandler([pruning]),
        activityAssigneesHandler([buildAssignee()]),
      );
      renderScreen({ permissions: CAN_EDIT });
      await openEdit();

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(
        await screen.findByRole('heading', { name: 'Poda' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Editar' })).toBeEnabled();
    });

    it('closes the form and says why when the activity can no longer be edited', async () => {
      server.use(
        agriculturalActivitiesHandler([pruning]),
        activityAssigneesHandler([buildAssignee()]),
        http.patch(apiUrl('/api/agricultural-activities/a1'), () =>
          apiError(
            409,
            'activity_already_done',
            'Las actividades realizadas no se pueden modificar.',
          ),
        ),
      );
      renderScreen({ permissions: CAN_EDIT });
      await openEdit();

      fireEvent.change(screen.getByLabelText('Fecha programada'), {
        target: { value: '2026-10-29' },
      });
      await userEvent.click(
        screen.getByRole('button', { name: 'Guardar cambios' }),
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Las actividades realizadas no se pueden modificar.',
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('disables editing without a connection and says why', async () => {
      await getOfflineDb(userId).cache.put({
        key: 'agricultural-activities:2026-10',
        value: [pruning],
        fetchedAt: 1_700_000_000_000,
      });
      server.use(offline());
      renderScreen({ permissions: CAN_EDIT });

      await userEvent.click(
        await screen.findByRole('button', { name: /Poda/ }),
      );

      const edit = await screen.findByRole('button', { name: 'Editar' });
      expect(edit).toBeDisabled();
      expect(edit).toHaveAccessibleDescription(
        'Editar y eliminar una actividad necesitan conexión.',
      );
    });
  });

  describe('deleting', () => {
    const CAN_DELETE = [
      PERMISSIONS.ACTIVITIES_VIEW,
      PERMISSIONS.ACTIVITIES_DELETE,
    ];
    const pruning = buildAgriculturalActivity({
      activity_type: 'pruning',
      scheduled_date: '2026-10-26',
      version: 2,
    });

    const openDelete = async () => {
      await userEvent.click(
        await screen.findByRole('button', { name: /Poda/ }),
      );
      await userEvent.click(
        await screen.findByRole('button', { name: 'Eliminar' }),
      );
      return screen.findByRole('heading', {
        name: '¿Eliminar esta actividad?',
      });
    };

    it('deletes an activity from its detail and takes it off the list', async () => {
      let results = [pruning];
      const versions: (string | null)[] = [];
      server.use(
        http.get(apiUrl('/api/agricultural-activities'), () =>
          HttpResponse.json({ results }),
        ),
        http.delete(
          apiUrl('/api/agricultural-activities/a1'),
          ({ request }) => {
            versions.push(
              new URL(request.url).searchParams.get('expected_version'),
            );
            results = [];
            return new HttpResponse(null, { status: 204 });
          },
        ),
      );
      renderScreen({ permissions: CAN_DELETE });
      await openDelete();

      await userEvent.click(
        screen.getByRole('button', { name: 'Eliminar actividad' }),
      );

      expect(
        await screen.findByText('Actividad eliminada'),
      ).toBeInTheDocument();
      expect(versions).toEqual(['2']);
      expect(
        screen.queryByRole('dialog', { name: '¿Eliminar esta actividad?' }),
      ).not.toBeInTheDocument();
      expect(
        await screen.findByText(
          'No hay actividades programadas en este periodo',
        ),
      ).toBeInTheDocument();
    });

    it('comes back to the detail when the deletion is cancelled', async () => {
      server.use(agriculturalActivitiesHandler([pruning]));
      renderScreen({ permissions: CAN_DELETE });
      await openDelete();

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(
        await screen.findByRole('heading', { name: 'Poda' }),
      ).toBeInTheDocument();
    });

    it('hides the deletion from who lacks the permission', async () => {
      server.use(agriculturalActivitiesHandler([pruning]));
      renderScreen({
        permissions: [
          PERMISSIONS.ACTIVITIES_VIEW,
          PERMISSIONS.ACTIVITIES_CHANGE,
        ],
      });

      await userEvent.click(
        await screen.findByRole('button', { name: /Poda/ }),
      );

      await screen.findByRole('button', { name: 'Editar' });
      expect(
        screen.queryByRole('button', { name: 'Eliminar' }),
      ).not.toBeInTheDocument();
    });

    it('disables the deletion without a connection', async () => {
      await getOfflineDb(userId).cache.put({
        key: 'agricultural-activities:2026-10',
        value: [pruning],
        fetchedAt: 1_700_000_000_000,
      });
      server.use(offline());
      renderScreen({ permissions: CAN_DELETE });

      await userEvent.click(
        await screen.findByRole('button', { name: /Poda/ }),
      );

      expect(
        await screen.findByRole('button', { name: 'Eliminar' }),
      ).toBeDisabled();
    });
  });

  describe('completions waiting in the device', () => {
    const pruning = buildAgriculturalActivity({
      activity_type: 'pruning',
      scheduled_date: '2026-10-20',
    });
    const waiting = () =>
      enqueueCompletion(userId, 'a1', {
        request: { done_date: '2026-10-22', inputs: [] },
        label: 'Poda · P-03',
      });

    it('shows the activity as done and pending to send, without actions', async () => {
      await waiting();
      server.use(agriculturalActivitiesHandler([pruning]));
      renderScreen({
        permissions: [
          PERMISSIONS.ACTIVITIES_VIEW,
          PERMISSIONS.ACTIVITIES_CHANGE,
          PERMISSIONS.ACTIVITIES_COMPLETE,
          PERMISSIONS.ACTIVITIES_DELETE,
        ],
      });

      const card = await screen.findByRole('button', { name: /Poda/ });
      await waitFor(() =>
        expect(card).toHaveTextContent('Realizada · pendiente de enviar'),
      );
      expect(card).not.toHaveTextContent('Retrasada');

      await userEvent.click(card);

      const detail = await screen.findByRole('dialog');
      expect(detail).toHaveTextContent('Guardada en este teléfono.');
      expect(
        within(detail).queryByRole('button', { name: 'Editar' }),
      ).not.toBeInTheDocument();
      expect(
        within(detail).queryByRole('link', { name: 'Registrar realización' }),
      ).not.toBeInTheDocument();
    });

    it('goes back to the state of the activity when the record leaves the device', async () => {
      await waiting();
      server.use(agriculturalActivitiesHandler([pruning]));
      renderScreen();
      const card = await screen.findByRole('button', { name: /Poda/ });
      await waitFor(() =>
        expect(card).toHaveTextContent('Realizada · pendiente de enviar'),
      );

      await discard(userId, completionQueueId('a1'));

      await waitFor(() => expect(card).toHaveTextContent('Retrasada · 2 días'));
    });
  });
});

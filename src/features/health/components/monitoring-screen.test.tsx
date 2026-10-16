import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildAgriculturalActivity,
  buildAgriculturalInput,
  buildAssignee,
  buildPestDisease,
  buildSession,
} from '@/test/factories';
import {
  activityAssigneesHandler,
  agriculturalInputsHandler,
  apiUrl,
  inputStocksHandler,
  pestsDiseasesHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

import { getOfflineDb } from '@/lib/offline/db';
import { clearAdapters, registerAdapter } from '@/lib/offline/sync-queue';

import {
  enqueueMonitoring,
  getQueuedMonitoring,
  monitoringQueueId,
} from '../monitoring-queue';
import { EVIDENCE_RESOURCE, type EvidencePayload } from '../evidence-queue';
import { monitoringSyncAdapter } from '../monitoring-sync-adapter';
vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);
// jsdom no tiene lienzo para reducir fotos: la preparación tiene sus propias pruebas.
vi.mock('@/lib/images/prepare-photo', () => ({
  preparePhoto: vi.fn(async (file: File) => ({
    ok: true,
    blob: new Blob(['foto']),
    name: file.name,
  })),
}));

import { MonitoringScreen } from './monitoring-screen';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

const monilia = buildPestDisease({
  id: 'monilia',
  name: 'Monilia',
  description: 'Manchas cafés que se cubren de un polvo blanco crema.',
});
const trips = buildPestDisease({
  id: 'trips',
  name: 'Trips',
  kind: 'pest',
  description: 'Raspan el envés de las hojas.',
});

const copper = buildAgriculturalInput({
  id: 'copper',
  name: 'Óxido de cobre',
  unit: 'kg',
  package_type: null,
  package_size: null,
});

let userId: string;

const activityHandler = (overrides: Partial<AgriculturalActivity> = {}) =>
  http.get(apiUrl('/api/agricultural-activities/a1'), () =>
    HttpResponse.json(
      buildAgriculturalActivity({
        activity_type: 'phytosanitary_monitoring',
        scheduled_date: '2026-10-20',
        created_at: '2026-10-08T09:00:00-05:00',
        assignee: buildAssignee({
          id: 'u-foreman',
          full_name: 'Carlos Rincón',
        }),
        ...overrides,
      }),
    ),
  );

beforeEach(async () => {
  userId = `monitoring-screen-${crypto.randomUUID()}`;
  vi.clearAllMocks();
  resetLocation();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  await recordLogin(userId);
  server.use(
    activityHandler(),
    pestsDiseasesHandler([monilia, trips]),
    agriculturalInputsHandler([copper]),
    inputStocksHandler([]),
    activityAssigneesHandler([
      buildAssignee({
        id: 'u-foreman',
        full_name: 'Carlos Rincón',
        all_farms: false,
        farm_ids: ['f1'],
      }),
      buildAssignee({
        id: 'u-elsewhere',
        full_name: 'Cuenta de otra finca',
        all_farms: false,
        farm_ids: ['f2'],
      }),
    ]),
  );
});

afterEach(() => {
  clearAdapters();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderScreen(user: Parameters<typeof buildSession>[0] = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [
        PERMISSIONS.ACTIVITIES_VIEW,
        PERMISSIONS.ACTIVITIES_COMPLETE,
        PERMISSIONS.ACTIVITIES_ADD,
      ],
      ...user,
    }),
  );
  renderWithProviders(<MonitoringScreen activityId="a1" />, { queryClient });
}

const sheet = () =>
  screen.findByRole('button', { name: /^Guardar/ }, { timeout: 5000 });
const detection = (number: number) =>
  screen.getByRole('group', { name: `Detección ${number}` });
const choosePest = async (number: number, typed: string, name: RegExp) => {
  const field = within(detection(number)).getByRole('combobox', {
    name: 'Plaga o enfermedad',
  });
  await userEvent.click(field);
  await userEvent.type(field, typed);
  await userEvent.click(await screen.findByRole('option', { name }));
};

describe('MonitoringScreen', () => {
  it('shows the monitoring and starts with today, trees and one empty detection', async () => {
    renderScreen();
    await sheet();

    const card = screen.getByRole('region', { name: 'Monitoreo' });
    expect(card).toHaveTextContent('Parcela P-03 · Finca de prueba');
    expect(card).toHaveTextContent('Carlos Rincón');
    expect(screen.getByLabelText('Fecha de realización')).toHaveValue(
      '2026-10-22',
    );
    expect(screen.getByRole('button', { name: 'Árboles' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(detection(1)).toBeInTheDocument();
    expect(
      within(detection(1)).getByLabelText('Árboles afectados'),
    ).toBeInTheDocument();
  });

  it('shows the description of each pest while searching and of the chosen one', async () => {
    renderScreen();
    await sheet();

    const field = within(detection(1)).getByRole('combobox', {
      name: 'Plaga o enfermedad',
    });
    await userEvent.type(field, 'polvo blanco');
    expect(
      await screen.findByRole('option', { name: /^Monilia/ }),
    ).toHaveTextContent(
      'Manchas cafés que se cubren de un polvo blanco crema.',
    );
    // Otra está siempre, aunque no coincida.
    expect(screen.getByRole('option', { name: /^Otra/ })).toBeVisible();
    await userEvent.click(screen.getByRole('option', { name: /^Monilia/ }));

    expect(field).toHaveAccessibleDescription(
      'Manchas cafés que se cubren de un polvo blanco crema.',
    );
  });

  it('computes the incidence while the person writes, in the unit evaluated', async () => {
    renderScreen();
    await sheet();

    await userEvent.type(screen.getByLabelText('Unidades evaluadas'), '50');
    await userEvent.type(
      within(detection(1)).getByLabelText('Árboles afectados'),
      '12',
    );
    expect(detection(1)).toHaveTextContent(
      'Incidencia: 12 de 50 árboles · 24 %',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Mazorcas' }));
    expect(
      within(detection(1)).getByLabelText('Mazorcas afectadas'),
    ).toBeInTheDocument();
    expect(detection(1)).toHaveTextContent(
      'Incidencia: 12 de 50 mazorcas · 24 %',
    );
  });

  it('asks what was found when choosing Other', async () => {
    renderScreen();
    await sheet();

    await choosePest(1, 'zzz', /^Otra/);

    expect(
      within(detection(1)).getByLabelText('¿Qué encontraste?'),
    ).toBeInTheDocument();
  });

  it('adds and removes detections', async () => {
    renderScreen();
    await sheet();

    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar detección' }),
    );
    expect(detection(2)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar detección 1' }),
    );
    expect(
      screen.queryByRole('group', { name: 'Detección 2' }),
    ).not.toBeInTheDocument();
  });

  it('hides the detections when marking no presence', async () => {
    renderScreen();
    await sheet();

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Sin presencia de plagas ni enfermedades',
      }),
    );

    expect(
      screen.queryByRole('group', { name: 'Detección 1' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Agregar detección' }),
    ).not.toBeInTheDocument();
  });

  it('marks what is missing or wrong before going on', async () => {
    renderScreen();
    await userEvent.click(await sheet());

    expect(
      await screen.findByText('Revisa los datos marcados antes de guardar.'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Unidades evaluadas'),
    ).toHaveAccessibleDescription('Indica cuántas unidades evaluaste');
    expect(
      within(detection(1)).getByLabelText('Árboles afectados'),
    ).toHaveAccessibleDescription('Indica las unidades afectadas');
  });

  it('does not let more units be affected than evaluated, nor the same pest twice', async () => {
    renderScreen();
    await sheet();

    await userEvent.type(screen.getByLabelText('Unidades evaluadas'), '50');
    await choosePest(1, 'moni', /^Monilia/);
    await userEvent.type(
      within(detection(1)).getByLabelText('Árboles afectados'),
      '60',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar detección' }),
    );
    await choosePest(2, 'moni', /^Monilia/);
    await userEvent.type(
      within(detection(2)).getByLabelText('Árboles afectados'),
      '3',
    );
    await userEvent.click(await sheet());

    await waitFor(() =>
      expect(
        within(detection(1)).getByLabelText('Árboles afectados'),
      ).toHaveAccessibleDescription(
        'Las unidades afectadas no pueden superar las evaluadas (50)',
      ),
    );
    expect(
      within(detection(2)).getByText(
        'Esta plaga o enfermedad ya está en la lista. Modifica la detección existente',
      ),
    ).toBeInTheDocument();
  });

  it('lets choose only Other while the catalog was never loaded in the device', async () => {
    server.use(
      http.get(apiUrl('/api/pests-diseases'), () => HttpResponse.error()),
    );
    renderScreen();
    await sheet();

    expect(
      screen.getByText(/Necesitas conexión una vez para cargar las plagas/),
    ).toBeInTheDocument();
  });

  describe('the control of each detection', () => {
    const controlOf = (number: number) =>
      within(detection(number)).getByRole('group', { name: 'Control' });
    const chooseControl = (number: number, name: string) =>
      userEvent.click(within(controlOf(number)).getByRole('radio', { name }));

    it('starts with no control for now', async () => {
      renderScreen();
      await sheet();

      expect(
        within(controlOf(1)).getByRole('radio', { name: 'Ninguno por ahora' }),
      ).toBeChecked();
      expect(within(controlOf(1)).queryByLabelText('¿Qué hiciste?')).toBeNull();
    });

    it('asks what was done in the moment and the inputs used', async () => {
      renderScreen();
      await sheet();

      await chooseControl(1, 'Lo hice en este momento');

      const control = controlOf(1);
      expect(within(control).getByLabelText('¿Qué hiciste?')).toBeVisible();
      expect(
        within(control).getByRole('button', { name: 'Agregar insumo' }),
      ).toBeEnabled();
      await userEvent.selectOptions(
        within(control).getByLabelText('¿Qué hiciste?'),
        'other',
      );
      expect(
        within(control).getByLabelText('Escribe qué hiciste'),
      ).toBeVisible();
    });

    it('asks the date, the assignee of the farm and the optional plan for later', async () => {
      renderScreen();
      await sheet();

      await chooseControl(1, 'Programarlo para después');

      const control = controlOf(1);
      expect(within(control).getByLabelText('Fecha programada')).toBeVisible();
      expect(
        within(control).getByLabelText('¿Qué se va a hacer? (opcional)'),
      ).toBeVisible();
      await userEvent.click(
        within(control).getByRole('combobox', { name: 'Responsable' }),
      );
      // Solo quien trabaja en la finca de la parcela.
      expect(
        (await screen.findAllByRole('option')).map((o) => o.textContent),
      ).toEqual(['Carlos Rincón']);
      await userEvent.keyboard('{Escape}');
      await userEvent.click(
        within(control).getByRole('combobox', {
          name: 'Insumo previsto (opcional)',
        }),
      );
      expect(
        await screen.findByRole('option', { name: 'Óxido de cobre' }),
      ).toBeVisible();
    });

    it('lets who cannot schedule only ask for it to be scheduled', async () => {
      renderScreen({
        id: 'u-foreman',
        permissions: [
          PERMISSIONS.ACTIVITIES_VIEW,
          PERMISSIONS.ACTIVITIES_COMPLETE,
        ],
        all_farms: false,
        farms: [{ id: 'f1', name: 'Finca de prueba', is_active: true }],
      });
      await sheet();

      await chooseControl(1, 'Programarlo para después');

      const control = controlOf(1);
      expect(control).toHaveTextContent(
        'El Productor o el Capataz de la finca lo van a programar.',
      );
      expect(within(control).queryByLabelText('Fecha programada')).toBeNull();
      expect(
        within(control).queryByRole('combobox', { name: 'Responsable' }),
      ).toBeNull();
    });

    it('starts clean when changing the option', async () => {
      renderScreen();
      await sheet();

      await chooseControl(1, 'Lo hice en este momento');
      await userEvent.selectOptions(
        within(controlOf(1)).getByLabelText('¿Qué hiciste?'),
        'fruit_removal',
      );
      await chooseControl(1, 'Programarlo para después');
      await chooseControl(1, 'Lo hice en este momento');

      expect(within(controlOf(1)).getByLabelText('¿Qué hiciste?')).toHaveValue(
        '',
      );
    });

    it('marks what each option is missing', async () => {
      renderScreen();
      await sheet();
      await userEvent.click(
        screen.getByRole('button', { name: 'Agregar detección' }),
      );

      await chooseControl(1, 'Lo hice en este momento');
      await chooseControl(2, 'Programarlo para después');
      await userEvent.click(await sheet());

      expect(
        await within(controlOf(1)).findByText('Indica qué hiciste'),
      ).toBeVisible();
      expect(within(controlOf(2)).getByText('Indica la fecha')).toBeVisible();
      expect(
        within(controlOf(2)).getByText('Elige el responsable'),
      ).toBeVisible();
    });
  });

  describe('saving', () => {
    // Llena una planilla con Monilia en 12 de 50 árboles, quitada en el momento.
    async function fillMonilia() {
      await sheet();
      await userEvent.type(screen.getByLabelText('Unidades evaluadas'), '50');
      await choosePest(1, 'moni', /^Monilia/);
      await userEvent.type(
        within(detection(1)).getByLabelText('Árboles afectados'),
        '12',
      );
      await userEvent.click(
        within(detection(1)).getByRole('radio', {
          name: 'Lo hice en este momento',
        }),
      );
      await userEvent.selectOptions(
        within(detection(1)).getByLabelText('¿Qué hiciste?'),
        'fruit_removal',
      );
    }
    const confirmDialog = () =>
      screen.findByRole('dialog', { name: '¿Registrar este monitoreo?' });

    it('says what is going to be registered before saving it', async () => {
      renderScreen();
      await fillMonilia();

      await userEvent.click(await sheet());

      const dialog = await confirmDialog();
      expect(dialog).toHaveTextContent(
        'P-03 · 22 de octubre · 50 árboles evaluados',
      );
      expect(dialog).toHaveTextContent('Monilia: 12 árboles · 24 %');
      expect(dialog).toHaveTextContent(
        'Control: remoción de frutos enfermos (hecho)',
      );
      expect(dialog).toHaveTextContent('Después no se podrá modificar.');
      expect(await getQueuedMonitoring(userId, 'a1')).toBeNull();
    });

    it('goes back from the summary keeping what was written', async () => {
      renderScreen();
      await fillMonilia();
      await userEvent.click(await sheet());

      await userEvent.click(
        within(await confirmDialog()).getByRole('button', { name: 'Volver' }),
      );

      expect(screen.getByLabelText('Unidades evaluadas')).toHaveValue('50');
      expect(await getQueuedMonitoring(userId, 'a1')).toBeNull();
    });

    it('saves the result in the device, goes back and says so', async () => {
      renderScreen();
      await fillMonilia();
      await userEvent.click(await sheet());

      await userEvent.click(
        within(await confirmDialog()).getByRole('button', {
          name: 'Guardar monitoreo',
        }),
      );

      expect(await screen.findByText('Monitoreo registrado')).toBeVisible();
      expect(router.replace).toHaveBeenCalledWith('/actividades');
      const queued = await getQueuedMonitoring(userId, 'a1');
      expect(queued?.label).toBe('P-03 · 22 de octubre');
      expect(queued?.request).toMatchObject({
        done_date: '2026-10-22',
        sampling_unit: 'trees',
        evaluated_units: 50,
        no_presence: false,
        detections: [
          {
            pest_disease_id: 'monilia',
            affected_units: 12,
            control: { mode: 'done', method: 'fruit_removal', inputs: [] },
            control_requested: false,
          },
        ],
        captured_at: NOW.toISOString(),
      });
    });

    it('sends it to the server when there is a connection', async () => {
      const received: unknown[] = [];
      server.use(
        http.post(
          apiUrl('/api/agricultural-activities/a1/monitoring'),
          async ({ request }) => {
            received.push(await request.json());
            return HttpResponse.json(
              buildAgriculturalActivity({ status: 'done' }),
              { status: 201 },
            );
          },
        ),
      );
      registerAdapter(monitoringSyncAdapter);
      renderScreen();
      await sheet();
      await userEvent.type(screen.getByLabelText('Unidades evaluadas'), '30');
      await userEvent.click(
        screen.getByRole('checkbox', {
          name: 'Sin presencia de plagas ni enfermedades',
        }),
      );
      await userEvent.click(await sheet());
      await userEvent.click(
        within(await confirmDialog()).getByRole('button', {
          name: 'Guardar monitoreo',
        }),
      );

      await waitFor(() => expect(received).toHaveLength(1));
      expect(received[0]).toMatchObject({
        evaluated_units: 30,
        no_presence: true,
        detections: [],
      });
      await waitFor(async () =>
        expect(await getQueuedMonitoring(userId, 'a1')).toBeNull(),
      );
    });

    it('sends the chosen photos after the monitoring, and says how many go', async () => {
      vi.stubGlobal(
        'URL',
        Object.assign(URL, {
          createObjectURL: () => 'blob:foto',
          revokeObjectURL: () => {},
        }),
      );
      renderScreen();
      await fillMonilia();
      await userEvent.upload(screen.getByLabelText('Fotos de la galería'), [
        new File(['x'], 'mazorca.jpg', { type: 'image/jpeg' }),
      ]);
      expect(
        await screen.findByRole('button', { name: 'Quitar Foto 1' }),
      ).toBeVisible();

      await userEvent.click(await sheet());
      const dialog = await confirmDialog();
      expect(dialog).toHaveTextContent('1 foto adjunta');
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Guardar monitoreo' }),
      );

      expect(await screen.findByText('Monitoreo registrado')).toBeVisible();
      const [photo] = await getOfflineDb(userId)
        .queue.where('resource')
        .equals(EVIDENCE_RESOURCE)
        .toArray();
      expect(photo.parentId).toBe(monitoringQueueId('a1'));
      expect(photo.payload as EvidencePayload).toMatchObject({
        activityId: 'a1',
        kind: 'monitoring',
        fileName: 'mazorca.jpg',
        label: 'P-03 · 22 de octubre',
      });
    });

    it('says that the record stays in the phone without a connection', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      renderScreen();

      expect(
        await screen.findByRole('button', { name: 'Guardar en el teléfono' }),
      ).toBeEnabled();
    });

    it('opens what the server rejected, asks to choose again the pest that is gone and sends the correction', async () => {
      await enqueueMonitoring(userId, 'a1', {
        request: {
          done_date: '2026-10-21',
          sampling_unit: 'trees',
          evaluated_units: 50,
          no_presence: false,
          detections: [
            {
              id: 'd1',
              pest_disease_id: 'gone',
              other_description: null,
              affected_units: 12,
              control: null,
              control_requested: false,
            },
          ],
        },
        label: 'P-03 · 21 de octubre',
      });
      await getOfflineDb(userId).queue.update(monitoringQueueId('a1'), {
        status: 'error',
        errorCode: 'pest_disease_inactive',
        errorMessage: 'Una plaga o enfermedad ya no está activa.',
        errorData: { pest_disease_ids: ['gone'] },
      });
      renderScreen();

      expect(
        await screen.findByRole('heading', { name: 'Corregir monitoreo' }),
      ).toBeVisible();
      expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
        'No se pudo sincronizar: Una plaga o enfermedad ya no está activa.',
      );
      const pest = within(detection(1)).getByRole('combobox', {
        name: 'Plaga o enfermedad',
      });
      await waitFor(() =>
        expect(pest).toHaveAccessibleDescription(
          'Esta plaga o enfermedad ya no está activa. Elige otra.',
        ),
      );
      expect(
        within(detection(1)).getByLabelText('Árboles afectados'),
      ).toHaveValue('12');

      await choosePest(1, 'trips', /^Trips/);
      await userEvent.click(await sheet());
      await userEvent.click(
        within(await confirmDialog()).getByRole('button', {
          name: 'Guardar monitoreo',
        }),
      );

      await waitFor(async () =>
        expect(await getQueuedMonitoring(userId, 'a1')).toMatchObject({
          status: 'pending',
          request: {
            detections: [{ id: 'd1', pest_disease_id: 'trips' }],
          },
        }),
      );
    });
  });

  describe('what cannot be recorded here', () => {
    it('sends back, without a notice, a worker who opens a monitoring of someone else', async () => {
      renderScreen({
        id: 'u-worker',
        permissions: [
          PERMISSIONS.ACTIVITIES_VIEW,
          PERMISSIONS.ACTIVITIES_COMPLETE,
        ],
        all_farms: false,
      });

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith('/actividades'),
      );
      expect(screen.queryByRole('button', { name: /^Guardar/ })).toBeNull();
    });

    it('says that an activity of another type is not a monitoring', async () => {
      server.use(activityHandler({ activity_type: 'pruning' }));
      renderScreen();

      expect(
        await screen.findByText('Esta actividad no es un monitoreo.'),
      ).toBeInTheDocument();
    });

    it('says that a recorded monitoring is not modified', async () => {
      server.use(activityHandler({ status: 'done', done_date: '2026-10-20' }));
      renderScreen();

      expect(
        await screen.findByText('Este monitoreo ya fue registrado.'),
      ).toBeInTheDocument();
    });

    it('says that the monitoring no longer exists', async () => {
      server.use(
        http.get(apiUrl('/api/agricultural-activities/a1'), () =>
          apiError(404, 'not_found'),
        ),
      );
      renderScreen();

      expect(
        await screen.findByText('Este monitoreo ya no existe.'),
      ).toBeInTheDocument();
    });

    it('says that its result is already waiting in the device', async () => {
      await enqueueMonitoring(userId, 'a1', {
        request: {
          done_date: '2026-10-20',
          sampling_unit: 'trees',
          evaluated_units: 50,
          no_presence: true,
          detections: [],
        },
        label: 'P-03 · 20 de octubre',
      });
      renderScreen();

      expect(
        await screen.findByText('Este monitoreo ya está guardado.'),
      ).toBeInTheDocument();
    });
  });
});

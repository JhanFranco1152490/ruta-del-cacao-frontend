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
  buildAssignee,
  buildPestDisease,
  buildSession,
} from '@/test/factories';
import { apiUrl, pestsDiseasesHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

import { enqueueMonitoring } from '../monitoring-queue';
vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

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
  server.use(activityHandler(), pestsDiseasesHandler([monilia, trips]));
});

afterEach(() => {
  vi.useRealTimers();
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

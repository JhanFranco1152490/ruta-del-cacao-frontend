import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
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
import { server } from '@/test/server';

import { SchedulePlotActivity } from './schedule-plot-activity';

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

const CAN_SCHEDULE: string[] = [
  PERMISSIONS.ACTIVITIES_VIEW,
  PERMISSIONS.ACTIVITIES_ADD,
];

let posted: Record<string, unknown>[];

beforeEach(() => {
  posted = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  server.use(
    farmsHandler([
      buildFarm({ id: 'f1', name: 'La Esperanza' }),
      buildFarm({ id: 'f2', name: 'El Retiro' }),
    ]),
    plotsHandler([
      buildPlot({ id: 'pl1', code: 'P-01' }),
      buildPlot({ id: 'pl2', code: 'P-02' }),
    ]),
    activityAssigneesHandler([buildAssignee({ id: 'u1' })]),
    // Tras programar se vuelven a leer las actividades.
    agriculturalActivitiesHandler([]),
    http.post(apiUrl('/api/agricultural-activities'), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      posted.push(body);
      return HttpResponse.json(
        buildAgriculturalActivity({ scheduled_date: '2026-11-03' }),
        { status: 201 },
      );
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderButton({
  permissions = CAN_SCHEDULE,
  farm = { id: 'f1', isActive: true },
  plot = {},
}: {
  permissions?: string[];
  farm?: { id: string; isActive: boolean };
  plot?: Partial<{ isActive: boolean; isSynced: boolean }>;
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: 'me', permissions }),
  );
  renderWithProviders(
    <SchedulePlotActivity
      farm={farm}
      plot={{
        id: 'pl2',
        code: 'P-02',
        isActive: true,
        isSynced: true,
        ...plot,
      }}
    />,
    { queryClient },
  );
}

const button = () =>
  screen.queryByRole('button', { name: 'Programar actividad en P-02' });

describe('SchedulePlotActivity', () => {
  it('opens the form with the farm and the plot already chosen, and schedules there', async () => {
    renderButton();

    await userEvent.click(button()!);

    const form = await screen.findByRole('dialog');
    const field = (name: string) => within(form).getByLabelText(name);
    await waitFor(() => expect(field('Finca')).toHaveValue('f1'));
    await waitFor(() => expect(field('Parcela')).toHaveValue('pl2'));

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

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Actividad programada.',
    );
    expect(posted[0]).toMatchObject({ plot_id: 'pl2' });
    expect(
      screen.getByRole('link', { name: 'Ver en Actividades' }),
    ).toHaveAttribute('href', '/actividades?mes=2026-11');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is not offered to who cannot schedule', () => {
    renderButton({ permissions: [PERMISSIONS.ACTIVITIES_VIEW] });

    expect(button()).not.toBeInTheDocument();
  });

  it('is not offered in an inactive plot, in an inactive farm or in a plot that is only in the device', () => {
    renderButton({ plot: { isActive: false } });
    renderButton({ farm: { id: 'f1', isActive: false } });
    renderButton({ plot: { isSynced: false } });

    expect(button()).not.toBeInTheDocument();
  });

  it('is disabled without a connection and says why', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    renderButton();

    expect(button()).toBeDisabled();
    expect(button()).toHaveAccessibleDescription(
      'Programar una actividad necesita conexión.',
    );
  });
});

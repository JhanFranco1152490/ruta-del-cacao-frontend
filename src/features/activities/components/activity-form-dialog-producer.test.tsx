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
  buildProducer,
  buildSession,
} from '@/test/factories';
import {
  activityAssigneesHandler,
  apiUrl,
  farmsHandler,
  plotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { ActivityFormDialog } from './activity-form-dialog';

vi.setConfig({ testTimeout: 20_000 });

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

const TECHNICAL = {
  id: 'tech',
  is_superuser: true,
  producer_id: null,
  permissions: [PERMISSIONS.ACTIVITIES_VIEW, PERMISSIONS.ACTIVITIES_ADD],
};

let farmRequests: URLSearchParams[];
let assigneeRequests: URLSearchParams[];
let posted: Record<string, unknown>[];

const ana = buildProducer({
  id: 'p1',
  first_name: 'Ana',
  last_name: 'Prueba',
  member_code: 'PROD-000007',
});

beforeEach(() => {
  farmRequests = [];
  assigneeRequests = [];
  posted = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  server.use(
    farmsHandler(
      [
        buildFarm({
          id: 'f1',
          name: 'La Esperanza',
          producer: {
            id: 'p1',
            first_name: 'Ana',
            last_name: 'Prueba',
            member_code: 'PROD-000007',
          },
        }),
      ],
      farmRequests,
    ),
    plotsHandler([
      buildPlot({ id: 'pl1', code: 'P-01', area_hectares: '2.40' }),
    ]),
    activityAssigneesHandler(
      [buildAssignee({ id: 'u2', full_name: 'Otra cuenta' })],
      assigneeRequests,
    ),
    http.get(apiUrl('/api/producers/p1'), () => HttpResponse.json(ana)),
    http.get(apiUrl('/api/producers'), () =>
      HttpResponse.json({
        count: 1,
        next: null,
        previous: null,
        results: [ana],
      }),
    ),
    http.get(apiUrl('/api/farms/f1'), () =>
      HttpResponse.json(
        buildFarm({
          id: 'f1',
          name: 'La Esperanza',
          producer: {
            id: 'p1',
            first_name: 'Ana',
            last_name: 'Prueba',
            member_code: 'PROD-000007',
          },
        }),
      ),
    ),
    http.post(apiUrl('/api/agricultural-activities'), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      posted.push(body);
      return HttpResponse.json(buildAgriculturalActivity(body), {
        status: 201,
      });
    }),
  );
});

afterEach(() => vi.useRealTimers());

function renderDialog(
  user: Parameters<typeof buildSession>[0] = TECHNICAL,
  preset?: { farmId?: string; plotId?: string; date?: string },
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession(user));
  renderWithProviders(
    <ActivityFormDialog
      onClose={vi.fn()}
      onRejected={vi.fn()}
      onSaved={vi.fn()}
      preset={preset}
    />,
    { queryClient },
  );
}

const field = (name: string) => screen.getByLabelText(name);
const pickProducer = async () => {
  await userEvent.click(field('Productor'));
  await userEvent.click(
    await screen.findByRole('option', { name: 'Ana Prueba · PROD-000007' }),
  );
};

describe('ActivityFormDialog for the technical account', () => {
  it('asks for the producer first and keeps the farm closed until one is chosen', () => {
    renderDialog();

    expect(field('Productor')).toBeInTheDocument();
    expect(field('Finca')).toBeDisabled();
    expect(screen.getByText('Elige primero el productor.')).toBeInTheDocument();
    expect(farmRequests).toEqual([]);
  });

  it('offers only the farms of the producer that was chosen', async () => {
    renderDialog();

    await pickProducer();

    await waitFor(() => expect(field('Finca')).toBeEnabled());
    expect(farmRequests.at(-1)?.get('producer')).toBe('p1');
    expect(
      await within(field('Finca')).findByRole('option', {
        name: 'La Esperanza',
      }),
    ).toBeInTheDocument();
  });

  it('offers the accounts of the producer that was chosen as responsible', async () => {
    renderDialog();

    await pickProducer();

    await waitFor(() =>
      expect(assigneeRequests.at(-1)?.get('producer')).toBe('p1'),
    );
    expect(
      await within(field('Responsable')).findByRole('option', {
        name: 'Otra cuenta',
      }),
    ).toBeInTheDocument();
  });

  it('schedules an activity for the producer chosen, which the plot already says', async () => {
    renderDialog();
    await pickProducer();
    await within(field('Finca')).findByRole('option', { name: 'La Esperanza' });
    await userEvent.selectOptions(field('Finca'), 'f1');
    await within(field('Parcela')).findByRole('option', {
      name: 'P-01 · 2,4 ha',
    });
    await userEvent.selectOptions(field('Parcela'), 'pl1');
    await userEvent.selectOptions(field('Tipo de actividad'), 'fertilization');
    fireEvent.change(field('Fecha programada'), {
      target: { value: '2026-10-25' },
    });
    await within(field('Responsable')).findByRole('option', {
      name: 'Otra cuenta',
    });
    await userEvent.selectOptions(field('Responsable'), 'u2');

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ plot_id: 'pl1', assignee_id: 'u2' });
    expect(posted[0]).not.toHaveProperty('producer_id');
  });

  it('forgets the farm, the plot and the responsible when the producer is cleared', async () => {
    renderDialog();
    await pickProducer();
    await within(field('Finca')).findByRole('option', { name: 'La Esperanza' });
    await userEvent.selectOptions(field('Finca'), 'f1');

    await userEvent.click(
      document.querySelector<HTMLElement>('[data-slot="combobox-clear"]')!,
    );

    await waitFor(() => expect(field('Finca')).toHaveValue(''));
    expect(field('Finca')).toBeDisabled();
  });

  it('does not ask for the producer when the form comes from a farm, and takes the farm producer', async () => {
    renderDialog(TECHNICAL, { farmId: 'f1', plotId: 'pl1' });

    expect(screen.queryByLabelText('Productor')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(assigneeRequests.at(-1)?.get('producer')).toBe('p1'),
    );
  });

  it('does not show the producer to the other accounts', () => {
    renderDialog({
      id: 'me',
      permissions: [PERMISSIONS.ACTIVITIES_VIEW, PERMISSIONS.ACTIVITIES_ADD],
    });

    expect(screen.queryByLabelText('Productor')).not.toBeInTheDocument();
    expect(field('Finca')).toBeEnabled();
  });
});

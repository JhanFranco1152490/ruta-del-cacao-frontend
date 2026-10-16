import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
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
  apiUrl,
  farmsHandler,
  plotsHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { listedOptions, pick } from '@/test/search-select';
import { server } from '@/test/server';

import type { AgriculturalActivity } from '../api';
import { ActivityFormDialog } from './activity-form-dialog';

// Cada prueba llena un formulario de cinco campos con tres listas que llegan del servidor
// simulado: con toda la suite corriendo a la vez pasa de los 5 segundos por defecto.
vi.setConfig({ testTimeout: 20_000 });

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

type Body = Record<string, unknown>;

let posted: Body[];
let plotRequests: URLSearchParams[];
const onSaved = vi.fn<(activity: AgriculturalActivity) => void>();
const onClose = vi.fn<() => void>();
const onRejected = vi.fn<(message: string) => void>();

const postHandler = (
  respond: (body: Body) => Response | Promise<Response> = (body) =>
    HttpResponse.json(buildAgriculturalActivity(body), { status: 201 }),
) =>
  http.post(apiUrl('/api/agricultural-activities'), async ({ request }) => {
    const body = (await request.json()) as Body;
    posted.push(body);
    return respond(body);
  });

const OTHER_FARM = {
  ...buildPlot().farm,
  id: 'f2',
  code: 'F02',
  name: 'El Retiro',
};

beforeEach(() => {
  posted = [];
  plotRequests = [];
  onSaved.mockClear();
  onClose.mockClear();
  onRejected.mockClear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  server.use(
    farmsHandler([
      buildFarm({ id: 'f1', name: 'La Esperanza' }),
      buildFarm({ id: 'f2', code: 'F02', name: 'El Retiro' }),
      buildFarm({
        id: 'f3',
        code: 'F03',
        name: 'Finca cerrada',
        is_active: false,
      }),
    ]),
    plotsHandler(
      [
        buildPlot({ id: 'pl1', code: 'P-01', area_hectares: '2.40' }),
        buildPlot({ id: 'pl2', code: 'P-02', is_active: false }),
        buildPlot({
          id: 'pl3',
          code: 'P03',
          area_hectares: '1.00',
          farm: OTHER_FARM,
        }),
      ],
      plotRequests,
    ),
    activityAssigneesHandler([
      buildAssignee({ id: 'me', full_name: 'Cuenta propia' }),
      buildAssignee({ id: 'u2', full_name: 'Otra cuenta' }),
      buildAssignee({ id: 'u3', full_name: 'Cuenta vieja', is_active: false }),
    ]),
    postHandler(),
  );
});

afterEach(() => vi.useRealTimers());

function renderDialog(preset?: {
  farmId?: string;
  plotId?: string;
  date?: string;
}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: 'me',
      permissions: [PERMISSIONS.ACTIVITIES_VIEW, PERMISSIONS.ACTIVITIES_ADD],
    }),
  );
  renderWithProviders(
    <ActivityFormDialog
      onClose={onClose}
      onRejected={onRejected}
      onSaved={onSaved}
      preset={preset}
    />,
    { queryClient },
  );
}

const field = (name: string) => screen.getByLabelText(name);
const optionsOf = (name: string) =>
  within(field(name))
    .getAllByRole('option')
    .map((option) => option.textContent);
// Las opciones llegan del servidor simulado. La primera prueba del archivo carga además todos los
// módulos, y con la máquina ocupada pasa del segundo que se espera por defecto.
const choose = async (name: string, option: string) => {
  await within(field(name)).findByRole(
    'option',
    { name: option },
    { timeout: 5000 },
  );
  await userEvent.selectOptions(field(name), option);
};
const save = () =>
  userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

async function fillValidForm() {
  await pick('Finca', 'F01 · La Esperanza');
  await pick('Parcela', 'P-01 · 2,4 ha');
  await choose('Tipo de actividad', 'Fertilización');
  fireEvent.change(field('Fecha programada'), {
    target: { value: '2026-10-25' },
  });
  await choose('Responsable', 'Otra cuenta');
}

describe('ActivityFormDialog', () => {
  it('starts on the day it was opened from, when it comes from a day of the calendar', () => {
    renderDialog({ date: '2026-10-28' });

    expect(field('Fecha programada')).toHaveValue('2026-10-28');
  });

  it('starts with the date empty when it does not come from a day', () => {
    renderDialog();

    expect(field('Fecha programada')).toHaveValue('');
  });

  it('schedules an activity with what was chosen and the id of the device', async () => {
    renderDialog();
    await fillValidForm();

    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(posted).toHaveLength(1);
    expect(posted[0]).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      plot_id: 'pl1',
      activity_type: 'fertilization',
      scheduled_date: '2026-10-25',
      assignee_id: 'u2',
    });
    expect(onSaved.mock.calls[0][0]).toMatchObject({ plot_id: 'pl1' });
  });

  it('offers only active farms, active plots and active accounts', async () => {
    renderDialog();

    await within(field('Responsable')).findByRole('option', {
      name: 'Otra cuenta',
    });

    expect(await listedOptions('Finca')).toEqual([
      'Todas las fincas',
      'F01 · La Esperanza',
      'F02 · El Retiro',
    ]);
    expect(await listedOptions('Parcela')).toEqual([
      'P-01 · 2,4 ha',
      'P03 · 1 ha',
    ]);
    expect(optionsOf('Responsable')).toEqual([
      'Cuenta propia (tú)',
      'Otra cuenta',
    ]);
  });

  it('lists the plots of every farm from the start, grouped by farm', async () => {
    renderDialog();

    expect(field('Parcela')).toBeEnabled();
    await listedOptions('Parcela');
    await userEvent.click(field('Parcela'));

    expect(
      await screen.findByRole('group', { name: 'F01 · La Esperanza' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'F02 · El Retiro' }),
    ).toBeInTheDocument();
    expect(plotRequests[0].has('farm')).toBe(false);
  });

  it('fills the farm when a plot is chosen without choosing the farm first', async () => {
    renderDialog();

    await pick('Parcela', 'P03 · 1 ha');

    expect(field('Finca')).toHaveValue('F02 · El Retiro');
    // Elegir una parcela no acota la lista: las demás siguen a la vista.
    expect(await listedOptions('Parcela')).toEqual([
      'P-01 · 2,4 ha',
      'P03 · 1 ha',
    ]);
    expect(plotRequests).toHaveLength(1);
  });

  it('narrows the plots to the farm chosen and forgets a plot of another farm', async () => {
    renderDialog();
    await pick('Parcela', 'P03 · 1 ha');

    await pick('Finca', 'F01 · La Esperanza');

    expect(field('Parcela')).toHaveValue('');
    await waitFor(() => expect(plotRequests.at(-1)?.get('farm')).toBe('f1'));
  });

  it('finds a plot by typing part of its code', async () => {
    renderDialog();
    await listedOptions('Parcela');

    await userEvent.type(field('Parcela'), 'p03');

    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['P03 · 1 ha']);
  });

  it('says the list is cut when there are more plots than a page holds', async () => {
    server.use(
      http.get(apiUrl('/api/plots'), () =>
        HttpResponse.json({
          count: 150,
          next: 'http://localhost/api/plots?page=2',
          previous: null,
          results: [buildPlot({ id: 'pl1', code: 'P-01' })],
        }),
      ),
    );
    renderDialog();

    expect(
      await screen.findByText(
        'Se muestran las primeras parcelas. Elige una finca o escribe para ver las demás.',
      ),
    ).toBeInTheDocument();
  });

  it('starts over when every farm is chosen again', async () => {
    renderDialog();
    await pick('Finca', 'F01 · La Esperanza');
    await pick('Parcela', 'P-01 · 2,4 ha');

    await pick('Finca', 'Todas las fincas');

    expect(field('Parcela')).toHaveValue('');
    await waitFor(() => expect(plotRequests.at(-1)?.has('farm')).toBe(false));
  });

  it('says that a farm has no active plots', async () => {
    server.use(plotsHandler([buildPlot({ is_active: false })]));
    renderDialog();

    await pick('Finca', 'F01 · La Esperanza');

    expect(
      await screen.findByText('Esta finca no tiene parcelas activas.'),
    ).toBeInTheDocument();
  });

  it('marks each missing field and saves nothing', async () => {
    renderDialog();
    await listedOptions('Parcela');

    await save();

    expect(await screen.findByText('Complete los datos obligatorios')).toBe(
      screen.getAllByRole('alert')[0],
    );
    for (const name of [
      'Parcela',
      'Tipo de actividad',
      'Fecha programada',
      'Responsable',
    ]) {
      expect(field(name)).toBeInvalid();
      expect(field(name)).toHaveAccessibleDescription('Campo obligatorio');
    }
    expect(field('Finca')).toBeValid();
    expect(posted).toHaveLength(0);
  });

  it('does not offer days before today and rejects one', async () => {
    renderDialog();
    await fillValidForm();
    expect(field('Fecha programada')).toHaveAttribute('min', '2026-10-22');

    fireEvent.change(field('Fecha programada'), {
      target: { value: '2026-10-21' },
    });
    await save();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La fecha debe ser actual o futura',
    );
    expect(posted).toHaveLength(0);
  });

  it('asks what the labor is only with the type other, and sends it', async () => {
    renderDialog();
    await fillValidForm();
    expect(screen.queryByLabelText('¿Qué labor es?')).not.toBeInTheDocument();

    await choose('Tipo de actividad', 'Otro');
    await save();
    expect(field('¿Qué labor es?')).toHaveAccessibleDescription(
      'Campo obligatorio',
    );

    await userEvent.type(field('¿Qué labor es?'), 'Resiembra');
    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(posted[0]).toMatchObject({
      activity_type: 'other',
      other_description: 'Resiembra',
    });
  });

  it('shows next to its field what the server rejects and keeps what was written', async () => {
    server.use(
      postHandler(() =>
        apiError(
          422,
          'assignee_not_available',
          'El responsable debe ser una cuenta activa del productor de la parcela.',
          {
            assignee_id: [
              'El responsable debe ser una cuenta activa del productor de la parcela.',
            ],
          },
        ),
      ),
    );
    renderDialog();
    await fillValidForm();

    await save();

    await waitFor(() =>
      expect(field('Responsable')).toHaveAccessibleDescription(
        'El responsable debe ser una cuenta activa del productor de la parcela.',
      ),
    );
    expect(field('Fecha programada')).toHaveValue('2026-10-25');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows next to the plot that it was deactivated meanwhile', async () => {
    server.use(
      postHandler(() =>
        apiError(
          422,
          'plot_inactive',
          'La parcela está inactiva: no se pueden programar actividades en ella.',
        ),
      ),
    );
    renderDialog();
    await fillValidForm();

    await save();

    await waitFor(() =>
      expect(field('Parcela')).toHaveAccessibleDescription(
        'La parcela está inactiva: no se pueden programar actividades en ella.',
      ),
    );
  });

  it('shows any other failure above the form and keeps it open', async () => {
    server.use(postHandler(() => apiError(500, 'server_error', 'Falló.')));
    renderDialog();
    await fillValidForm();

    await save();

    expect(await screen.findByRole('alert')).toHaveTextContent('Falló.');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables saving while it sends, so it sends once', async () => {
    let respond = () => {};
    const answered = new Promise<void>((resolve) => {
      respond = resolve;
    });
    server.use(
      postHandler(async (body) => {
        await answered;
        return HttpResponse.json(buildAgriculturalActivity(body), {
          status: 201,
        });
      }),
    );
    renderDialog();
    await fillValidForm();

    await save();

    expect(
      await screen.findByRole('button', { name: 'Guardando…' }),
    ).toBeDisabled();
    respond();
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(posted).toHaveLength(1);
  });

  it('opens with the farm and the plot it was asked from', async () => {
    renderDialog({ farmId: 'f1', plotId: 'pl1' });

    await waitFor(() => expect(field('Parcela')).toHaveValue('P-01 · 2,4 ha'));
    await waitFor(() =>
      expect(field('Finca')).toHaveValue('F01 · La Esperanza'),
    );
  });
});

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
  buildSession,
} from '@/test/factories';
import { activityAssigneesHandler, apiUrl } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import type { AgriculturalActivity } from '../api';
import { ActivityFormDialog } from './activity-form-dialog';

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

type Body = Record<string, unknown>;

const onSaved =
  vi.fn<(activity: AgriculturalActivity, message: string) => void>();
const onClose = vi.fn<() => void>();
const onRejected = vi.fn<(message: string) => void>();
let patched: { id: string; body: Body }[];

const patchHandler = (
  respond: (body: Body) => Response = (body) =>
    HttpResponse.json(buildAgriculturalActivity({ ...body, version: 4 })),
) =>
  http.patch(
    apiUrl('/api/agricultural-activities/:id'),
    async ({ params, request }) => {
      const body = (await request.json()) as Body;
      patched.push({ id: String(params.id), body });
      return respond(body);
    },
  );

beforeEach(() => {
  patched = [];
  onSaved.mockClear();
  onClose.mockClear();
  onRejected.mockClear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  server.use(
    activityAssigneesHandler([
      buildAssignee({ id: 'u1', full_name: 'Cuenta de prueba' }),
      buildAssignee({ id: 'u2', full_name: 'Otra cuenta' }),
      buildAssignee({ id: 'u3', full_name: 'Cuenta vieja', is_active: false }),
    ]),
    patchHandler(),
  );
});

afterEach(() => vi.useRealTimers());

function renderEdit(overrides: Partial<AgriculturalActivity> = {}) {
  const activity = buildAgriculturalActivity({
    scheduled_date: '2026-10-28',
    version: 3,
    ...overrides,
  });
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: 'me',
      permissions: [PERMISSIONS.ACTIVITIES_VIEW, PERMISSIONS.ACTIVITIES_CHANGE],
    }),
  );
  renderWithProviders(
    <ActivityFormDialog
      activity={activity}
      onClose={onClose}
      onRejected={onRejected}
      onSaved={onSaved}
    />,
    { queryClient },
  );
}

const field = (name: string) => screen.getByLabelText(name);
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
const setDate = (value: string) =>
  fireEvent.change(field('Fecha programada'), { target: { value } });
const save = () =>
  userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

describe('ActivityFormDialog, editing', () => {
  it('opens with the values of the activity and its plot fixed', async () => {
    renderEdit();

    const form = await screen.findByRole('dialog');
    expect(
      within(form).getByRole('heading', { name: 'Editar actividad' }),
    ).toBeInTheDocument();
    expect(field('Tipo de actividad')).toHaveValue('fertilization');
    expect(field('Fecha programada')).toHaveValue('2026-10-28');
    await waitFor(() => expect(field('Responsable')).toHaveValue('u1'));
    // La actividad mantiene su parcela: se muestra, no se elige.
    expect(within(form).getByText('Finca de prueba')).toBeInTheDocument();
    expect(within(form).getByText('P-03')).toBeInTheDocument();
    expect(screen.queryByLabelText('Finca')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Parcela')).not.toBeInTheDocument();
  });

  it('sends only what changed, with the version that was read', async () => {
    renderEdit();
    await choose('Responsable', 'Otra cuenta');
    setDate('2026-10-30');

    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(patched).toEqual([
      {
        id: 'a1',
        body: {
          scheduled_date: '2026-10-30',
          assignee_id: 'u2',
          expected_version: 3,
        },
      },
    ]);
    expect(onSaved.mock.calls[0][1]).toBe('Actividad actualizada');
  });

  it('changes the assignee of a delayed activity without moving its date', async () => {
    renderEdit({ scheduled_date: '2026-10-20' });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Esta actividad está retrasada: elige una fecha nueva o registra su realización.',
    );
    await choose('Responsable', 'Otra cuenta');

    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(patched[0].body).toEqual({ assignee_id: 'u2', expected_version: 3 });
  });

  it('wants today or later to reschedule a delayed activity', async () => {
    renderEdit({ scheduled_date: '2026-10-20' });
    await waitFor(() => expect(field('Responsable')).toHaveValue('u1'));

    setDate('2026-10-21');
    await save();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La fecha debe ser actual o futura',
    );
    expect(patched).toHaveLength(0);

    setDate('2026-10-23');
    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(patched[0].body).toEqual({
      scheduled_date: '2026-10-23',
      expected_version: 3,
    });
  });

  it('asks the server for nothing when nothing changed', async () => {
    renderEdit();
    await waitFor(() => expect(field('Responsable')).toHaveValue('u1'));

    await save();

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(patched).toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('keeps an assignee whose account is inactive while the rest is edited', async () => {
    renderEdit({
      assignee: buildAssignee({
        id: 'u3',
        full_name: 'Cuenta vieja',
        is_active: false,
      }),
    });
    await within(field('Responsable')).findByRole('option', {
      name: 'Cuenta vieja · Cuenta inactiva',
    });
    await waitFor(() => expect(field('Responsable')).toHaveValue('u3'));
    await choose('Tipo de actividad', 'Riego');

    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(patched[0].body).toEqual({
      activity_type: 'irrigation',
      expected_version: 3,
    });
  });

  it('loads what another person saved and sends the next try over it', async () => {
    const current = buildAgriculturalActivity({
      scheduled_date: '2026-10-29',
      assignee: buildAssignee({ id: 'u2', full_name: 'Otra cuenta' }),
      version: 5,
    });
    let attempts = 0;
    server.use(
      patchHandler((body) => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              {
                detail: 'Otra persona cambió esta actividad.',
                code: 'stale_version',
                fields: {},
                current,
              },
              { status: 409 },
            )
          : HttpResponse.json({ ...current, ...body, version: 6 });
      }),
    );
    renderEdit();
    await choose('Tipo de actividad', 'Riego');

    await save();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Otra persona cambió esta actividad. Revisa los datos actuales antes de guardar.',
    );
    expect(field('Fecha programada')).toHaveValue('2026-10-29');
    await waitFor(() => expect(field('Responsable')).toHaveValue('u2'));
    expect(field('Tipo de actividad')).toHaveValue('fertilization');
    expect(onSaved).not.toHaveBeenCalled();

    await choose('Tipo de actividad', 'Riego');
    await save();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(patched[1].body).toEqual({
      activity_type: 'irrigation',
      expected_version: 5,
    });
  });

  it.each([
    [
      'activity_already_done',
      'Las actividades realizadas no se pueden modificar.',
    ],
    ['activity_overdue', 'Esta actividad venció y ya no se puede reprogramar.'],
  ])(
    'closes with the reason when the server answers %s',
    async (code, detail) => {
      server.use(patchHandler(() => apiError(409, code, detail)));
      renderEdit();
      await choose('Tipo de actividad', 'Riego');

      await save();

      await waitFor(() => expect(onRejected).toHaveBeenCalledWith(detail));
      expect(onSaved).not.toHaveBeenCalled();
    },
  );

  it('shows next to the assignee that the account is no longer available', async () => {
    const message =
      'El responsable debe ser una cuenta activa del productor de la parcela.';
    server.use(
      patchHandler(() =>
        apiError(422, 'assignee_not_available', message, {
          assignee_id: [message],
        }),
      ),
    );
    renderEdit();
    await choose('Responsable', 'Otra cuenta');

    await save();

    await waitFor(() =>
      expect(field('Responsable')).toHaveAccessibleDescription(message),
    );
    expect(onRejected).not.toHaveBeenCalled();
  });
});

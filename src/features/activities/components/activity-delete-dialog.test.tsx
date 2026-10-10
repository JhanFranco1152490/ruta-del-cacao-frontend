import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiError, buildAgriculturalActivity } from '@/test/factories';
import { agriculturalActivitiesHandler, apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import type { AgriculturalActivity } from '../api';
import { ActivityDeleteDialog } from './activity-delete-dialog';

const onClose = vi.fn<() => void>();
const onDone = vi.fn<(message: string) => void>();
const onRejected = vi.fn<(message: string) => void>();
let deleted: { id: string; expectedVersion: string | null }[];

const deleteHandler = (
  respond: () => Response | Promise<Response> = () =>
    new HttpResponse(null, { status: 204 }),
) =>
  http.delete(
    apiUrl('/api/agricultural-activities/:id'),
    ({ params, request }) => {
      deleted.push({
        id: String(params.id),
        expectedVersion: new URL(request.url).searchParams.get(
          'expected_version',
        ),
      });
      return respond();
    },
  );

beforeEach(() => {
  deleted = [];
  onClose.mockClear();
  onDone.mockClear();
  onRejected.mockClear();
  // Tras cada intento se vuelve a leer la lista.
  server.use(agriculturalActivitiesHandler([]), deleteHandler());
});

function renderDelete(overrides: Partial<AgriculturalActivity> = {}) {
  renderWithProviders(
    <ActivityDeleteDialog
      activity={buildAgriculturalActivity({
        activity_type: 'pruning',
        scheduled_date: '2026-10-22',
        version: 2,
        ...overrides,
      })}
      onClose={onClose}
      onDone={onDone}
      onRejected={onRejected}
    />,
  );
}

const confirm = () =>
  userEvent.click(screen.getByRole('button', { name: 'Eliminar actividad' }));

describe('ActivityDeleteDialog', () => {
  it('names what is going to be deleted and its consequence', async () => {
    renderDelete();

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('heading', {
        name: '¿Eliminar esta actividad?',
      }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      'Poda en P-03, programada para el jueves 22 de octubre. Se quitará del calendario. Esta acción no se puede deshacer.',
    );
    expect(dialog).toHaveTextContent(
      'Si solo cambió la fecha o el responsable, mejor edítala.',
    );
  });

  it('deletes with the version that was read', async () => {
    renderDelete();

    await confirm();

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Actividad eliminada'),
    );
    expect(deleted).toEqual([{ id: 'a1', expectedVersion: '2' }]);
  });

  it('names an activity of type other by its description', async () => {
    renderDelete({ activity_type: 'other', other_description: 'Resiembra' });

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Resiembra en P-03',
    );
  });

  it('deletes nothing when it is cancelled', async () => {
    renderDelete();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(deleted).toHaveLength(0);
  });

  it('disables the confirmation while it deletes, so it asks once', async () => {
    let respond = () => {};
    const answered = new Promise<void>((resolve) => {
      respond = resolve;
    });
    server.use(
      deleteHandler(async () => {
        await answered;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderDelete();

    await confirm();

    expect(
      await screen.findByRole('button', { name: 'Eliminando…' }),
    ).toBeDisabled();
    respond();
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(deleted).toHaveLength(1);
  });

  it('stays open and says that another person changed the activity', async () => {
    server.use(
      deleteHandler(() =>
        HttpResponse.json(
          {
            detail: 'Otra persona cambió esta actividad.',
            code: 'stale_version',
            fields: {},
            current: buildAgriculturalActivity({ version: 3 }),
          },
          { status: 409 },
        ),
      ),
    );
    renderDelete();

    await confirm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Otra persona cambió esta actividad. Revisa sus datos actuales antes de eliminarla.',
    );
    expect(onDone).not.toHaveBeenCalled();
    expect(onRejected).not.toHaveBeenCalled();
  });

  it.each([
    [
      409,
      'activity_already_done',
      'Las actividades realizadas no se pueden modificar.',
      'Las actividades realizadas no se pueden modificar.',
    ],
    [
      409,
      'activity_overdue',
      'Esta actividad venció y ya no se puede reprogramar.',
      'Esta actividad venció y ya no se puede reprogramar.',
    ],
    [
      404,
      'not_found',
      'La actividad no existe.',
      'Esta actividad ya no existe.',
    ],
  ])(
    'closes with the reason when the server answers %i %s',
    async (status, code, detail, shown) => {
      server.use(deleteHandler(() => apiError(status, code, detail)));
      renderDelete();

      await confirm();

      await waitFor(() => expect(onRejected).toHaveBeenCalledWith(shown));
      expect(onDone).not.toHaveBeenCalled();
    },
  );

  it('stays open to retry when the server fails', async () => {
    server.use(deleteHandler(() => apiError(500, 'server_error', 'Falló.')));
    renderDelete();

    await confirm();

    expect(await screen.findByRole('alert')).toHaveTextContent('Falló.');
    expect(
      screen.getByRole('button', { name: 'Eliminar actividad' }),
    ).toBeEnabled();
  });
});

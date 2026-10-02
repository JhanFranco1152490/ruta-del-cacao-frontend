import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { PERMISSIONS } from '@/lib/permissions';
import { apiError, buildFarm, buildSession } from '@/test/factories';
import { apiUrl, municipalitiesHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import { enqueueFarmCreate, enqueueFarmUpdate } from '../farm-queue';
import type { FarmFormValues } from '../schemas';
import { FarmEditorScreen } from './farm-editor-screen';

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const farm: FarmFormValues = {
  name: 'La Esperanza',
  municipality_id: '54518',
  details: '',
  area_hectares: '12.50',
  altitude_masl: '950',
  latitude: '7.8234567',
  longitude: '-72.5123456',
};

let userId: string;

beforeEach(async () => {
  userId = `farm-editor-${crypto.randomUUID()}`;
  // La app lo registra cada vez que el servidor confirma la sesión.
  await recordLogin(userId);
  router.push.mockClear();
  server.use(municipalitiesHandler());
});

function sessionClient(permissions: string[] = []) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, permissions }),
  );
  return queryClient;
}

// `queryClient` compartido entre aperturas = la misma pestaña, sin recargar la página.
function renderEditor(id = 'f1', queryClient = sessionClient()) {
  return renderWithProviders(<FarmEditorScreen id={id} />, { queryClient });
}

const serverFarm = (overrides: Parameters<typeof buildFarm>[0]) =>
  http.get(apiUrl('/api/farms/s1'), () =>
    HttpResponse.json(buildFarm({ id: 's1', ...overrides })),
  );

async function enqueueFailedFarm() {
  await enqueueFarmCreate(userId, 'f1', farm);
  await getOfflineDb(userId).queue.update('f1', {
    status: 'error',
    errorCode: 'duplicate_farm_name',
    errorMessage: 'Ya existe una finca con este nombre.',
  });
}

const save = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Guardar y reenviar' }));

describe('FarmEditorScreen', () => {
  it('prefills the saved farm, including its municipality, and explains the error', async () => {
    await enqueueFailedFarm();
    renderEditor();

    expect(await screen.findByLabelText('Nombre de la finca')).toHaveValue(
      'La Esperanza',
    );
    await screen.findByRole('option', { name: 'Pamplona' });
    expect(screen.getByLabelText('Municipio')).toHaveValue('54518');
    expect(
      screen.getByText(/Ya existe una finca con este nombre\./),
    ).toBeInTheDocument();
  });

  it('saves the correction as pending again and returns to the list', async () => {
    const user = userEvent.setup();
    await enqueueFailedFarm();
    renderEditor();

    const name = await screen.findByLabelText('Nombre de la finca');
    await user.clear(name);
    await user.type(name, 'La Esperanza 2');
    await save(user);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fincas'));
    const item = await getOfflineDb(userId).queue.get('f1');
    expect(item).toMatchObject({
      status: 'pending',
      payload: { id: 'f1', name: 'La Esperanza 2' },
    });
    expect(item).not.toHaveProperty('errorMessage');
  });

  it('asks to wait when the farm is being sent at that moment', async () => {
    const user = userEvent.setup();
    await enqueueFailedFarm();
    renderEditor();
    await screen.findByLabelText('Nombre de la finca');
    await getOfflineDb(userId).queue.update('f1', { status: 'syncing' });

    await save(user);

    expect(
      await screen.findByText(/se está enviando en este momento/),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('explains when the farm is neither pending nor among the person farms', async () => {
    server.use(
      http.get(apiUrl('/api/farms/no-existe'), () =>
        apiError(404, 'not_found', 'No encontrado.'),
      ),
    );
    renderEditor('no-existe');

    expect(
      await screen.findByText('No encontramos esta finca entre las tuyas.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Volver a mis fincas' }),
    ).toHaveAttribute('href', '/fincas');
  });

  it('edits a server farm through the queue with the version it read', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(apiUrl('/api/farms/s1'), () =>
        HttpResponse.json(buildFarm({ id: 's1', version: 5 })),
      ),
    );
    renderEditor('s1');

    const name = await screen.findByLabelText('Nombre de la finca');
    expect(name).toHaveValue('La Esperanza');
    await user.clear(name);
    await user.type(name, 'La Esperanza Alta');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fincas'));
    expect(await getOfflineDb(userId).queue.get('s1')).toMatchObject({
      operation: 'update',
      status: 'pending',
      payload: { name: 'La Esperanza Alta', expected_version: 5 },
    });
  });

  it('shows the current server data after a stale version and resends with it', async () => {
    const user = userEvent.setup();
    await enqueueFarmUpdate(userId, 's1', farm, 2);
    await getOfflineDb(userId).queue.update('s1', {
      status: 'error',
      errorCode: 'stale_version',
      errorMessage: 'La finca cambió en el servidor.',
    });
    server.use(
      http.get(apiUrl('/api/farms/s1'), () =>
        HttpResponse.json(
          buildFarm({ id: 's1', name: 'Nombre de otra persona', version: 4 }),
        ),
      ),
    );
    renderEditor('s1');

    await screen.findByText(/Alguien la modificó mientras tanto/);
    expect(screen.getByText(/^Nombre:/).closest('li')).toHaveTextContent(
      'en el servidor Nombre de otra persona, en tu formulario La Esperanza.',
    );
    await save(user);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fincas'));
    expect(await getOfflineDb(userId).queue.get('s1')).toMatchObject({
      status: 'pending',
      payload: { expected_version: 4 },
    });
  });

  // Lo que se reenvía son todos los campos: un cambio ajeno en un campo poco visible también
  // se reemplazaría, así que debe aparecer en el aviso.
  it('lists every field the other person changed before resending over it', async () => {
    await enqueueFarmUpdate(userId, 's1', farm, 2);
    await getOfflineDb(userId).queue.update('s1', {
      status: 'error',
      errorCode: 'stale_version',
      errorMessage: 'La finca cambió en el servidor.',
    });
    server.use(
      http.get(apiUrl('/api/farms/s1'), () =>
        HttpResponse.json(
          buildFarm({
            id: 's1',
            municipality: { id: '54518', name: 'Pamplona' },
            details: 'Km 4',
            location: { latitude: '7.9000000', longitude: '-72.5123456' },
            version: 4,
          }),
        ),
      ),
    );
    renderEditor('s1');

    await screen.findByText(/Alguien la modificó mientras tanto/);
    const changed = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(changed).toEqual([
      'Detalles: en el servidor Km 4, en tu formulario (vacío).',
      'Latitud: en el servidor 7.9000000, en tu formulario 7.8234567.',
    ]);
  });

  // Bug de la revisión: un conflicto solo se corregía recargando la página. El editor reusaba
  // la finca que había leído antes, aunque el servidor ya tuviera otra versión.
  describe('reopened without reloading the page', () => {
    it('edits again with the version the server has now', async () => {
      const user = userEvent.setup();
      const queryClient = sessionClient();
      server.use(serverFarm({ version: 5 }));
      const first = renderEditor('s1', queryClient);
      await screen.findByLabelText('Nombre de la finca');
      first.unmount();

      // Mientras tanto, la edición anterior se sincronizó: la finca ya va en la versión 6.
      server.use(serverFarm({ version: 6 }));
      renderEditor('s1', queryClient);
      const name = await screen.findByLabelText('Nombre de la finca');
      await user.clear(name);
      await user.type(name, 'Segunda edición');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fincas'));
      expect(await getOfflineDb(userId).queue.get('s1')).toMatchObject({
        payload: { name: 'Segunda edición', expected_version: 6 },
      });
    });

    it('reviews a conflict against the current server data, not an earlier read', async () => {
      const user = userEvent.setup();
      const queryClient = sessionClient();
      // La finca se abrió antes en esta misma pestaña, cuando iba en la versión 2.
      queryClient.setQueryData(
        queryKeys.farms.detail('s1'),
        buildFarm({ id: 's1', name: 'Lectura vieja', version: 2 }),
      );
      await enqueueFarmUpdate(userId, 's1', farm, 2);
      await getOfflineDb(userId).queue.update('s1', {
        status: 'error',
        errorCode: 'stale_version',
        errorMessage: 'La finca cambió en el servidor.',
      });
      server.use(serverFarm({ name: 'Nombre de otra persona', version: 4 }));
      renderEditor('s1', queryClient);

      await screen.findByText(/Alguien la modificó mientras tanto/);
      expect(screen.getByText(/^Nombre:/).closest('li')).toHaveTextContent(
        'en el servidor Nombre de otra persona',
      );
      await save(user);

      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fincas'));
      expect(await getOfflineDb(userId).queue.get('s1')).toMatchObject({
        status: 'pending',
        payload: { expected_version: 4 },
      });
    });
  });

  describe('deleting a farm created by mistake', () => {
    const canDelete = () => sessionClient([PERMISSIONS.FARMS_DELETE]);

    function deleteHandler(
      respond: () => Response = () => new HttpResponse(null, { status: 204 }),
    ) {
      const requests: { version: string | null; body: string }[] = [];
      server.use(
        http.delete(apiUrl('/api/farms/s1'), async ({ request }) => {
          requests.push({
            version: new URL(request.url).searchParams.get('expected_version'),
            body: await request.text(),
          });
          return respond();
        }),
      );
      return requests;
    }

    it('is offered only to whoever can delete farms', async () => {
      server.use(serverFarm({ version: 5 }));
      renderEditor('s1');

      await screen.findByLabelText('Nombre de la finca');
      expect(
        screen.queryByRole('button', { name: 'Eliminar finca' }),
      ).not.toBeInTheDocument();
    });

    it('deletes after confirmation with the version it read, without saving the form', async () => {
      const user = userEvent.setup();
      server.use(serverFarm({ version: 5 }));
      const requests = deleteHandler();
      renderEditor('s1', canDelete());

      await user.click(
        await screen.findByRole('button', { name: 'Eliminar finca' }),
      );
      expect(
        screen.getByRole('heading', {
          name: '¿Eliminar la finca La Esperanza?',
        }),
      ).toBeInTheDocument();
      // Abrir el diálogo no envía el formulario de edición.
      expect(await getOfflineDb(userId).queue.count()).toBe(0);

      const dialog = screen.getByRole('dialog');
      await user.click(
        within(dialog).getByRole('button', { name: 'Eliminar finca' }),
      );

      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fincas'));
      expect(requests).toEqual([{ version: '5', body: '' }]);
    });

    it('says it needs a connection instead of waiting, and never deletes later on its own', async () => {
      const user = userEvent.setup();
      server.use(serverFarm({ version: 5 }));
      const requests = deleteHandler(() => HttpResponse.error());
      renderEditor('s1', canDelete());
      await user.click(
        await screen.findByRole('button', { name: 'Eliminar finca' }),
      );
      // La red se pierde con el diálogo ya abierto.
      onlineManager.setOnline(false);
      try {
        const dialog = screen.getByRole('dialog');
        await user.click(
          within(dialog).getByRole('button', { name: 'Eliminar finca' }),
        );

        expect(await within(dialog).findByRole('alert')).toHaveTextContent(
          'Revisa tu conexión',
        );
        expect(
          within(dialog).getByRole('button', { name: 'Eliminar finca' }),
        ).toBeEnabled();
      } finally {
        cleanup();
        onlineManager.setOnline(true);
      }
      // Se intentó una sola vez: al volver la red no queda nada en espera que borre la finca.
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(requests).toHaveLength(1);
    });

    it('offers to deactivate a farm that has records', async () => {
      const user = userEvent.setup();
      const patches: unknown[] = [];
      server.use(
        serverFarm({ version: 5 }),
        http.patch(apiUrl('/api/farms/s1'), async ({ request }) => {
          patches.push(await request.json());
          return HttpResponse.json(
            buildFarm({ id: 's1', version: 6, is_active: false }),
          );
        }),
      );
      deleteHandler(() =>
        apiError(409, 'farm_has_records', 'La finca tiene registros.'),
      );
      renderEditor('s1', canDelete());

      await user.click(
        await screen.findByRole('button', { name: 'Eliminar finca' }),
      );
      const dialog = screen.getByRole('dialog');
      await user.click(
        within(dialog).getByRole('button', { name: 'Eliminar finca' }),
      );

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Esta finca tiene registros asociados',
      );
      await user.click(
        within(dialog).getByRole('button', { name: 'Desactivar finca' }),
      );

      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fincas'));
      expect(patches).toEqual([{ is_active: false, expected_version: 5 }]);
    });

    it('asks to reopen when someone changed the farm in the meantime', async () => {
      const user = userEvent.setup();
      server.use(serverFarm({ version: 5 }));
      deleteHandler(() => apiError(409, 'stale_version', 'La finca cambió.'));
      renderEditor('s1', canDelete());

      await user.click(
        await screen.findByRole('button', { name: 'Eliminar finca' }),
      );
      const dialog = screen.getByRole('dialog');
      await user.click(
        within(dialog).getByRole('button', { name: 'Eliminar finca' }),
      );

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Alguien cambió esta finca mientras tanto.',
      );
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('without connection', () => {
    beforeEach(() => onlineManager.setOnline(false));
    // Desmontar antes de reconectar: si no, lo que quedó en pausa se reanuda al volver la red y
    // hace peticiones cuando el test ya terminó.
    afterEach(() => {
      cleanup();
      onlineManager.setOnline(true);
    });

    it('explains that editing a server farm needs a connection', async () => {
      renderEditor('s1');

      expect(
        await screen.findByText(/Necesitas conexión para editar esta finca/),
      ).toBeInTheDocument();
    });

    it('still corrects a farm saved on the device', async () => {
      const user = userEvent.setup();
      await enqueueFailedFarm();
      renderEditor();

      const name = await screen.findByLabelText('Nombre de la finca');
      await user.clear(name);
      await user.type(name, 'Corregida sin red');
      await save(user);

      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/fincas'));
      expect(
        (await getOfflineDb(userId).queue.get('f1'))?.payload,
      ).toMatchObject({ name: 'Corregida sin red' });
    });
  });
});

import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
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

function renderEditor(id = 'f1') {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  return renderWithProviders(<FarmEditorScreen id={id} />, { queryClient });
}

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

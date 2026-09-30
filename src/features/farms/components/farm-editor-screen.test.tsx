import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { buildSession } from '@/test/factories';
import { municipalitiesHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { router } from '@/test/router';
import { server } from '@/test/server';

import { enqueueFarmCreate } from '../farm-queue';
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
  server.use(
    municipalitiesHandler([
      { code: '54001', name: 'Cúcuta' },
      { code: '54518', name: 'Pamplona' },
    ]),
  );
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

  it('explains when the farm is no longer pending on the device', async () => {
    renderEditor('no-existe');

    expect(
      await screen.findByText(
        'Esta finca no está pendiente en este teléfono: ya se sincronizó o se descartó.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Volver a mis fincas' }),
    ).toHaveAttribute('href', '/fincas');
  });
});

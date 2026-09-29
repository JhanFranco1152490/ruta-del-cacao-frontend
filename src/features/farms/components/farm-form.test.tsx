import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { buildSession } from '@/test/factories';
import { municipalitiesHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { FarmForm } from './farm-form';

type User = ReturnType<typeof userEvent.setup>;

let userId: string;

beforeEach(() => {
  userId = `farm-form-${crypto.randomUUID()}`;
  server.use(
    municipalitiesHandler([
      { code: '54001', name: 'Cúcuta' },
      { code: '54518', name: 'Pamplona' },
    ]),
  );
});

async function renderForm() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  const result = renderWithProviders(<FarmForm />, { queryClient });
  await screen.findByRole('option', { name: 'Pamplona' });
  return result;
}

async function fillValidFarm(user: User) {
  await user.type(screen.getByLabelText('Nombre de la finca'), 'La Esperanza');
  await user.selectOptions(screen.getByLabelText('Municipio'), '54001');
  await user.type(screen.getByLabelText('Área total (hectáreas)'), '12,5');
  await user.type(screen.getByLabelText('Altitud (m s. n. m.)'), '950');
  await user.type(screen.getByLabelText('Latitud'), '7.8234567');
  await user.type(screen.getByLabelText('Longitud'), '-72.5123456');
}

const save = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Guardar finca' }));

const queuedFarms = () => getOfflineDb(userId).queue.toArray();

describe('FarmForm', () => {
  it('shows Norte de Santander as a fixed department', async () => {
    await renderForm();

    const department = screen.getByLabelText('Departamento');
    expect(department).toHaveValue('Norte de Santander');
    expect(department).toHaveAttribute('readonly');
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(
      screen.getByText(
        'Vereda u otros detalles de ubicación (por ejemplo, km)',
      ),
    ).toBeInTheDocument();
  });

  it('blocks saving and explains each missing required field', async () => {
    const user = userEvent.setup();
    await renderForm();

    await save(user);

    expect(
      await screen.findByText('Ingresa el nombre de la finca.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Selecciona un municipio.')).toBeInTheDocument();
    expect(
      screen.getAllByText('La georreferenciación es obligatoria'),
    ).toHaveLength(2);
    expect(screen.getByLabelText('Nombre de la finca')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(await queuedFarms()).toEqual([]);
  });

  it('saves the farm on the device as pending and confirms it', async () => {
    const user = userEvent.setup();
    await renderForm();

    await fillValidFarm(user);
    await save(user);

    const title = await screen.findByRole('heading', {
      name: 'Finca registrada exitosamente',
    });
    expect(title).toHaveFocus();
    expect(screen.getByText('Pendiente de sincronización')).toBeInTheDocument();

    const [item] = await queuedFarms();
    expect(item).toMatchObject({
      resource: 'farms',
      operation: 'create',
      status: 'pending',
      payload: {
        id: item.id,
        name: 'La Esperanza',
        department_id: '54',
        municipality_id: '54001',
        area_hectares: '12.5',
        altitude_masl: 950,
      },
    });
  });

  it('starts a new farm with its own id after registering one', async () => {
    const user = userEvent.setup();
    await renderForm();

    await fillValidFarm(user);
    await save(user);
    await user.click(
      await screen.findByRole('button', { name: 'Registrar otra finca' }),
    );

    expect(screen.getByLabelText('Nombre de la finca')).toHaveValue('');
    await fillValidFarm(user);
    await save(user);
    await screen.findByRole('heading', {
      name: 'Finca registrada exitosamente',
    });

    const items = await queuedFarms();
    expect(new Set(items.map((item) => item.id)).size).toBe(2);
  });
});

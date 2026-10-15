import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { clearAdapters, registerAdapter } from '@/lib/offline/sync-queue';
import { PERMISSIONS } from '@/lib/permissions';
import {
  apiError,
  buildAgriculturalActivity,
  buildAgriculturalInput,
  buildInputStock,
  buildSession,
} from '@/test/factories';
import {
  agriculturalInputsHandler,
  apiUrl,
  inputStocksHandler,
} from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation, router } from '@/test/router';
import { server } from '@/test/server';

import type { AgriculturalActivity } from '../api';
import {
  type CompletionPayload,
  completionQueueId,
  enqueueCompletion,
} from '../completion-queue';
import { completionSyncAdapter } from '../sync-adapter';
vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { CompletionScreen } from './completion-screen';

// Jueves 22 de octubre de 2026, a mediodía en Bogotá.
const NOW = new Date('2026-10-22T17:00:00Z');

const urea = buildAgriculturalInput({ id: 'urea', name: 'Urea 46 %' });
const copper = buildAgriculturalInput({
  id: 'copper',
  name: 'Óxido de cobre',
  unit: 'g',
  package_type: null,
  package_size: null,
});
const lime = buildAgriculturalInput({
  id: 'lime',
  name: 'Cal agrícola',
  is_active: false,
});

let userId: string;

const activityHandler = (overrides: Partial<AgriculturalActivity> = {}) =>
  http.get(apiUrl('/api/agricultural-activities/a1'), () =>
    HttpResponse.json(
      buildAgriculturalActivity({
        scheduled_date: '2026-10-20',
        created_at: '2026-10-08T09:00:00-05:00',
        ...overrides,
      }),
    ),
  );

beforeEach(async () => {
  userId = `completion-screen-${crypto.randomUUID()}`;
  vi.clearAllMocks();
  resetLocation();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  // Con el reloj de la prueba: la sesión se confirmó hoy, dentro de la ventana sin conexión.
  await recordLogin(userId);
  server.use(
    activityHandler(),
    agriculturalInputsHandler([urea, copper, lime]),
    inputStocksHandler([
      buildInputStock({ input_id: 'urea', quantity: '170.000' }),
    ]),
  );
});

afterEach(() => {
  clearAdapters();
  vi.useRealTimers();
  vi.restoreAllMocks();
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
      ],
      ...user,
    }),
  );
  renderWithProviders(<CompletionScreen activityId="a1" />, { queryClient });
}

const form = () => screen.findByRole('button', { name: /^Guardar/ });
const addInput = () =>
  userEvent.click(screen.getByRole('button', { name: 'Agregar insumo' }));
const field = (name: string) => screen.getByLabelText(name);
// Cada insumo es un grupo con su título ("Insumo 1"); dentro, sus campos no repiten el número.
const row = (number: number) =>
  screen.getByRole('group', { name: `Insumo ${number}` });
const picker = (number: number) => within(row(number)).getByLabelText('Insumo');
const quantityOf = (number: number) =>
  within(row(number)).getByLabelText(/^Cantidad/);
// Se escribe parte del nombre en el mismo campo y se elige de lo que queda en la lista.
const chooseInput = async (number: number, typed: string, name: string) => {
  await userEvent.click(picker(number));
  await userEvent.type(picker(number), typed);
  await userEvent.click(await screen.findByRole('option', { name }));
};
const offered = async (number: number) => {
  await userEvent.click(picker(number));
  const options = await screen.findAllByRole('option');
  return options.map((option) => option.textContent);
};
const setQuantity = (number: number, value: string) =>
  fireEvent.change(quantityOf(number), { target: { value } });
const save = async () => userEvent.click(await form());
const confirm = async () => {
  const dialog = await screen.findByRole('dialog');
  await userEvent.click(
    within(dialog).getByRole('button', { name: /^Guardar/ }),
  );
};
const queuedPayload = async () =>
  (await getOfflineDb(userId).queue.get(completionQueueId('a1')))?.payload as
    CompletionPayload | undefined;

describe('CompletionScreen', () => {
  it('offers an employee of several farms only the inputs of the farm of the activity', async () => {
    const requests: URLSearchParams[] = [];
    server.use(agriculturalInputsHandler([urea], requests));
    renderScreen({
      all_farms: false,
      farms: [
        { id: 'f1', name: 'Finca de prueba', is_active: true },
        { id: 'f2', name: 'Catalina', is_active: true },
      ],
    });
    await form();
    await addInput();

    const options = await offered(1);

    expect(options).toHaveLength(1);
    expect(options[0]).toContain('Urea 46 %');
    // Pide los de la finca de la parcela, aunque trabaje en dos.
    expect(requests.at(-1)?.get('farm')).toBe('f1');
  });

  it('shows the activity that is going to be recorded', async () => {
    renderScreen();

    const card = await screen.findByRole('region', { name: 'Actividad' });
    expect(
      within(card).getByRole('heading', { name: 'Fertilización · P-03' }),
    ).toBeInTheDocument();
    expect(card).toHaveTextContent('martes 20 de octubre de 2026');
    expect(card).toHaveTextContent('Cuenta de prueba');
    expect(card).toHaveTextContent('Finca de prueba');
    expect(within(card).getByText('Retrasada · 2 días')).toBeInTheDocument();
    expect(field('Fecha de realización')).toHaveValue('2026-10-22');
  });

  it('records a labor without inputs after confirming what will be saved', async () => {
    renderScreen();

    await save();

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(
      'Vas a registrar la labor Fertilización de P-03 como realizada el 22 de octubre de 2026, sin insumos. Después no se podrá modificar.',
    );
    expect(await queuedPayload()).toBeUndefined();

    await confirm();

    expect(
      await screen.findByText('Realización registrada'),
    ).toBeInTheDocument();
    expect(router.replace).toHaveBeenCalledWith('/actividades');
    expect(await queuedPayload()).toEqual({
      request: {
        done_date: '2026-10-22',
        inputs: [],
        captured_at: NOW.toISOString(),
      },
      label: 'Fertilización · P-03',
    });
  });

  it('records the inputs that were used, each with its quantity', async () => {
    renderScreen();
    await form();

    await addInput();
    await chooseInput(1, 'ure', 'Urea 46 %');
    setQuantity(1, '100');
    await addInput();
    await chooseInput(2, 'cobre', 'Óxido de cobre');
    setQuantity(2, '2,5');

    // El equivalente en empaques y las existencias de la finca, como referencia.
    expect(screen.getByText('100 kg · 2 bultos')).toBeInTheDocument();
    expect(screen.getByText('Hay 170 kg · 3,4 bultos')).toBeInTheDocument();
    expect(
      screen.getByText('Sin movimientos en esta finca'),
    ).toBeInTheDocument();
    expect(within(row(2)).getByLabelText('Cantidad (g)')).toBeInTheDocument();
    expect(picker(1)).toHaveValue('Urea 46 %');

    await save();

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'con 100 kg de Urea 46 % (2 bultos) y 2,5 g de Óxido de cobre, que se descuentan del inventario de la finca.',
    );

    await confirm();

    await waitFor(async () =>
      expect((await queuedPayload())?.request.inputs).toEqual([
        { input_id: 'urea', quantity: '100' },
        { input_id: 'copper', quantity: '2.5' },
      ]),
    );
  });

  it('lets the quantity pass what the farm has: the labor was already done', async () => {
    renderScreen();
    await form();
    await addInput();
    await chooseInput(1, 'urea', 'Urea 46 %');
    setQuantity(1, '500');

    await save();
    await confirm();

    await waitFor(async () =>
      expect((await queuedPayload())?.request.inputs).toEqual([
        { input_id: 'urea', quantity: '500' },
      ]),
    );
  });

  it('offers only the active inputs, and not twice the same one', async () => {
    renderScreen();
    await form();
    await addInput();
    await addInput();
    await chooseInput(1, 'urea', 'Urea 46 %');

    expect(await offered(2)).toEqual([
      'Urea 46 % · Ya en la lista',
      'Óxido de cobre',
    ]);
    expect(
      screen.getByRole('option', { name: 'Urea 46 % · Ya en la lista' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('searches and chooses the input in one field, without accents or capitals', async () => {
    renderScreen();
    await form();
    await addInput();
    expect(within(row(1)).getAllByRole('combobox')).toHaveLength(1);

    await userEvent.click(picker(1));
    await userEvent.type(picker(1), 'OXIDO');

    expect(
      (await screen.findAllByRole('option')).map(
        (option) => option.textContent,
      ),
    ).toEqual(['Óxido de cobre']);

    await userEvent.click(
      screen.getByRole('option', { name: 'Óxido de cobre' }),
    );

    expect(picker(1)).toHaveValue('Óxido de cobre');
  });

  it('says that no active input matches what was typed', async () => {
    renderScreen();
    await form();
    await addInput();

    await userEvent.click(picker(1));
    await userEvent.type(picker(1), 'zzz');

    expect(
      await screen.findByText('Ningún insumo activo coincide.'),
    ).toBeInTheDocument();
  });

  it('numbers each input once, in its title, and not in every field', async () => {
    renderScreen();
    await form();
    await addInput();

    expect(within(row(1)).getAllByText(/Insumo 1/)).toHaveLength(1);
    expect(within(row(1)).getByLabelText('Insumo')).toBeInTheDocument();
    expect(within(row(1)).getByLabelText('Cantidad')).toBeInTheDocument();
  });

  it('removes an input from the list', async () => {
    renderScreen();
    await form();
    await addInput();
    await chooseInput(1, 'urea', 'Urea 46 %');

    await userEvent.click(
      screen.getByRole('button', { name: 'Quitar insumo 1' }),
    );

    expect(
      screen.queryByRole('group', { name: 'Insumo 1' }),
    ).not.toBeInTheDocument();
  });

  it('marks an input without quantity and saves nothing', async () => {
    renderScreen();
    await form();
    await addInput();
    await chooseInput(1, 'urea', 'Urea 46 %');

    await save();

    await waitFor(() =>
      expect(quantityOf(1)).toHaveAccessibleDescription(
        'Indique la cantidad del insumo',
      ),
    );
    expect(
      screen.getByText('Revisa el dato marcado antes de guardar.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await queuedPayload()).toBeUndefined();
  });

  it('rejects a future date and one before the activity was scheduled', async () => {
    renderScreen();
    await form();
    expect(field('Fecha de realización')).toHaveAttribute('max', '2026-10-22');

    fireEvent.change(field('Fecha de realización'), {
      target: { value: '2026-10-23' },
    });
    await save();
    await waitFor(() =>
      expect(field('Fecha de realización')).toHaveAccessibleDescription(
        'La fecha no puede ser futura',
      ),
    );

    fireEvent.change(field('Fecha de realización'), {
      target: { value: '2026-10-07' },
    });
    await save();
    await waitFor(() =>
      expect(field('Fecha de realización')).toHaveAccessibleDescription(
        'La fecha no puede ser anterior a la programación de la actividad (8 de octubre de 2026)',
      ),
    );
    expect(await queuedPayload()).toBeUndefined();
  });

  it('goes back from the confirmation without saving, keeping what was written', async () => {
    renderScreen();
    await form();
    fireEvent.change(field('Fecha de realización'), {
      target: { value: '2026-10-21' },
    });
    await save();

    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Volver',
      }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(field('Fecha de realización')).toHaveValue('2026-10-21');
    expect(await queuedPayload()).toBeUndefined();
  });

  it('says that the record will be saved in the phone without a connection', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    expect(
      await screen.findByRole('button', { name: 'Guardar en el teléfono' }),
    ).toBeEnabled();
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
  });

  it('asks no inputs for an inventory, which only reminds the count', async () => {
    server.use(activityHandler({ activity_type: 'inventory' }));
    renderScreen();
    await form();

    expect(
      screen.queryByRole('button', { name: 'Agregar insumo' }),
    ).not.toBeInTheDocument();

    await save();
    await confirm();

    await waitFor(async () =>
      expect((await queuedPayload())?.request.inputs).toEqual([]),
    );
  });

  it('sends the record to the server and goes back to the activities', async () => {
    const received: unknown[] = [];
    server.use(
      http.post(
        apiUrl('/api/agricultural-activities/a1/completion'),
        async ({ request }) => {
          received.push(await request.json());
          return HttpResponse.json(
            buildAgriculturalActivity({ status: 'done' }),
          );
        },
      ),
    );
    registerAdapter(completionSyncAdapter);
    renderScreen();

    await save();
    await confirm();

    expect(
      await screen.findByText('Realización registrada'),
    ).toBeInTheDocument();
    await waitFor(() => expect(received).toHaveLength(1));
    expect(received).toEqual([
      { done_date: '2026-10-22', inputs: [], captured_at: NOW.toISOString() },
    ]);
    await waitFor(async () => expect(await queuedPayload()).toBeUndefined());
  });

  it('goes back to the calendar view it was opened from', async () => {
    mockLocation.search = `origen=${encodeURIComponent('/actividades?vista=semana&finca=f1')}`;
    renderScreen();

    expect(
      await screen.findByRole('link', { name: 'Cancelar' }),
    ).toHaveAttribute('href', '/actividades?vista=semana&finca=f1');
    await save();
    await confirm();

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        '/actividades?vista=semana&finca=f1',
      ),
    );
  });

  it('says in the notice that the record waits on the device without a connection', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderScreen();

    await save();
    await confirm();

    expect(
      await screen.findByText('Se enviará cuando haya conexión.'),
    ).toBeInTheDocument();
  });

  describe('what cannot be recorded', () => {
    it('says that a done activity is not modified', async () => {
      server.use(activityHandler({ status: 'done', done_date: '2026-10-20' }));
      renderScreen();

      expect(
        await screen.findByRole('heading', {
          name: 'Esta actividad ya fue registrada como realizada.',
        }),
      ).toBeInTheDocument();
    });

    it('says that a monitoring is recorded in the health module', async () => {
      server.use(
        activityHandler({ activity_type: 'phytosanitary_monitoring' }),
      );
      renderScreen();

      expect(
        await screen.findByText(
          'El registro del monitoreo se habilita con el módulo de sanidad.',
        ),
      ).toBeInTheDocument();
    });

    it('says that the activity no longer exists', async () => {
      server.use(
        http.get(apiUrl('/api/agricultural-activities/a1'), () =>
          apiError(404, 'not_found', 'La actividad no existe.'),
        ),
      );
      renderScreen();

      expect(
        await screen.findByRole('heading', {
          name: 'Esta actividad ya no existe.',
        }),
      ).toBeInTheDocument();
    });
  });

  describe('a record that is already in the device', () => {
    const payload: CompletionPayload = {
      request: {
        done_date: '2026-10-21',
        inputs: [
          { input_id: 'urea', quantity: '100' },
          { input_id: 'lime', quantity: '20' },
        ],
        captured_at: '2026-10-21T20:00:00.000Z',
      },
      label: 'Fertilización · P-03',
    };

    it('says that it is still waiting instead of offering to record it again', async () => {
      await enqueueCompletion(userId, 'a1', payload);
      renderScreen();

      expect(
        await screen.findByRole('heading', {
          name: 'Esta realización ya está guardada.',
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^Guardar/ }),
      ).not.toBeInTheDocument();
    });

    it('opens what the server rejected, marks the input that is gone and sends the correction', async () => {
      await enqueueCompletion(userId, 'a1', payload);
      await getOfflineDb(userId).queue.update(completionQueueId('a1'), {
        status: 'error',
        errorCode: 'input_inactive',
        errorMessage:
          'Este insumo ya no está disponible. Elige otro del catálogo.',
        errorData: { input_ids: ['lime'] },
      });
      renderScreen();

      expect(
        await screen.findByRole('heading', { name: 'Corregir realización' }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
        'No se pudo sincronizar: Este insumo ya no está disponible. Elige otro del catálogo.',
      );
      // Lo capturado sigue ahí; el insumo que ya no sirve hay que volver a elegirlo.
      expect(field('Fecha de realización')).toHaveValue('2026-10-21');
      expect(picker(1)).toHaveValue('Urea 46 %');
      expect(picker(2)).toHaveValue('');
      expect(picker(2)).toHaveAccessibleDescription(
        'Este insumo ya no está disponible. Elige otro del catálogo.',
      );
      expect(quantityOf(2)).toHaveValue('20');

      await chooseInput(2, 'cobre', 'Óxido de cobre');
      await save();
      await confirm();

      await waitFor(async () =>
        expect(
          await getOfflineDb(userId).queue.get(completionQueueId('a1')),
        ).toMatchObject({
          status: 'pending',
          payload: {
            request: {
              done_date: '2026-10-21',
              inputs: [
                { input_id: 'urea', quantity: '100' },
                { input_id: 'copper', quantity: '20' },
              ],
            },
          },
        }),
      );
    });

    it('does not let save a correction whose inputs cannot be shown without the catalog', async () => {
      await enqueueCompletion(userId, 'a1', payload);
      await getOfflineDb(userId).queue.update(completionQueueId('a1'), {
        status: 'error',
        errorCode: 'validation_error',
        errorMessage: 'Los datos enviados no son válidos.',
      });
      // Sin red y sin copia del catálogo en el dispositivo.
      server.use(
        http.get(apiUrl('/api/agricultural-inputs'), () =>
          HttpResponse.error(),
        ),
      );
      renderScreen();

      const saveButton = await form();
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveAccessibleDescription(
        'Este registro tiene insumos y el catálogo no está en este dispositivo. Necesitas conexión una vez para cargarlo y poder corregirlo.',
      );
    });
  });
});

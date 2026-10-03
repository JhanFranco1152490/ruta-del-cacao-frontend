import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { onlineManager } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchMunicipalities } from '@/lib/api/municipalities';
import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { recordLogin } from '@/lib/offline/session-clock';
import { buildSession } from '@/test/factories';
import { apiUrl, municipalitiesHandler } from '@/test/handlers';
import { installFakeGps, restoreGeolocation } from '@/test/fake-geolocation';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { FarmForm } from './farm-form';

type User = ReturnType<typeof userEvent.setup>;

let userId: string;

beforeEach(async () => {
  userId = `farm-form-${crypto.randomUUID()}`;
  // La app lo registra cada vez que el servidor confirma la sesión.
  await recordLogin(userId);
  server.use(municipalitiesHandler());
});

async function renderForm() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ id: userId }));
  const result = renderWithProviders(<FarmForm />, { queryClient });
  await screen.findByRole('option', { name: 'Pamplona' });
  return result;
}

// Pegar en vez de teclear: mismos eventos de entrada para el formulario, sin el costo de un
// evento por tecla (el test que registra dos fincas se acercaba al límite de tiempo).
async function fillField(user: User, label: string, text: string) {
  await user.click(screen.getByLabelText(label));
  await user.paste(text);
}

async function fillValidFarm(user: User) {
  await fillField(user, 'Nombre de la finca', 'La Esperanza');
  await user.selectOptions(screen.getByLabelText('Municipio'), '54001');
  await fillField(user, 'Área total (hectáreas)', '12,5');
  await fillField(user, 'Altitud (m s. n. m.)', '950');
  await fillField(user, 'Latitud', '7.8234567');
  await fillField(user, 'Longitud', '-72.5123456');
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

  it('tells the altitude the chosen municipality reaches, and blocks one outside it', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.selectOptions(screen.getByLabelText('Municipio'), '54518');
    expect(
      screen.getByText('En Pamplona el terreno va de 1450 a 3902 m.'),
    ).toBeInTheDocument();

    await fillValidFarm(user);
    await user.selectOptions(screen.getByLabelText('Municipio'), '54518');
    await save(user);

    expect(
      await screen.findByText(
        /La altitud no corresponde a Pamplona: el terreno del municipio va de 1450 a 3902 m/,
      ),
    ).toBeInTheDocument();
    expect(await queuedFarms()).toHaveLength(0);
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

  it('leaves the connection state to the header while there is a connection', async () => {
    await renderForm();

    expect(
      screen.queryByText('Sin registros pendientes de sincronización.'),
    ).not.toBeInTheDocument();
  });

  it('warns above the form that the farm stays on the device without a connection', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      await renderForm();

      expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    } finally {
      onLine.mockRestore();
    }
  });

  it('blocks saving once the offline session window has expired', async () => {
    const user = userEvent.setup();
    await recordLogin(userId, Date.now() - 8 * 24 * 60 * 60 * 1000);
    await renderForm();

    const button = screen.getByRole('button', { name: 'Guardar finca' });
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveAccessibleDescription(
      /Pasaron más de 7 días sin confirmar tu sesión/,
    );

    await fillValidFarm(user);
    await user.click(button);
    expect(await queuedFarms()).toEqual([]);
  });

  it('tells when the saved farm reached the server', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillValidFarm(user);
    await save(user);
    await screen.findByRole('heading', {
      name: 'Finca registrada exitosamente',
    });

    // La cola la envió con éxito y la retiró.
    const [item] = await queuedFarms();
    await getOfflineDb(userId).queue.delete(item.id);

    expect(
      await screen.findByText('ya quedó guardada en el servidor.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('offers to correct a saved farm the server rejected', async () => {
    const user = userEvent.setup();
    await renderForm();
    await fillValidFarm(user);
    await save(user);
    await screen.findByRole('heading', {
      name: 'Finca registrada exitosamente',
    });

    const [item] = await queuedFarms();
    await getOfflineDb(userId).queue.update(item.id, {
      status: 'error',
      errorMessage: 'Ya existe una finca con este nombre.',
    });

    expect(
      await screen.findByText(/Ya existe una finca con este nombre\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Corregir finca' }),
    ).toHaveAttribute('href', `/fincas/editar?id=${item.id}`);
  });

  // Puntos conocidos del catálogo geográfico (MGN 2025 del DANE).
  describe('location in Norte de Santander', () => {
    const CUCUTA = { latitude: '7.8939', longitude: '-72.5078' };
    const PAMPLONA = { latitude: '7.3756', longitude: '-72.648' };
    afterEach(restoreGeolocation);

    // El GPS responde con el punto dado y buena precisión, así que la captura termina enseguida.
    function gpsAt({ latitude, longitude }: typeof CUCUTA) {
      const gps = installFakeGps();
      gps.geolocation.watchPosition.mockImplementation((onSuccess) => {
        onSuccess({
          coords: {
            latitude: Number(latitude),
            longitude: Number(longitude),
            accuracy: 5,
          },
        } as GeolocationPosition);
        return 1;
      });
    }

    async function typePoint(
      user: User,
      { latitude, longitude }: typeof CUCUTA,
    ) {
      await fillField(user, 'Latitud', latitude);
      await fillField(user, 'Longitud', longitude);
    }

    it('rejects a point outside the department and keeps the farm off the queue', async () => {
      const user = userEvent.setup();
      await renderForm();
      await fillValidFarm(user);
      await user.clear(screen.getByLabelText('Latitud'));
      await fillField(user, 'Latitud', '10.5');

      await save(user);

      expect(
        await screen.findByText(
          'La ubicación está fuera de Norte de Santander',
        ),
      ).toBeInTheDocument();
      expect(await queuedFarms()).toEqual([]);
    });

    it('warns without blocking when the point is in another municipality', async () => {
      const user = userEvent.setup();
      await renderForm();
      await fillValidFarm(user);
      await user.clear(screen.getByLabelText('Latitud'));
      await user.clear(screen.getByLabelText('Longitud'));
      await typePoint(user, PAMPLONA);

      expect(
        await screen.findByText(
          'El punto parece estar en Pamplona, ¿confirmas Cúcuta?',
        ),
      ).toBeInTheDocument();

      await save(user);
      expect(
        await screen.findByRole('heading', {
          name: 'Finca registrada exitosamente',
        }),
      ).toBeInTheDocument();
    });

    it('switches to the municipality of the point when asked', async () => {
      const user = userEvent.setup();
      await renderForm();
      await user.selectOptions(screen.getByLabelText('Municipio'), '54001');
      await typePoint(user, PAMPLONA);

      await user.click(
        await screen.findByRole('button', { name: 'Cambiar a Pamplona' }),
      );

      expect(screen.getByLabelText('Municipio')).toHaveValue('54518');
      expect(
        screen.queryByText(/El punto parece estar en/),
      ).not.toBeInTheDocument();
    });

    it('fills an empty municipality from the GPS point and says so', async () => {
      const user = userEvent.setup();
      gpsAt(CUCUTA);
      await renderForm();
      // Los contornos cargan aparte: se espera a que estén antes de capturar.
      await user.selectOptions(screen.getByLabelText('Municipio'), '54518');
      await screen.findByText(/Encuadre:/);
      await user.selectOptions(screen.getByLabelText('Municipio'), '');

      await user.click(screen.getByRole('button', { name: 'Capturar GPS' }));

      expect(screen.getByLabelText('Municipio')).toHaveValue('54001');
      expect(
        screen.getByText(
          'Elegimos Cúcuta como municipio según la ubicación del GPS. Cámbialo si no corresponde.',
        ),
      ).toBeInTheDocument();
    });

    it('never replaces a municipality the person chose with the GPS one', async () => {
      const user = userEvent.setup();
      gpsAt(CUCUTA);
      await renderForm();
      await user.selectOptions(screen.getByLabelText('Municipio'), '54518');
      await screen.findByText(/Encuadre:/);

      await user.click(screen.getByRole('button', { name: 'Capturar GPS' }));

      expect(screen.getByLabelText('Municipio')).toHaveValue('54518');
      expect(
        await screen.findByText(
          'El punto parece estar en Cúcuta, ¿confirmas Pamplona?',
        ),
      ).toBeInTheDocument();
    });

    it('frames the chosen municipality only while there is no point', async () => {
      const user = userEvent.setup();
      await renderForm();

      await user.selectOptions(screen.getByLabelText('Municipio'), '54518');
      expect(await screen.findByText(/Encuadre:/)).toBeInTheDocument();

      await typePoint(user, PAMPLONA);
      expect(screen.queryByText(/Encuadre:/)).not.toBeInTheDocument();
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

    // Guardar en el dispositivo no usa la red: antes quedaba "Guardando…" hasta volver la señal.
    it('saves the farm on the device right away', async () => {
      const user = userEvent.setup();
      // El catálogo se descargó alguna vez con señal; ahora la red no responde.
      await fetchMunicipalities();
      server.use(
        http.get(apiUrl('/api/catalogs/municipalities'), () =>
          HttpResponse.error(),
        ),
      );
      await renderForm();

      await fillValidFarm(user);
      await save(user);

      expect(
        await screen.findByRole('heading', {
          name: 'Finca registrada exitosamente',
        }),
      ).toBeInTheDocument();
      expect(await queuedFarms()).toHaveLength(1);
    });
  });
});

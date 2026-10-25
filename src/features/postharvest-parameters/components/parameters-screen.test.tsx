import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { PERMISSIONS } from '@/lib/permissions';
import { buildParameters, buildSession } from '@/test/factories';
import { apiUrl, csrfHandler, parametersHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { ParametersScreen } from './parameters-screen';

const PATH = '/api/postharvest-parameters';
const CHANGE = [PERMISSIONS.PARAMETERS_VIEW, PERMISSIONS.PARAMETERS_CHANGE];

const custom = (overrides = {}) =>
  buildParameters({
    is_default: false,
    version: 3,
    updated_at: '2026-10-18T14:00:00Z',
    updated_by: { id: 'u1', full_name: 'Ana Gómez' },
    ...overrides,
  });

let userId: string;

beforeEach(() => {
  userId = `parameters-screen-${crypto.randomUUID()}`;
  server.use(csrfHandler, parametersHandler(buildParameters()));
});

function renderScreen({
  permissions = CHANGE,
  superuser = false,
  searchParams = '',
}: {
  permissions?: string[];
  superuser?: boolean;
  searchParams?: string;
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: userId, is_superuser: superuser, permissions }),
  );
  return renderWithProviders(<ParametersScreen />, {
    queryClient,
    searchParams,
  });
}

// La fila de un parámetro, por su nombre.
const rowOf = async (title: string) =>
  (await screen.findByRole('heading', { name: title })).parentElement!
    .parentElement!;

describe('ParametersScreen', () => {
  it('shows the 15 values of the baseline with their units, and nothing changed', async () => {
    renderScreen();

    const entry = await rowOf('Humedad de entrada');
    const [min, max] = within(entry).getAllByRole('textbox');
    expect(min).toHaveValue('55,0');
    expect(max).toHaveValue('60,0');
    expect(within(entry).getByLabelText('Mínimo (%)')).toBe(min);
    expect(within(entry).getAllByText(/Línea base: (55|60) %/)).toHaveLength(2);
    expect(
      within(await rowOf('Días estimados')).getByLabelText('Máximo (días)'),
    ).toHaveValue('7');
    expect(
      within(await rowOf('Secado lento · por estancamiento')).getByLabelText(
        'En (horas)',
      ),
    ).toHaveValue('48');
    expect(screen.getAllByRole('textbox')).toHaveLength(15);
    expect(screen.queryByText('Cambiado')).not.toBeInTheDocument();
    expect(screen.getByText('Usas la línea base.')).toBeInTheDocument();
    expect(
      screen.getByText(/Se aplican a todas tus fincas/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    ).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Restablecer línea base' }),
    ).not.toBeInTheDocument();
  });

  it('marks what changed, enables saving and discards back to the loaded values', async () => {
    renderScreen();

    const row = await rowOf('Secado lento · por duración');
    const day = within(row).getByLabelText('Desde el día (días)');
    await userEvent.clear(day);
    await userEvent.type(day, '9');

    expect(within(row).getByText('Cambiado')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    ).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(day).toHaveValue('8'));
    expect(screen.queryByText('Cambiado')).not.toBeInTheDocument();
  });

  it('saves the 15 values with the version read, says so and shows them as custom', async () => {
    const bodies: Record<string, unknown>[] = [];
    let saved = false;
    server.use(
      http.put(apiUrl(PATH), async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        saved = true;
        return HttpResponse.json(custom());
      }),
      http.get(apiUrl(PATH), () =>
        HttpResponse.json(
          saved
            ? custom({
                values: { ...buildParameters().values, slow_duration_day: 9 },
              })
            : buildParameters(),
        ),
      ),
    );
    renderScreen();

    const day = within(
      await rowOf('Secado lento · por duración'),
    ).getByLabelText('Desde el día (días)');
    await userEvent.clear(day);
    await userEvent.type(day, '9');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await screen.findByText('Configuración guardada'),
    ).toBeInTheDocument();
    expect(bodies[0]).toMatchObject({
      expected_version: 0,
      values: {
        slow_duration_day: 9,
        entry_moisture_min_pct: '55.0',
        estimated_days_max: 7,
      },
    });
    expect(
      await screen.findByText(
        'Personalizados · actualizados el 18 oct por Ana Gómez.',
      ),
    ).toBeInTheDocument();
    expect(
      within(await rowOf('Secado lento · por duración')).getByText('Cambiado'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Restablecer línea base' }),
    ).toBeInTheDocument();
  });

  it('puts the minimum error next to the field and saves nothing', async () => {
    const puts: unknown[] = [];
    server.use(
      http.put(apiUrl(PATH), async ({ request }) => {
        puts.push(await request.json());
        return HttpResponse.json(custom());
      }),
    );
    renderScreen();

    const row = await rowOf('Humedad de entrada');
    const min = within(row).getByLabelText('Mínimo (%)');
    await userEvent.clear(min);
    await userEvent.type(min, '62');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await within(row).findByText(
        'El mínimo no puede ser mayor que el máximo',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Revisa los valores marcados.'),
    ).toBeInTheDocument();
    expect(puts).toEqual([]);
  });

  it('marks out of range numbers and missing values', async () => {
    renderScreen();

    const days = within(await rowOf('Secado acelerado')).getByLabelText(
      'Hasta el día (días)',
    );
    await userEvent.clear(days);
    await userEvent.type(days, '0');
    const dropped = within(
      await rowOf('Secado lento · por estancamiento'),
    ).getByLabelText('Baja menos de (%)');
    await userEvent.clear(dropped);
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await screen.findByText('Debe ser un número entero mayor que cero.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Campo obligatorio')).toBeInTheDocument();
  });

  it('loads the current values when someone else changed them', async () => {
    let answered = false;
    server.use(
      http.put(apiUrl(PATH), () => {
        answered = true;
        return HttpResponse.json(
          {
            detail: 'Otra persona los cambió.',
            code: 'stale_version',
            fields: {},
            current: custom(),
          },
          { status: 409 },
        );
      }),
      http.get(apiUrl(PATH), () =>
        HttpResponse.json(
          answered
            ? custom({
                values: {
                  ...buildParameters().values,
                  overdried_moisture_pct: '5.5',
                },
              })
            : buildParameters(),
        ),
      ),
    );
    renderScreen();

    const day = within(await rowOf('Secado acelerado')).getByLabelText(
      'Hasta el día (días)',
    );
    await userEvent.clear(day);
    await userEvent.type(day, '4');
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    );

    expect(
      await screen.findByText(
        'Otra persona cambió los parámetros. Revisa los valores actuales antes de guardar.',
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(
          screen.getByRole('heading', { name: 'Sobresecado' }).parentElement!
            .parentElement!,
        ).getByLabelText('Por debajo de (%)'),
      ).toHaveValue('5,5'),
    );
  });

  describe('resetting the baseline', () => {
    beforeEach(() => {
      server.use(parametersHandler(custom()));
    });

    it('asks first, says the unsaved changes are lost, and restores the baseline', async () => {
      const bodies: unknown[] = [];
      server.use(
        http.post(apiUrl(`${PATH}/reset`), async ({ request }) => {
          bodies.push(await request.json());
          return HttpResponse.json(buildParameters());
        }),
      );
      renderScreen();

      const day = within(await rowOf('Secado acelerado')).getByLabelText(
        'Hasta el día (días)',
      );
      await userEvent.clear(day);
      await userEvent.type(day, '4');
      await userEvent.click(
        screen.getByRole('button', { name: 'Restablecer línea base' }),
      );

      expect(
        await screen.findByText('¿Restablecer la línea base?'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Los cambios sin guardar se pierden.'),
      ).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: 'Restablecer' }),
      );

      expect(
        await screen.findByText('Valores restablecidos a la línea base'),
      ).toBeInTheDocument();
      expect(bodies).toEqual([{ expected_version: 3 }]);
    });
  });

  it('shows who can only look the values as data, with who can change them', async () => {
    renderScreen({ permissions: [PERMISSIONS.PARAMETERS_VIEW] });

    expect(
      await screen.findByText(
        'Solo el productor y quien él autorice pueden cambiar estos valores.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Humedad de entrada')).toBeInTheDocument();
  });

  it('marks in the read only view what is not the baseline', async () => {
    server.use(
      parametersHandler(
        custom({
          values: { ...buildParameters().values, slow_duration_day: 9 },
        }),
      ),
    );
    renderScreen({ permissions: [PERMISSIONS.PARAMETERS_VIEW] });

    await screen.findByText('Secado lento · por duración');
    expect(screen.getAllByText('Cambiado')).toHaveLength(1);
    expect(screen.getByText('9 días')).toBeInTheDocument();
  });

  it('shows the saved copy without a connection, as data, with its notice', async () => {
    await getOfflineDb(userId).cache.put({
      key: 'postharvest-parameters',
      value: custom(),
      fetchedAt: 1_760_000_000_000,
    });
    server.use(http.get(apiUrl(PATH), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByText(/Sin conexión: estás viendo la copia del/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cambiar los parámetros necesita conexión/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Solo el productor y quien él autorice/),
    ).not.toBeInTheDocument();
  });

  it('asks for a connection once when there is no copy', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.error()));
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: 'Necesitas conexión una vez para cargar los parámetros.',
      }),
    ).toBeInTheDocument();
  });

  it('says it could not load, and retries', async () => {
    server.use(
      http.get(apiUrl(PATH), () =>
        HttpResponse.json(
          { detail: 'Error.', code: 'internal_error', fields: {} },
          { status: 500 },
        ),
      ),
    );
    renderScreen();

    expect(
      await screen.findByText('No fue posible cargar los parámetros.'),
    ).toBeInTheDocument();
  });

  it('asks the technical account to choose a producer first, and reads that one', async () => {
    const requests: URLSearchParams[] = [];
    server.use(parametersHandler(buildParameters(), requests));
    renderScreen({ superuser: true });

    expect(
      await screen.findByText('Elige un productor para ver sus parámetros.'),
    ).toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it('reads the producer the technical account chose', async () => {
    const requests: URLSearchParams[] = [];
    server.use(parametersHandler(buildParameters(), requests));
    renderScreen({ superuser: true, searchParams: '?productor=p2' });

    await rowOf('Humedad de entrada');
    expect(requests[0].get('producer')).toBe('p2');
  });
});

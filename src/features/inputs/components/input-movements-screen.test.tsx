import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import {
  buildAgriculturalInput,
  buildInputMovement,
  buildInputStock,
  buildSession,
} from '@/test/factories';
import { inputMovementsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { InputMovementsScreen } from './input-movements-screen';
import {
  ALL_INPUT_PERMISSIONS,
  type InputsBackend,
  startInputsBackend,
} from './inputs-test-kit';

// Azufre en mL, presentación Pote de 100 mL.
const sulfur = buildAgriculturalInput({
  id: 'sulfur',
  name: 'Azufre',
  input_type: 'fungicide',
  unit: 'ml',
  package_type: 'tub',
  package_size: '100.000',
  has_records: true,
});
const farm = { id: 'f1', name: 'La Esperanza', is_active: true };

let backend: InputsBackend;

beforeEach(() => {
  backend = startInputsBackend(
    [sulfur],
    [
      buildInputStock({
        input_id: 'sulfur',
        quantity: '230.000',
        last_count_date: '2026-10-03',
      }),
    ],
  );
});

afterEach(() => vi.restoreAllMocks());

function renderScreen({
  permissions = ALL_INPUT_PERMISSIONS as string[],
  inputId = 'sulfur',
  farmChoice = farm,
} = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: `movements-${crypto.randomUUID()}`, permissions }),
  );
  return renderWithProviders(
    <InputMovementsScreen farm={farmChoice} inputId={inputId} />,
    { queryClient },
  );
}

const movementList = () => screen.findByRole('list', { name: 'Movimientos' });

describe('InputMovementsScreen', () => {
  it('shows the stock, the last count and each movement with its sign', async () => {
    server.use(
      inputMovementsHandler([
        buildInputMovement({
          id: 'c',
          kind: 'count',
          quantity: '-20.000',
          counted_quantity: '230.000',
          occurred_on: '2026-10-03',
          note: 'Se derramó medio pote',
        }),
        buildInputMovement({
          id: 'b',
          kind: 'consumption',
          quantity: '-50.000',
          occurred_on: '2026-10-02',
          actor_name: null,
        }),
        buildInputMovement({
          id: 'a',
          quantity: '300.000',
          occurred_on: '2026-10-01',
        }),
      ]),
    );

    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'Movimientos de Azufre' }),
    ).toBeInTheDocument();
    expect(screen.getByText('En La Esperanza')).toBeInTheDocument();
    expect(await screen.findByText('230 mL · 2,3 potes')).toBeInTheDocument();
    expect(screen.getByText('3 de octubre de 2026')).toBeInTheDocument();
    const items = within(await movementList()).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Conteo: 230 mL (−20 mL)'),
      expect.stringContaining('−50 mL'),
      expect.stringContaining('+300 mL'),
    ]);
    expect(
      within(items[0]).getByText('Se derramó medio pote'),
    ).toBeInTheDocument();
    expect(
      within(items[1]).getByText('Salida por actividad'),
    ).toBeInTheDocument();
    expect(within(items[1]).getByText(/Cuenta eliminada/)).toBeInTheDocument();
  });

  it('loads more movements on request', async () => {
    server.use(
      inputMovementsHandler(
        Array.from({ length: 25 }, (_, index) =>
          buildInputMovement({ id: `m${index}` }),
        ),
      ),
    );

    renderScreen();

    expect(within(await movementList()).getAllByRole('listitem')).toHaveLength(
      20,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }));

    await waitFor(() =>
      expect(screen.getAllByRole('listitem')).toHaveLength(25),
    );
    expect(
      screen.queryByRole('button', { name: 'Cargar más' }),
    ).not.toBeInTheDocument();
  });

  it('says when the input has no movements in the farm', async () => {
    server.use(inputMovementsHandler([]));

    renderScreen();

    expect(
      await screen.findByText(
        'Este insumo aún no tiene movimientos en esta finca',
      ),
    ).toBeInTheDocument();
  });

  it('registers an entry from here and refreshes the stock and the movements', async () => {
    const requests: URLSearchParams[] = [];
    server.use(inputMovementsHandler([], requests));
    renderScreen();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Registrar entrada' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText('Cantidad (potes)'),
      '1',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Registrar entrada' }),
    );

    expect(await screen.findByText('Entrada registrada')).toBeInTheDocument();
    expect(backend.movements[0]).toMatchObject({
      farm_id: 'f1',
      quantity: '100',
    });
    expect(await screen.findByText('330 mL · 3,3 potes')).toBeInTheDocument();
    await waitFor(() => expect(requests.length).toBeGreaterThan(1));
  });

  it('offers only counts for an inactive input, and nothing without the permission', async () => {
    backend.catalog = [{ ...sulfur, is_active: false }];
    server.use(inputMovementsHandler([]));
    const { unmount } = renderScreen();

    expect(
      await screen.findByRole('button', { name: 'Registrar conteo' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Registrar entrada' }),
    ).not.toBeInTheDocument();
    unmount();

    renderScreen({ permissions: [PERMISSIONS.INPUTS_VIEW] });

    await screen.findByRole('heading', { name: 'Movimientos de Azufre' });
    expect(
      screen.queryByRole('button', { name: 'Registrar conteo' }),
    ).not.toBeInTheDocument();
  });

  it('asks for a connection instead of loading forever', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    server.use(inputMovementsHandler([]));

    renderScreen();

    expect(
      await screen.findByText('Necesitas conexión para ver los movimientos'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Registrar conteo' }),
    ).toBeDisabled();
  });

  it('says when the input no longer exists', async () => {
    server.use(inputMovementsHandler([]));

    renderScreen({ inputId: 'gone' });

    expect(
      await screen.findByText('Este insumo ya no existe.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Volver a Insumos/ }),
    ).toHaveAttribute('href', '/insumos?finca=f1');
  });
});

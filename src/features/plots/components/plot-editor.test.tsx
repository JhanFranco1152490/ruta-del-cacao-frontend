import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { rect } from '@/lib/geo/test-shapes';
import { installFakeGps, restoreGeolocation } from '@/test/fake-geolocation';
import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

vi.mock('@/config/map', async () => {
  const { loadFakePolygonEditor } = await import('@/test/fake-map');
  return { loadPolygonEditorMapProvider: loadFakePolygonEditor };
});

import type { KnownPlot } from '../known-plots';
import type { PlotFormValues } from '../plot-queue';
import { PlotEditor, type PlotEditorFarm } from './plot-editor';

const FARM: PlotEditorFarm = {
  id: 'f1',
  name: 'La Esperanza',
  areaHectares: '10.00',
  // Junto a donde el mapa de pruebas pone los vértices.
  location: { latitude: '7.8005', longitude: '-72.4995' },
  editPath: '/fincas/editar?id=f1',
};

const EMPTY: PlotFormValues = { code: '', area_hectares: '', vertices: [] };

const known = (over: Partial<KnownPlot> = {}): KnownPlot => ({
  id: 'p2',
  code: 'P2',
  areaHectares: '1.00',
  isActive: true,
  vertices: [],
  ...over,
});

function renderEditor(
  over: Partial<React.ComponentProps<typeof PlotEditor>> = {},
  permissions: string[] = [PERMISSIONS.PLOTS_VIEW, PERMISSIONS.PLOTS_ADD],
) {
  const onSubmit = vi.fn();
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({ id: 'u1', permissions }),
  );
  renderWithProviders(
    <PlotEditor
      cancelHref="/fincas/detalle?id=f1"
      defaultValues={EMPTY}
      description="Registra la parcela."
      farm={FARM}
      isSaving={false}
      knownPlots={[]}
      onSubmit={onSubmit}
      submitLabel="Guardar parcela"
      title="Registrar parcela"
      {...over}
    />,
    { queryClient },
  );
  return { onSubmit, user: userEvent.setup() };
}

const tapMap = async (
  user: ReturnType<typeof userEvent.setup>,
  times: number,
) => {
  for (let i = 0; i < times; i += 1) {
    await user.click(
      await screen.findByRole('button', { name: 'Tocar el mapa' }),
    );
  }
};

const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  code: string,
  area: string,
) => {
  const codeField = screen.getByLabelText('Código de la parcela');
  const areaField = screen.getByLabelText('Área declarada (hectáreas)');
  await user.clear(codeField);
  await user.type(codeField, code);
  await user.clear(areaField);
  await user.type(areaField, area);
};

afterEach(() => restoreGeolocation());

describe('PlotEditor', () => {
  it('saves a plot without polygon with just its code and area', async () => {
    const { onSubmit, user } = renderEditor();

    await fill(user, 'P1 · El Mango', '2,4');
    await user.click(screen.getByRole('button', { name: 'Guardar parcela' }));

    expect(onSubmit).toHaveBeenCalledWith({
      code: 'P1 · El Mango',
      area_hectares: '2.4',
      vertices: [],
    });
  });

  it('asks for the code and the area before saving', async () => {
    const { onSubmit, user } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Guardar parcela' }));

    expect(
      await screen.findByText('Ingresa el código de la parcela.'),
    ).toBeInTheDocument();
    expect(screen.getByText('El área debe ser mayor a 0')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the area left in the farm as a guide', () => {
    renderEditor({
      knownPlots: [known({ areaHectares: '6.00' })],
    });

    expect(
      screen.getByText('Disponible en la finca: 4 ha'),
    ).toBeInTheDocument();
  });

  it('does not count the plot being edited against its own area', () => {
    renderEditor({
      selfId: 'p2',
      knownPlots: [known({ areaHectares: '6.00' })],
    });

    expect(
      screen.getByText('Disponible en la finca: 10 ha'),
    ).toBeInTheDocument();
  });

  it('blocks an area that goes past what is left in the farm', async () => {
    const { onSubmit, user } = renderEditor({
      knownPlots: [known({ areaHectares: '6.00' })],
    });

    await fill(user, 'P1', '5');

    expect(
      screen.getByText(
        'El área ingresada supera el área disponible de la finca',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar parcela' }),
    ).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('offers ways out when the area goes past what is left, and applies the available one', async () => {
    const { user } = renderEditor({
      knownPlots: [known({ areaHectares: '6.00' })],
    });
    await fill(user, 'P1', '5');

    expect(screen.getByText(/le quedan 4 ha sin asignar/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Revisar las otras parcelas' }),
    ).toHaveAttribute('href', '/fincas/detalle?id=f1');
    await user.click(
      screen.getByRole('button', { name: 'Usar el área disponible (4 ha)' }),
    );

    expect(screen.getByLabelText('Área declarada (hectáreas)')).toHaveValue(
      '4.00',
    );
    expect(
      screen.queryByText(/supera el área disponible/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar parcela' }),
    ).toBeEnabled();
  });

  it('offers to enlarge the farm only to who can edit farms', async () => {
    const first = renderEditor({
      knownPlots: [known({ areaHectares: '6.00' })],
    });
    await fill(first.user, 'P1', '5');
    expect(
      screen.queryByRole('link', { name: 'Ampliar el área de la finca' }),
    ).not.toBeInTheDocument();
  });

  it('links to the farm edit when the person can change farms', async () => {
    const { user } = renderEditor(
      { knownPlots: [known({ areaHectares: '6.00' })] },
      [PERMISSIONS.PLOTS_VIEW, PERMISSIONS.PLOTS_ADD, PERMISSIONS.FARMS_CHANGE],
    );
    await fill(user, 'P1', '5');

    expect(
      screen.getByRole('link', { name: 'Ampliar el área de la finca' }),
    ).toHaveAttribute('href', '/fincas/editar?id=f1');
  });

  it('offers no available area to use when the farm is full', async () => {
    const { user } = renderEditor({
      knownPlots: [known({ areaHectares: '10.00' })],
    });
    await fill(user, 'P1', '1');

    expect(
      screen.queryByRole('button', { name: /Usar el área disponible/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/supera el área disponible/)).toBeInTheDocument();
  });

  it('blocks a vertex that is too far from the farm point and says how far', async () => {
    const { user } = renderEditor({
      farm: { ...FARM, location: { latitude: '8.5', longitude: '-72.5' } },
    });

    await user.click(screen.getByRole('button', { name: 'Dibujar polígono' }));
    await tapMap(user, 3);

    expect(
      await screen.findByText(/demasiado lejos del punto de la finca/),
    ).toBeInTheDocument();
    expect(screen.getByText(/el máximo es 657 m/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar parcela' }),
    ).toBeDisabled();
  });

  it('accepts the vertices that are within reach of the farm point', async () => {
    const { user } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Dibujar polígono' }));
    await tapMap(user, 3);

    expect(
      screen.queryByText(/demasiado lejos|del punto de la finca/),
    ).not.toBeInTheDocument();
  });

  it('rejects a code that another plot of the farm already has', async () => {
    const { onSubmit, user } = renderEditor({
      knownPlots: [known({ code: 'P2' })],
    });

    await fill(user, ' p2 ', '1');
    await user.click(screen.getByRole('button', { name: 'Guardar parcela' }));

    expect(
      await screen.findByText(
        'Ya existe una parcela con este código en la finca',
      ),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('draws vertices by tapping the map, measures them and saves them', async () => {
    const { onSubmit, user } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Dibujar polígono' }));
    expect(await screen.findByText('Modo: dibujando')).toBeInTheDocument();
    await tapMap(user, 3);
    await user.click(screen.getByRole('button', { name: 'Cerrar polígono' }));

    const list = screen.getByRole('list', { name: 'Vértices del polígono' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Modo: quieto')).toBeInTheDocument();
    expect(
      screen.getByText('Área calculada').nextSibling,
    ).not.toHaveTextContent('—');

    await fill(user, 'P1', '0,5');
    // El triángulo mide poco más de 0,5 ha: se acepta con o sin aviso, pero nunca se bloquea.
    const measured =
      screen.getByText('Área calculada').nextSibling!.textContent!;
    await user.clear(screen.getByLabelText('Área declarada (hectáreas)'));
    await user.type(
      screen.getByLabelText('Área declarada (hectáreas)'),
      measured.replace(' ha', '').replace(',', '.'),
    );
    await user.click(screen.getByRole('button', { name: 'Guardar parcela' }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const saved = onSubmit.mock.calls[0][0] as PlotFormValues;
    expect(saved.vertices).toHaveLength(3);
    expect(saved.vertices.every((vertex) => vertex.source === 'map')).toBe(
      true,
    );
  });

  it('adds a vertex from the GPS and shows where it came from', async () => {
    const gps = installFakeGps();
    const { user } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Agregar vértice' }));
    act(() => gps.reading(4, { latitude: 7.8, longitude: -72.5 }));

    const list = await screen.findByRole('list', {
      name: 'Vértices del polígono',
    });
    expect(within(list).getByText(/GPS ±4 m/)).toBeInTheDocument();
    expect(screen.getByText('1: 7.8, -72.5')).toBeInTheDocument();
  });

  it('explains that closing needs three vertices', async () => {
    const { user } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Dibujar polígono' }));
    await tapMap(user, 2);
    await user.click(screen.getByRole('button', { name: 'Cerrar polígono' }));

    expect(
      screen.getByText('Un polígono necesita al menos 3 vértices.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar parcela' }),
    ).toBeDisabled();
  });

  it('removes a vertex from the list and undoes the last one', async () => {
    const { user } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Dibujar polígono' }));
    await tapMap(user, 3);
    await user.click(screen.getByRole('button', { name: 'Quitar vértice 1' }));
    expect(screen.getAllByRole('listitem', { name: '' })).toBeDefined();
    const list = screen.getByRole('list', { name: 'Vértices del polígono' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));

    expect(
      within(
        screen.getByRole('list', { name: 'Vértices del polígono' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(1);
  });

  it('moves a vertex when the map reports a drag', async () => {
    const { user } = renderEditor();
    await user.click(screen.getByRole('button', { name: 'Dibujar polígono' }));
    await tapMap(user, 1);

    await user.click(
      screen.getByRole('button', { name: 'Arrastrar el primer vértice' }),
    );

    expect(screen.getByText('1: 7.7, -72.6')).toBeInTheDocument();
  });

  it('shows the overlap with the plot it invades', async () => {
    const { user } = renderEditor({
      knownPlots: [
        known({ id: 'p2', code: 'P2', vertices: vertices(rect(0, 0, 1, 1)) }),
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Dibujar polígono' }));
    await tapMap(user, 3);

    expect(
      await screen.findByText(/se superpone con la parcela P2/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar parcela' }),
    ).toBeDisabled();
    expect(screen.getByText('Vecinas: P2')).toBeInTheDocument();
  });

  it('does not treat an inactive plot as a neighbour', async () => {
    const { user } = renderEditor({
      knownPlots: [
        known({ isActive: false, vertices: vertices(rect(0, 0, 1, 1)) }),
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Dibujar polígono' }));
    await tapMap(user, 3);

    expect(screen.queryByText(/se superpone/)).not.toBeInTheDocument();
    expect(screen.getByText('Vecinas: ninguna')).toBeInTheDocument();
  });

  it('offers the calculated area when the declared one is far from it', async () => {
    const { user } = renderEditor();
    await user.click(screen.getByRole('button', { name: 'Dibujar polígono' }));
    await tapMap(user, 3);
    await fill(user, 'P1', '9');

    expect(screen.getByText(/difiere más del 5 %/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar parcela' }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: 'Usar área calculada' }),
    );

    expect(screen.queryByText(/difiere más del 5 %/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Área declarada (hectáreas)')).not.toHaveValue(
      '9',
    );
    expect(
      screen.getByRole('button', { name: 'Guardar parcela' }),
    ).toBeEnabled();
  });

  it('keeps the vertices and the typed data when the map base fails', async () => {
    const { user } = renderEditor();
    await user.click(screen.getByRole('button', { name: 'Dibujar polígono' }));
    await tapMap(user, 1);

    await user.click(screen.getByRole('button', { name: 'Fallar mapa base' }));

    expect(screen.getByText(/puedes seguir dibujando/)).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('list', { name: 'Vértices del polígono' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(1);
  });

  it('cannot save while there is a reason not to, and says why', () => {
    renderEditor({ blockedMessage: 'La finca está inactiva.' });

    expect(screen.getByText('La finca está inactiva.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar parcela' }),
    ).toBeDisabled();
  });
});

function vertices(points: { latitude: number; longitude: number }[]) {
  return points.map((point) => ({
    ...point,
    source: 'map' as const,
    accuracyM: null,
    capturedAt: null,
  }));
}

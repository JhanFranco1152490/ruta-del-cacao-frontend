import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FakePolygonEditor, loadFakePolygonEditor } from '@/test/fake-map';

import type { LoadPolygonEditorMapProvider } from './map-provider';
import { PolygonEditorMapPanel } from './polygon-editor-map-panel';

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof PolygonEditorMapPanel>> = {},
) {
  const onAddVertex = vi.fn();
  const onMoveVertex = vi.fn();
  render(
    <PolygonEditorMapPanel
      disabled={false}
      drawing={true}
      farmPoint={{ latitude: 7.8, longitude: -72.5 }}
      loadProvider={loadFakePolygonEditor}
      onAddVertex={onAddVertex}
      onMoveVertex={onMoveVertex}
      overlapRegions={[]}
      referenceShapes={[]}
      suggestion={null}
      vertices={[]}
      {...overrides}
    />,
  );
  return { onAddVertex, onMoveVertex };
}

describe('PolygonEditorMapPanel', () => {
  it('shows a skeleton while the map loads', () => {
    renderPanel({ loadProvider: () => new Promise(() => {}) });

    expect(screen.getByRole('status')).toHaveTextContent('Cargando mapa…');
  });

  it('passes the vertices, the drawing mode and the references to the map', async () => {
    renderPanel({
      drawing: true,
      vertices: [{ latitude: 7.8, longitude: -72.5 }],
      referenceShapes: [
        {
          id: 'p2',
          label: 'P2',
          positions: [],
          tone: 'ok',
        },
      ],
      overlapRegions: [[{ latitude: 1, longitude: 1 }]],
      suggestion: [{ latitude: 1, longitude: 1 }],
    });

    expect(await screen.findByText('Modo: dibujando')).toBeInTheDocument();
    expect(screen.getByText('1: 7.8, -72.5')).toBeInTheDocument();
    expect(screen.getByText('Vecinas: P2')).toBeInTheDocument();
    expect(screen.getByText('Zonas superpuestas: 1')).toBeInTheDocument();
    expect(screen.getByText('Sugerencia: 1 vértices')).toBeInTheDocument();
  });

  it('passes the GPS position to the map', async () => {
    renderPanel({
      gpsPosition: {
        point: { latitude: 7.8, longitude: -72.5 },
        accuracyM: 12,
      },
    });

    expect(
      await screen.findByText('Posición GPS: 7.8, -72.5 ±12 m'),
    ).toBeInTheDocument();
  });

  it('reports the points the map gives back', async () => {
    const user = userEvent.setup();
    const { onAddVertex, onMoveVertex } = renderPanel({
      vertices: [{ latitude: 7.8, longitude: -72.5 }],
    });

    await user.click(
      await screen.findByRole('button', { name: 'Tocar el mapa' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Arrastrar el primer vértice' }),
    );

    expect(onAddVertex).toHaveBeenCalledOnce();
    expect(onMoveVertex).toHaveBeenCalledWith(0, {
      latitude: 7.7,
      longitude: -72.6,
    });
  });

  it('lets the person keep drawing when the base map fails', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      await screen.findByRole('button', { name: 'Fallar mapa base' }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'puedes seguir dibujando',
    );
  });

  it('offers a retry that keeps the data when the map fails to load', async () => {
    const user = userEvent.setup();
    const loadProvider = vi
      .fn<LoadPolygonEditorMapProvider>()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValue(FakePolygonEditor);
    const onRetry = vi.fn();
    renderPanel({ loadProvider, onRetry });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tus datos y vértices se conservan',
    );
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Modo: dibujando')).toBeInTheDocument();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  // Leaflet usa z-index de 400 a 1000: sin un contexto de apilamiento propio, el mapa tapaba
  // los diálogos de confirmación (z-50).
  it('keeps the map layers below dialogs', async () => {
    renderPanel();

    const region = await screen.findByRole('region', {
      name: 'Mapa de la parcela',
    });
    expect(region.querySelector('[data-slot="map-frame"]')).toHaveClass(
      'isolate',
    );
  });

  describe('going to the farm or to the GPS position', () => {
    const gps = { point: { latitude: 7.81, longitude: -72.51 }, accuracyM: 9 };

    it('takes the map to the farm point', async () => {
      const user = userEvent.setup();
      renderPanel();

      await user.click(
        await screen.findByRole('button', { name: 'Ir a la finca' }),
      );

      expect(await screen.findByText('Enfocado en: farm')).toBeInTheDocument();
    });

    it('cannot go to a farm that has no point', async () => {
      renderPanel({ farmPoint: null });

      expect(
        await screen.findByRole('button', { name: 'Ir a la finca' }),
      ).toBeDisabled();
    });

    it('takes the map to the GPS position when there is one', async () => {
      const user = userEvent.setup();
      renderPanel({ gpsPosition: gps });

      await user.click(
        await screen.findByRole('button', { name: 'Ir a mi ubicación' }),
      );

      expect(await screen.findByText('Enfocado en: gps')).toBeInTheDocument();
    });

    it('asks for the GPS and goes to the position as soon as the first reading arrives', async () => {
      const user = userEvent.setup();
      const onRequestGps = vi.fn();
      const props = {
        disabled: false,
        drawing: false,
        farmPoint: { latitude: 7.8, longitude: -72.5 },
        loadProvider: loadFakePolygonEditor,
        onAddVertex: vi.fn(),
        onMoveVertex: vi.fn(),
        onRequestGps,
        overlapRegions: [],
        referenceShapes: [],
        suggestion: null,
        vertices: [],
      };
      const { rerender } = render(<PolygonEditorMapPanel {...props} />);

      await user.click(
        await screen.findByRole('button', { name: 'Ir a mi ubicación' }),
      );
      expect(onRequestGps).toHaveBeenCalledOnce();
      expect(
        screen.getByRole('button', { name: 'Buscando tu ubicación…' }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Enfocado en/)).not.toBeInTheDocument();

      rerender(<PolygonEditorMapPanel {...props} gpsPosition={gps} />);

      expect(await screen.findByText('Enfocado en: gps')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Ir a mi ubicación' }),
      ).toBeInTheDocument();
    });

    it('cannot go to the position when there is neither GPS nor a way to turn it on', async () => {
      renderPanel({ onRequestGps: undefined });

      expect(
        await screen.findByRole('button', { name: 'Ir a mi ubicación' }),
      ).toBeDisabled();
    });
  });
});

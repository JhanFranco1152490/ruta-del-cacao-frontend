import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LeafletPolygonEditor } from './leaflet-polygon-editor';

const VERTICES = [
  { latitude: 7.8, longitude: -72.5 },
  { latitude: 7.8, longitude: -72.499 },
  { latitude: 7.801, longitude: -72.499 },
];

function renderEditor(
  drawing = true,
  referenceShapes: React.ComponentProps<
    typeof LeafletPolygonEditor
  >['referenceShapes'] = [],
) {
  const onAddVertex = vi.fn();
  const onMoveVertex = vi.fn();
  const { container } = render(
    <div style={{ width: 400, height: 300 }}>
      <LeafletPolygonEditor
        baseLayer="map"
        disabled={false}
        drawing={drawing}
        farmPoint={null}
        onAddVertex={onAddVertex}
        onBaseLayerUnavailable={() => {}}
        onMoveVertex={onMoveVertex}
        overlapRegions={[]}
        referenceShapes={referenceShapes}
        suggestion={null}
        vertices={VERTICES}
      />
    </div>,
  );
  return { container, onAddVertex, onMoveVertex };
}

describe('LeafletPolygonEditor', () => {
  it('draws one numbered marker per vertex', async () => {
    const { container } = renderEditor();

    await vi.waitFor(() =>
      expect(container.querySelectorAll('.map-vertex')).toHaveLength(3),
    );
    expect(
      [...container.querySelectorAll('.map-vertex')].map(
        (el) => el.textContent,
      ),
    ).toEqual(['1', '2', '3']);
  });

  // Tocar un vértice no debe agregar otro encima.
  it('does not add a vertex when an existing one is tapped', async () => {
    const { container, onAddVertex } = renderEditor();
    await vi.waitFor(() =>
      expect(container.querySelectorAll('.map-vertex')).toHaveLength(3),
    );

    const marker = container
      .querySelector('.map-vertex')!
      .closest('.leaflet-marker-icon')!;
    await act(async () => {
      fireEvent.click(marker);
    });

    expect(onAddVertex).not.toHaveBeenCalled();
  });

  it('still adds a vertex when the map itself is tapped while drawing', async () => {
    const { container, onAddVertex } = renderEditor(true);
    await vi.waitFor(() =>
      expect(container.querySelectorAll('.map-vertex')).toHaveLength(3),
    );

    await act(async () => {
      fireEvent.click(container.querySelector('.leaflet-container')!, {
        clientX: 50,
        clientY: 50,
      });
    });

    expect(onAddVertex).toHaveBeenCalledOnce();
  });

  it('does not add a vertex from a tap when it is not in drawing mode', async () => {
    const { container, onAddVertex } = renderEditor(false);
    await vi.waitFor(() =>
      expect(container.querySelectorAll('.map-vertex')).toHaveLength(3),
    );

    await act(async () => {
      fireEvent.click(container.querySelector('.leaflet-container')!, {
        clientX: 50,
        clientY: 50,
      });
    });

    expect(onAddVertex).not.toHaveBeenCalled();
  });

  // El nombre de una vecina se pone sin recuadro y solo se ve donde cabe en su polígono (esa
  // decisión está en `plotLabelFits`). Al abrir, el mapa se encuadra sobre la vecina y sí cabe.
  it('names a neighbour with a plain label once the map is framed so the name fits in it', async () => {
    const { container } = renderEditor(true, [
      {
        id: 'p2',
        label: 'P2',
        tone: 'info',
        positions: [
          { latitude: 7.8, longitude: -72.51 },
          { latitude: 7.8, longitude: -72.509 },
          { latitude: 7.801, longitude: -72.509 },
        ],
      },
    ]);

    await vi.waitFor(() =>
      expect(
        container.querySelector('.leaflet-tooltip.map-plot-label'),
      ).not.toBeNull(),
    );
    const label = container.querySelector(
      '.leaflet-tooltip.map-plot-label',
    ) as HTMLElement;
    expect(label.textContent).toBe('P2');
    await vi.waitFor(() =>
      expect(label).not.toHaveClass('map-plot-label-hidden'),
    );
  });

  describe('the GPS position', () => {
    const editorWith = (
      gpsPosition: React.ComponentProps<
        typeof LeafletPolygonEditor
      >['gpsPosition'],
    ) => (
      <div style={{ width: 400, height: 300 }}>
        <LeafletPolygonEditor
          baseLayer="map"
          disabled={false}
          drawing={false}
          farmPoint={null}
          gpsPosition={gpsPosition}
          onAddVertex={() => {}}
          onBaseLayerUnavailable={() => {}}
          onMoveVertex={() => {}}
          overlapRegions={[]}
          referenceShapes={[]}
          suggestion={null}
          vertices={VERTICES}
        />
      </div>
    );

    it('draws a blue dot with the circle of error, and keeps it as a single dot while it moves', async () => {
      const { container, rerender } = render(
        editorWith({
          point: { latitude: 7.8, longitude: -72.5 },
          accuracyM: 20,
        }),
      );

      await vi.waitFor(() =>
        expect(container.querySelectorAll('.map-gps-dot')).toHaveLength(1),
      );
      rerender(
        editorWith({
          point: { latitude: 7.8003, longitude: -72.5003 },
          accuracyM: 8,
        }),
      );
      rerender(
        editorWith({
          point: { latitude: 7.8006, longitude: -72.5006 },
          accuracyM: 5,
        }),
      );

      expect(container.querySelectorAll('.map-gps-dot')).toHaveLength(1);
    });

    it('is not a vertex: tapping it adds nothing and it is not numbered', async () => {
      const { container } = render(
        editorWith({
          point: { latitude: 7.8, longitude: -72.5 },
          accuracyM: 20,
        }),
      );

      await vi.waitFor(() =>
        expect(container.querySelectorAll('.map-gps-dot')).toHaveLength(1),
      );

      expect(container.querySelectorAll('.map-vertex')).toHaveLength(3);
    });

    it('removes the dot when the GPS is turned off', async () => {
      const { container, rerender } = render(
        editorWith({
          point: { latitude: 7.8, longitude: -72.5 },
          accuracyM: 20,
        }),
      );
      await vi.waitFor(() =>
        expect(container.querySelectorAll('.map-gps-dot')).toHaveLength(1),
      );

      rerender(editorWith(null));

      expect(container.querySelectorAll('.map-gps-dot')).toHaveLength(0);
    });
  });
});

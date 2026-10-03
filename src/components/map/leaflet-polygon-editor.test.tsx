import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LeafletPolygonEditor } from './leaflet-polygon-editor';

const VERTICES = [
  { latitude: 7.8, longitude: -72.5 },
  { latitude: 7.8, longitude: -72.499 },
  { latitude: 7.801, longitude: -72.499 },
];

function renderEditor(drawing = true) {
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
        referenceShapes={[]}
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
});

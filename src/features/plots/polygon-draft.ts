import { MAX_VERTICES } from '@/lib/geo/polygon';
import type { SuggestedVertex } from '@/lib/geo/adjust';
import type { GeoPoint } from '@/types/geo';

import type { DraftVertex } from './plot-vertices';

// El polígono mientras se dibuja. `drawing` es el modo en que cada toque en el mapa agrega un
// vértice; fuera de él, el mapa solo permite mover los que ya existen.
export type PolygonDraft = { vertices: DraftVertex[]; drawing: boolean };

export type PolygonAction =
  | { type: 'add'; vertex: DraftVertex }
  | { type: 'move'; index: number; point: GeoPoint }
  | { type: 'remove'; index: number }
  | { type: 'undo' }
  | { type: 'startDrawing' }
  | { type: 'close' }
  | { type: 'replace'; vertices: DraftVertex[] };

export const initialDraft = (vertices: DraftVertex[] = []): PolygonDraft => ({
  vertices,
  drawing: false,
});

export function polygonDraftReducer(
  state: PolygonDraft,
  action: PolygonAction,
): PolygonDraft {
  switch (action.type) {
    case 'add':
      // El máximo lo explica la pantalla; aquí solo no se pasa de él.
      if (state.vertices.length >= MAX_VERTICES) return state;
      return { ...state, vertices: [...state.vertices, action.vertex] };
    case 'move':
      return {
        ...state,
        vertices: state.vertices.map((vertex, index) =>
          index === action.index
            ? // Un vértice arrastrado ya no es la lectura del GPS: queda donde la persona lo puso.
              {
                ...vertex,
                ...action.point,
                source: vertex.source === 'adjusted' ? 'adjusted' : 'map',
                accuracyM: null,
              }
            : vertex,
        ),
      };
    case 'remove':
      return {
        ...state,
        vertices: state.vertices.filter((_, index) => index !== action.index),
      };
    case 'undo':
      return { ...state, vertices: state.vertices.slice(0, -1) };
    case 'startDrawing':
      return { ...state, drawing: true };
    case 'close':
      return { ...state, drawing: false };
    case 'replace':
      return { vertices: action.vertices, drawing: false };
  }
}

const key = ({ latitude, longitude }: GeoPoint) => `${latitude},${longitude}`;

// La sugerencia del dispositivo como vértices del borrador: los que ya estaban conservan su
// origen y su precisión; los nuevos se marcan como ajustados.
export function applySuggestion(
  current: readonly DraftVertex[],
  suggestion: readonly SuggestedVertex[],
  capturedAt: string | null,
): DraftVertex[] {
  const existing = new Map(current.map((vertex) => [key(vertex), vertex]));
  return suggestion.map(({ point, isAdjusted }) => {
    const kept = isAdjusted ? undefined : existing.get(key(point));
    return (
      kept ?? {
        ...point,
        source: 'adjusted',
        accuracyM: null,
        capturedAt,
      }
    );
  });
}

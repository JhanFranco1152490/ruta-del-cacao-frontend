import { cn } from 'cn';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { COORDINATE_DECIMALS } from '@/lib/format/coordinates';
import { MAX_VERTICES, MIN_VERTICES } from '@/lib/geo/polygon';

import type { DraftVertex } from '../plot-vertices';

const SOURCE_LABELS = {
  gps: 'GPS',
  map: 'Mapa',
  adjusted: 'Ajustado',
} as const;

const origin = (vertex: DraftVertex) =>
  vertex.source === 'gps' && vertex.accuracyM !== null
    ? `GPS ±${Math.round(vertex.accuracyM)} m`
    : SOURCE_LABELS[vertex.source];

// La lista es la forma accesible de recorrer y quitar vértices sin el mapa.
export function PlotVertexList({
  vertices,
  drawing,
  closeAttempted,
  disabled,
  flagged = {},
  collapsed = false,
  onRemove,
  onClose,
}: {
  vertices: readonly DraftVertex[];
  drawing: boolean;
  closeAttempted: boolean;
  disabled: boolean;
  // Los vértices que fallan una regla, por su posición (desde 0), con la razón en texto.
  flagged?: Readonly<Record<number, string>>;
  // Plegada, la lista se reduce a cuántos vértices hay.
  collapsed?: boolean;
  onRemove: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      {vertices.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no hay vértices. Usa <strong>Dibujar polígono</strong> y toca el
          mapa, o agrega vértices con el GPS. El polígono es opcional.
        </p>
      ) : collapsed ? (
        <p className="text-muted-foreground">
          {vertices.length} vértices (lista plegada).
          {Object.keys(flagged).length > 0 &&
            ' Hay vértices con avisos: despliega la lista para verlos.'}
        </p>
      ) : (
        <ol aria-label="Vértices del polígono" className="space-y-2">
          {vertices.map((vertex, index) => (
            <li
              key={`${index}-${vertex.latitude}-${vertex.longitude}`}
              className={cn(
                'flex items-center justify-between gap-3 rounded-(--radius) border px-3 py-2',
                flagged[index] ? 'border-err bg-err-bg' : 'border-border',
              )}
              data-flagged={flagged[index] ? 'true' : undefined}
            >
              <span>
                <strong>Vértice {index + 1}</strong>{' '}
                <span className="text-sm text-muted-foreground">
                  · {origin(vertex)}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {vertex.latitude.toFixed(COORDINATE_DECIMALS)},{' '}
                  {vertex.longitude.toFixed(COORDINATE_DECIMALS)}
                </span>
                {flagged[index] && (
                  <span className="block text-sm font-bold text-err">
                    {flagged[index]}
                  </span>
                )}
              </span>
              <Button
                aria-label={`Quitar vértice ${index + 1}`}
                disabled={disabled}
                onClick={() => onRemove(index)}
                size="icon"
                type="button"
                variant="outline"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </li>
          ))}
        </ol>
      )}
      {closeAttempted && vertices.length < MIN_VERTICES && (
        <p className="font-bold text-err" role="alert">
          Un polígono necesita al menos {MIN_VERTICES} vértices.
        </p>
      )}
      {vertices.length >= MAX_VERTICES && (
        <p className="font-bold text-warn" role="status">
          Llegaste al máximo de {MAX_VERTICES} vértices.
        </p>
      )}
      {drawing && (
        <Button
          disabled={disabled}
          onClick={onClose}
          size="office"
          type="button"
          variant="outline"
        >
          Cerrar polígono
        </Button>
      )}
    </div>
  );
}

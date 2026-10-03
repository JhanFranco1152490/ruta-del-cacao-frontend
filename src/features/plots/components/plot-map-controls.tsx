import { PenLine, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

// Los controles de dibujo, debajo del mapa: dibujar tocando, deshacer y, cuando exista, agregar
// un vértice con el GPS (`gps`).
export function PlotMapControls({
  drawing,
  canUndo,
  disabled,
  onStartDrawing,
  onUndo,
  gps,
}: {
  drawing: boolean;
  canUndo: boolean;
  disabled: boolean;
  onStartDrawing: () => void;
  onUndo: () => void;
  gps?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {gps}
      <Button
        aria-pressed={drawing}
        disabled={disabled}
        onClick={onStartDrawing}
        size="office"
        type="button"
        variant={drawing ? 'default' : 'outline'}
      >
        <PenLine aria-hidden="true" className="size-4" /> Dibujar polígono
      </Button>
      <Button
        disabled={disabled || !canUndo}
        onClick={onUndo}
        size="office"
        type="button"
        variant="outline"
      >
        <Undo2 aria-hidden="true" className="size-4" /> Deshacer
      </Button>
    </div>
  );
}

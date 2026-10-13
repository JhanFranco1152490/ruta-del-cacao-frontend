'use client';

import { ListFilter } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

import { Button } from '@/components/ui/button';

// En una pantalla angosta los filtros ocupan tres filas antes del contenido: quedan detrás de un
// botón que dice cuántos hay puestos. En una ancha no se usa y los filtros van siempre a la vista.
export function ActivityFiltersToggle({
  activeCount,
  children,
}: {
  activeCount: number;
  children: ReactNode;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        aria-controls={panelId}
        aria-expanded={open}
        className="h-10"
        onClick={() => setOpen((current) => !current)}
        size="office"
        variant="outline"
      >
        <ListFilter aria-hidden="true" className="size-4" />
        Filtros
        {activeCount > 0 && (
          <span className="rounded-full bg-selva px-2 text-xs text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>
      <div hidden={!open} id={panelId}>
        {children}
      </div>
    </div>
  );
}

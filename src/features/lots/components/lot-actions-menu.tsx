'use client';

import { cn } from 'cn';

import { ActionsMenu } from '@/components/actions-menu';
import { EditorLink } from '@/components/editor-link';
import { MenuItem } from '@/components/ui/menu';
import type { LotAction } from '@/lib/lot-actions';

// El «⋯» de la fila de un lote: lo que se hace con él en la etapa en que está. Cada opción es un
// enlace a la pantalla donde se hace; no abre formularios aquí, porque cada módulo trae su propia
// copia sin conexión y su cola. Sin acciones para ese estado no hay menú.
export function LotActionsMenu({
  code,
  actions,
  className,
  reserveSpace = false,
  placeholderClassName,
}: {
  code: string;
  actions: readonly LotAction[];
  className?: string;
  // Sin acciones, deja el hueco del botón para que lo que está a su lado no se corra.
  reserveSpace?: boolean;
  placeholderClassName?: string;
}) {
  if (actions.length === 0) {
    return reserveSpace ? (
      <span
        aria-hidden="true"
        className={cn('inline-block w-11 shrink-0', placeholderClassName)}
      />
    ) : null;
  }
  return (
    <ActionsMenu className={className} label={`Más acciones del lote ${code}`}>
      {actions.map(({ id, label, href, icon: Icon }) => (
        <MenuItem key={id} render={<EditorLink href={href} />}>
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </MenuItem>
      ))}
    </ActionsMenu>
  );
}

'use client';

import { MapPinned, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { ActionsMenu } from '@/components/actions-menu';
import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';
import { MenuItem } from '@/components/ui/menu';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { KnownPlot } from '../known-plots';
import { plotActions } from '../plot-actions';
import { plotEditPath } from '../plot-paths';
import { PlotDeleteDialog } from './plot-delete-dialog';
import { PlotDiscardDialog } from './plot-discard-dialog';
import { PlotStatusDialog } from './plot-status-dialog';
import { plotLabel } from '@/lib/format/place-label';

// Lo que hace falta saber de la finca: sus parcelas se congelan cuando está inactiva.
type ActionsFarm = { id: string; isActive: boolean };

// Lo que se puede hacer con una parcela, igual en el detalle de su finca y en la lista de todas.
// Cada acción aparece solo con su permiso. Corregir una parcela que sigue en el dispositivo queda a
// la vista; lo que no se hace a diario (editar, activar, desactivar, eliminar, descartar) va en el
// menú «⋯», que no ocupa lugar en la tarjeta.
export function PlotCardActions({
  plot,
  farm,
  compact = false,
  onShowOnMap,
  extraItems,
}: {
  plot: KnownPlot;
  farm: ActionsFarm;
  // La tarjeta es angosta: aquí no hay más botón que el «⋯», y lo que iría a la vista (corregir y
  // lo que sume otro dominio) pasa a su menú.
  compact?: boolean;
  // Ver la parcela en el mapa: siempre en el menú, además del botón a la vista de la tarjeta ancha.
  onShowOnMap?: () => void;
  // Opciones de otro dominio (programar una actividad), solo para la tarjeta angosta.
  extraItems?: ReactNode;
}) {
  const { data: user } = useSession();
  const actions = plotActions(
    plot,
    farm.isActive,
    {
      canAdd: hasPermission(user, PERMISSIONS.PLOTS_ADD),
      canChange: hasPermission(user, PERMISSIONS.PLOTS_CHANGE),
      canDelete: hasPermission(user, PERMISSIONS.PLOTS_DELETE),
    },
    compact,
  );
  const { serverPlot, editLabel } = actions;
  const [dialog, setDialog] = useState<'status' | 'delete' | 'discard'>();
  const closeDialog = (open: boolean) => {
    if (!open) setDialog(undefined);
  };

  const leadingItems = onShowOnMap || (compact && extraItems);
  // Sin nada que ofrecer en el menú no se dibuja: solo queda el enlace a la vista.
  const hasMenuItems =
    !!leadingItems ||
    actions.editInMenu ||
    actions.discard ||
    actions.toggleStatus ||
    actions.remove;
  if (!hasMenuItems && !actions.editVisible) return null;

  const editHref = plotEditPath(plot.id, farm.id);
  const menuLabel = `Más acciones de ${plotLabel(plot)}`;

  const menu = (
    <ActionsMenu className="size-10 px-0" label={menuLabel}>
      {onShowOnMap && (
        <MenuItem onClick={onShowOnMap}>
          <MapPinned aria-hidden="true" className="size-4" />
          Ver en el mapa
        </MenuItem>
      )}
      {compact && extraItems}
      {actions.editInMenu && (
        <MenuItem render={<EditorLink href={editHref} />}>
          <Pencil aria-hidden="true" className="size-4" />
          {editLabel}
        </MenuItem>
      )}
      {actions.discard && (
        <MenuItem
          className="text-destructive"
          onClick={() => setDialog('discard')}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Descartar
        </MenuItem>
      )}
      {actions.toggleStatus && (
        <MenuItem
          className={plot.isActive ? 'text-destructive' : undefined}
          onClick={() => setDialog('status')}
        >
          {plot.isActive ? (
            <PowerOff aria-hidden="true" className="size-4" />
          ) : (
            <Power aria-hidden="true" className="size-4" />
          )}
          {plot.isActive ? 'Desactivar' : 'Activar'}
        </MenuItem>
      )}
      {actions.remove && (
        <MenuItem
          className="text-destructive"
          onClick={() => setDialog('delete')}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Eliminar
        </MenuItem>
      )}
    </ActionsMenu>
  );

  return (
    <>
      {actions.editVisible && (
        <EditorLink
          aria-label={`${editLabel} ${plotLabel(plot)}`}
          className={buttonVariants({
            size: 'office',
            variant: 'action',
            className: 'size-10 px-0',
          })}
          href={editHref}
          title={editLabel}
        >
          <Pencil aria-hidden="true" className="size-4" />
        </EditorLink>
      )}
      {hasMenuItems && menu}
      {actions.discard && (
        <PlotDiscardDialog
          code={plotLabel(plot)}
          control={{ open: dialog === 'discard', onOpenChange: closeDialog }}
          plotId={plot.id}
        />
      )}
      {actions.toggleStatus && serverPlot && (
        <PlotStatusDialog
          control={{ open: dialog === 'status', onOpenChange: closeDialog }}
          farmId={farm.id}
          plot={serverPlot}
        />
      )}
      {actions.remove && serverPlot && (
        <PlotDeleteDialog
          control={{ open: dialog === 'delete', onOpenChange: closeDialog }}
          farmId={farm.id}
          plot={serverPlot}
        />
      )}
    </>
  );
}

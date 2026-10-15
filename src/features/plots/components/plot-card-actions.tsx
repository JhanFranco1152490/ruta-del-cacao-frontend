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
import { plotEditPath } from '../plot-paths';
import { PLOT_DELETED_CODE } from '../sync-adapter';
import { PlotDeleteDialog } from './plot-delete-dialog';
import { PlotDiscardDialog } from './plot-discard-dialog';
import { PlotStatusDialog } from './plot-status-dialog';

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
  // La tarjeta es angosta: aquí no hay más botón que el «⋯», y lo que iría a la vista (corregir, ver
  // en el mapa y lo que sume otro dominio) pasa a su menú.
  compact?: boolean;
  onShowOnMap?: () => void;
  // Opciones de otro dominio (programar una actividad), solo para la tarjeta angosta.
  extraItems?: ReactNode;
}) {
  const { data: user } = useSession();
  const canAdd = hasPermission(user, PERMISSIONS.PLOTS_ADD);
  const canChange = hasPermission(user, PERMISSIONS.PLOTS_CHANGE);
  const canDeletePlot = hasPermission(user, PERMISSIONS.PLOTS_DELETE);

  const [dialog, setDialog] = useState<'status' | 'delete' | 'discard'>();
  const closeDialog = (open: boolean) => {
    if (!open) setDialog(undefined);
  };

  const isError = plot.queue?.status === 'error';
  // La parcela (o su finca) ya no existe en el servidor: corregirla no sirve, solo descartarla.
  const canCorrect = plot.queue?.errorCode !== PLOT_DELETED_CODE;
  const label = isError ? 'Corregir' : 'Editar';
  const showEdit =
    farm.isActive &&
    canCorrect &&
    // Una parcela que solo está en el dispositivo se corrige con el permiso de registrar; una
    // del servidor, con el de editar.
    (plot.queue?.operation === 'create' ? canAdd : canChange);
  // Activar, desactivar y eliminar son en línea y sobre la versión del servidor: no se ofrecen
  // mientras la parcela tenga algo pendiente en el dispositivo.
  const serverPlot =
    !plot.queue && plot.version !== undefined
      ? { ...plot, version: plot.version }
      : null;
  const canDeactivate = serverPlot && canChange && farm.isActive;
  const canDelete = serverPlot && canDeletePlot && farm.isActive;
  const compactItems = compact && (onShowOnMap || extraItems);
  if (!showEdit && !isError && !canDeactivate && !canDelete && !compactItems) {
    return null;
  }

  const editHref = plotEditPath(plot.id, farm.id);
  // Una parcela que sigue en el dispositivo se corrige a la vista; en la tarjeta angosta, en el menú.
  const visibleEdit = !!plot.queue && !compact;
  const menuLabel = `Más acciones de ${plot.code}`;

  const menu = (
    <ActionsMenu className="size-10 px-0" label={menuLabel}>
      {compact && onShowOnMap && (
        <MenuItem onClick={onShowOnMap}>
          <MapPinned aria-hidden="true" className="size-4" />
          Ver en el mapa
        </MenuItem>
      )}
      {compact && extraItems}
      {showEdit && !visibleEdit && (
        <MenuItem render={<EditorLink href={editHref} />}>
          <Pencil aria-hidden="true" className="size-4" />
          {label}
        </MenuItem>
      )}
      {/* Descartar solo cuando falló: una pendiente todavía puede llegar bien. */}
      {isError && (
        <MenuItem
          className="text-destructive"
          onClick={() => setDialog('discard')}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Descartar
        </MenuItem>
      )}
      {canDeactivate && (
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
      {canDelete && (
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
  // Sin nada que ofrecer en el menú no se dibuja: solo queda el enlace a la vista.
  const hasMenuItems =
    compactItems ||
    (showEdit && !visibleEdit) ||
    isError ||
    canDeactivate ||
    canDelete;

  return (
    <>
      {showEdit && visibleEdit && (
        <EditorLink
          aria-label={`${label} ${plot.code}`}
          className={buttonVariants({
            size: 'office',
            variant: 'action',
            className: 'size-10 px-0',
          })}
          href={editHref}
          title={label}
        >
          <Pencil aria-hidden="true" className="size-4" />
        </EditorLink>
      )}
      {hasMenuItems && menu}
      {isError && (
        <PlotDiscardDialog
          code={plot.code}
          control={{ open: dialog === 'discard', onOpenChange: closeDialog }}
          plotId={plot.id}
        />
      )}
      {canDeactivate && serverPlot && (
        <PlotStatusDialog
          control={{ open: dialog === 'status', onOpenChange: closeDialog }}
          farmId={farm.id}
          plot={serverPlot}
        />
      )}
      {canDelete && serverPlot && (
        <PlotDeleteDialog
          control={{ open: dialog === 'delete', onOpenChange: closeDialog }}
          farmId={farm.id}
          plot={serverPlot}
        />
      )}
    </>
  );
}

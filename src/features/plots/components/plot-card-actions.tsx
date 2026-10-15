'use client';

import { Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

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
}: {
  plot: KnownPlot;
  farm: ActionsFarm;
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
  if (!showEdit && !isError && !canDeactivate && !canDelete) return null;

  const editLink = (
    <EditorLink
      aria-label={`${label} ${plot.code}`}
      className={buttonVariants({
        size: 'office',
        variant: 'action',
        className: 'size-10 px-0',
      })}
      href={plotEditPath(plot.id, farm.id)}
      title={label}
    >
      <Pencil aria-hidden="true" className="size-4" />
    </EditorLink>
  );
  const menuLabel = `Más acciones de ${plot.code}`;

  // Lo que sigue en el dispositivo: corregirla a la vista y, solo si falló, descartarla en el
  // menú (una pendiente todavía puede llegar bien).
  if (plot.queue) {
    return (
      <>
        {showEdit && editLink}
        {isError && (
          <>
            <ActionsMenu className="size-10 px-0" label={menuLabel}>
              <MenuItem
                className="text-destructive"
                onClick={() => setDialog('discard')}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Descartar
              </MenuItem>
            </ActionsMenu>
            <PlotDiscardDialog
              code={plot.code}
              control={{
                open: dialog === 'discard',
                onOpenChange: closeDialog,
              }}
              plotId={plot.id}
            />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <ActionsMenu className="size-10 px-0" label={menuLabel}>
        {showEdit && (
          <MenuItem
            render={<EditorLink href={plotEditPath(plot.id, farm.id)} />}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Editar
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

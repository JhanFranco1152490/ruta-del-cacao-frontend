'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
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
// Cada acción aparece solo con su permiso.
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
  return (
    <>
      {showEdit && (
        <Link
          aria-label={`${label} ${plot.code}`}
          className={buttonVariants({ size: 'office', variant: 'outline' })}
          href={plotEditPath(plot.id, farm.id)}
        >
          <Pencil aria-hidden="true" className="size-4" /> {label}
        </Link>
      )}
      {/* Descartar solo cuando falló: una pendiente todavía puede llegar bien. */}
      {isError && <PlotDiscardDialog code={plot.code} plotId={plot.id} />}
      {canDeactivate && <PlotStatusDialog farmId={farm.id} plot={serverPlot} />}
      {canDelete && <PlotDeleteDialog farmId={farm.id} plot={serverPlot} />}
    </>
  );
}

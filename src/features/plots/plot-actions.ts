import type { KnownPlot } from './known-plots';
import { PLOT_DELETED_CODE } from './sync-adapter';

export type PlotActionPermissions = {
  canAdd: boolean;
  canChange: boolean;
  canDelete: boolean;
};

// Qué se puede hacer con una parcela, según dónde está (en el servidor o todavía en el dispositivo),
// su finca y los permisos de quien mira. `compact`: la tarjeta es angosta y todo va al menú.
export function plotActions(
  plot: KnownPlot,
  farmIsActive: boolean,
  { canAdd, canChange, canDelete }: PlotActionPermissions,
  compact: boolean,
) {
  const failed = plot.queue?.status === 'error';
  // La parcela (o su finca) ya no existe en el servidor: corregirla no sirve, solo descartarla.
  const correctable = plot.queue?.errorCode !== PLOT_DELETED_CODE;
  // Una parcela que solo está en el dispositivo se corrige con el permiso de registrar; una del
  // servidor, con el de editar.
  const edit =
    farmIsActive &&
    correctable &&
    (plot.queue?.operation === 'create' ? canAdd : canChange);
  // Una parcela que sigue en el dispositivo se corrige a la vista; en la tarjeta angosta, en el menú.
  const editVisible = edit && !!plot.queue && !compact;
  // Activar, desactivar y eliminar son en línea y sobre la versión del servidor: no se ofrecen
  // mientras la parcela tenga algo pendiente en el dispositivo.
  const serverPlot =
    !plot.queue && plot.version !== undefined
      ? { ...plot, version: plot.version }
      : null;
  const onServer = !!serverPlot && farmIsActive;
  return {
    editLabel: failed ? 'Corregir' : 'Editar',
    editVisible,
    editInMenu: edit && !editVisible,
    // Descartar solo cuando falló: una pendiente todavía puede llegar bien.
    discard: failed,
    toggleStatus: onServer && canChange,
    remove: onServer && canDelete,
    serverPlot,
  };
}

// Cómo se nombra una finca o una parcela en toda la app: su código y, si lo tiene, su nombre. El
// código lo asigna el servidor, así que un registro que todavía espera en la cola del dispositivo
// no lo tiene y se muestra solo por su nombre.

export const NEW_PLOT_LABEL = 'Parcela nueva';

type Place = { code?: string | null; name?: string | null };

const joinCodeAndName = ({ code, name }: Place) =>
  [code, name?.trim()].filter(Boolean).join(' · ');

export const farmLabel = (farm: Place) => joinCodeAndName(farm);

// Una parcela sin nombre y que aún no llega al servidor no tiene con qué nombrarse.
export const plotLabel = (plot: Place) =>
  joinCodeAndName(plot) || NEW_PLOT_LABEL;

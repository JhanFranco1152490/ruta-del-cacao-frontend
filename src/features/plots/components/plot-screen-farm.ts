import type { Coordinates } from '@/types/geo';

// Lo que las pantallas de parcelas necesitan de su finca. La entrega la página, que la lee del
// dominio de fincas: estas pantallas no lo importan.
export type PlotScreenFarm = {
  id: string;
  name: string;
  areaHectares: string;
  location: Coordinates;
  isActive: boolean;
  // Dónde ver la finca: a donde se vuelve al terminar.
  detailPath: string;
  // Dónde editar la finca (p. ej. para ampliar su área).
  editPath: string;
  // Todavía no existe en el servidor: la parcela esperará a que sincronice.
  isPendingCreate: boolean;
  // De quién es la finca, escrito para mostrarlo. Solo la del servidor.
  producerLabel?: string;
};

export const INACTIVE_FARM_MESSAGE =
  'La finca está inactiva: sus parcelas no se pueden registrar ni editar. Reactívala para continuar.';
export const NO_SERVER_PLOTS_NOTICE =
  'No pudimos leer las demás parcelas de esta finca: las comprobaciones de área disponible y de superposición las hará el servidor al sincronizar.';

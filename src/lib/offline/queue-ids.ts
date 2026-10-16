// Los ids con que la cola guarda los registros de los que dependen otros dominios. La cola guarda
// cada registro por su id sin distinguir el recurso, y el de una parcela ya usa el id de la
// parcela: la ficha lleva un prefijo para no pisarlo. Vive aquí porque la cosecha espera a la
// ficha de su parcela y un dominio no importa de otro.
const CHARACTERIZATION_PREFIX = 'plot-characterization:';

export const characterizationQueueId = (plotId: string) =>
  `${CHARACTERIZATION_PREFIX}${plotId}`;

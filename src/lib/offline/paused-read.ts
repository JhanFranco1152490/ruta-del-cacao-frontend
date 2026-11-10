import { isNetworkFailure } from '@/lib/api/errors';

// Una lectura que nunca tuvo datos y quedó en pausa esperando la red. Pasa cuando la conexión se
// cae con la app abierta: TanStack Query deja en pausa el reintento en vez de terminar con error.
// No es una carga en curso, y tratarla como tal deja un esqueleto sin fin.
export const isPausedWithoutData = (query: {
  isPending: boolean;
  fetchStatus: string;
}) => query.isPending && query.fetchStatus === 'paused';

// Una lectura que no llegó por falta de red y no tenía copia en el dispositivo: la pantalla pide
// conexión una vez en vez de mostrar un error.
export const isNeverLoaded = (query: {
  isPending: boolean;
  fetchStatus: string;
  isError: boolean;
  error: unknown;
}) =>
  isPausedWithoutData(query) ||
  (query.isError && isNetworkFailure(query.error));

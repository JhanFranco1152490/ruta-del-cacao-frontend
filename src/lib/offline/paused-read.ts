// Una lectura que nunca tuvo datos y quedó en pausa esperando la red. Pasa cuando la conexión se
// cae con la app abierta: TanStack Query deja en pausa el reintento en vez de terminar con error.
// No es una carga en curso, y tratarla como tal deja un esqueleto sin fin.
export const isPausedWithoutData = (query: {
  isPending: boolean;
  fetchStatus: string;
}) => query.isPending && query.fetchStatus === 'paused';

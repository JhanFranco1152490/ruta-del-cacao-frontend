import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { isApiError, isNetworkFailure, isUnauthorized } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';

const SESSION_KEY = queryKeys.session();

// Cada cuánto se vuelve a pedir una lista mientras la pestaña está visible: lo que otra persona
// cambió aparece solo. Solo en listas: en un formulario, un refresco pisaría lo que se escribe.
export const LIST_REFETCH_INTERVAL_MS = 2 * 60_000;

export function createQueryClient() {
  // Un 401 vuelve a comprobar la sesión; un permiso rechazado recarga sus permisos actuales.
  const invalidateSession = (error: unknown) => {
    if (
      isUnauthorized(error) ||
      (isApiError(error) &&
        error.status === 403 &&
        error.code === 'permission_denied')
    ) {
      void client.invalidateQueries({ queryKey: SESSION_KEY });
    } else if (isNetworkFailure(error) && !sessionFromDevice()) {
      // Sin respuesta del servidor, aunque el navegador diga tener red (señal débil, wifi sin
      // internet): si la sesión tampoco responde, la app sigue con la copia del dispositivo y
      // toda ella sabe que no hay conexión. Varias peticiones fallan a la vez: no se cancela la
      // consulta de la sesión que ya esté en curso.
      void client.invalidateQueries(
        { queryKey: SESSION_KEY },
        { cancelRefetch: false },
      );
    }
  };
  // Con la copia ya en uso la sesión se vuelve a pedir sola cada pocos segundos.
  const sessionFromDevice = () =>
    client.getQueryData<{ fromDevice?: boolean }>(SESSION_KEY)?.fromDevice ===
    true;

  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      // La consulta de la sesión no se invalida a sí misma: la guardia sigue montada mientras
      // redirige y la volvería a pedir en un ciclo sin fin.
      onError: (error, query) => {
        if (query.queryKey[0] !== SESSION_KEY[0]) invalidateSession(error);
      },
    }),
    mutationCache: new MutationCache({ onError: invalidateSession }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Los errores de cliente (4xx) no mejoran reintentando.
        retry: (failures, error) =>
          failures < 1 && !(isApiError(error) && error.status < 500),
      },
    },
  });
  return client;
}

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { isApiError, isUnauthorized } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';

const SESSION_KEY = queryKeys.session();

export function createQueryClient() {
  // Un 401 vuelve a comprobar la sesión; un permiso rechazado recarga sus permisos actuales.
  const invalidateSession = (error: unknown) => {
    if (
      isUnauthorized(error) ||
      (isApiError(error) &&
        error.status === 403 &&
        error.code === 'permission_denied')
    )
      void client.invalidateQueries({ queryKey: SESSION_KEY });
  };

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

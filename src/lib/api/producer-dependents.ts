import { useQuery } from '@tanstack/react-query';

import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Schemas = components['schemas'];

// Cuántas fincas se nombran: con más, el diálogo dice cuántas faltan por nombrar.
export const DEPENDENT_FARM_NAMES = 20;

// Lo que se eliminaría junto con un productor: sus fincas (por nombre) y sus cuentas (solo cuántas,
// nunca quiénes). Vive aquí y no en un dominio para que el de productores lo use sin importar el
// de fincas ni el de cuentas.
export const useProducerDependents = (producerId: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.producers.dependents(producerId),
    queryFn: async ({ signal }) => {
      const [farms, accounts] = await Promise.all([
        apiFetch<Schemas['PaginatedFarmList']>(
          `/api/farms?${new URLSearchParams({
            producer: producerId,
            page: '1',
            page_size: String(DEPENDENT_FARM_NAMES),
          })}`,
          { signal },
        ),
        apiFetch<Schemas['PaginatedAccountList']>(
          `/api/users?${new URLSearchParams({
            producer: producerId,
            page: '1',
            page_size: '1',
          })}`,
          { signal },
        ),
      ]);
      return {
        farmNames: farms.results.map((farm) => farm.name),
        farmCount: farms.count,
        accountCount: accounts.count,
      };
    },
    enabled,
    // Se mira justo antes de decidir: siempre lo vigente.
    staleTime: 0,
    gcTime: 0,
  });

'use client';

import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { isNeverLoaded } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import {
  matchesBuyerFilters,
  matchesBuyerSearch,
  sortBuyers,
} from './buyer-filters';
import { summarizeBuyers } from './buyer-summary';
import { useBuyers } from './queries';
import { useBuyerFilters } from './use-buyer-filters';

// Todo lo que la lista de compradores lee y decide antes de dibujarse: el directorio (o su copia),
// las filas con la búsqueda y los filtros, las cifras de la franja y qué puede hacer quien mira.
export function useBuyersScreen() {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const filters = useBuyerFilters();
  const superuser = user?.is_superuser === true;
  // La cuenta técnica elige el productor; sin elegirlo ve los de todos. Las demás ven el suyo.
  const producer = superuser ? filters.producer : null;
  const read = useBuyers(user?.id, producer);

  const all = read.data?.data ?? [];
  const searched = all.filter((buyer) =>
    matchesBuyerSearch(buyer, filters.filters),
  );
  const rows = sortBuyers(
    searched.filter((buyer) => matchesBuyerFilters(buyer, filters.filters)),
  );
  const savedAt = read.data?.savedAt;

  return {
    filters,
    superuser,
    producer,
    read,
    all,
    rows,
    // Se busca entre todos: el comprador de la URL se abre aunque los filtros lo escondan de la
    // lista. Uno que no está (de otro productor, o eliminado) se ignora.
    selected: all.find(({ id }) => id === filters.buyer) ?? null,
    summary: summarizeBuyers(searched, rows),
    savedAt,
    // Con la copia del dispositivo nada se escribe: lo que se cambie no llegaría al servidor.
    offline: !hasConnection || savedAt !== undefined,
    neverLoaded: isNeverLoaded(read),
    // Sin productor elegido, la cuenta técnica ve los de todos: cada fila dice de quién es.
    showProducer: superuser && !producer,
    canAdd: hasPermission(user, PERMISSIONS.BUYERS_ADD),
    permissions: {
      canChange: hasPermission(user, PERMISSIONS.BUYERS_CHANGE),
      canDelete: hasPermission(user, PERMISSIONS.BUYERS_DELETE),
    },
  };
}

export type BuyersScreenState = ReturnType<typeof useBuyersScreen>;

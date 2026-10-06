'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';

import { useActingProducer } from '@/hooks/use-acting-producer';

export const SCOPE_VIEWS = ['activo', 'todos'] as const;
export type ScopeView = (typeof SCOPE_VIEWS)[number];

// Usuarios y Roles de la cuenta técnica: con un productor elegido se ven por defecto solo los de
// ese productor, y "Todos" las agrupa por productor. La vista vive en la URL, como el resto de los
// filtros. Sin productor elegido no hay vista que escoger: se ve todo.
export function useProducerScope() {
  const { producerId, isSuperuser } = useActingProducer();
  const [view, setView] = useQueryState(
    'vista',
    parseAsStringLiteral(SCOPE_VIEWS).withDefault('activo'),
  );
  const offered = isSuperuser && producerId !== null;
  return {
    view,
    setView,
    // Se ofrece el control Del productor activo | Todos.
    offered,
    acting: offered ? producerId : null,
    // Solo los de este productor, por el filtro `producer` que ya tiene la API.
    scopedProducer: offered && view === 'activo' ? producerId : null,
  };
}

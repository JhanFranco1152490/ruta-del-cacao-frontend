import { useState } from 'react';

// Qué grupos de una lista agrupada están plegados. Todos empiezan abiertos: la vista agrupada
// muestra lo mismo que la lista y la persona pliega lo que no le interesa.
export function useGroupCollapse(keys: readonly string[]) {
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const allOpen = keys.every((key) => !closed.has(key));
  return {
    isOpen: (key: string) => !closed.has(key),
    toggle: (key: string) =>
      setClosed((previous) => {
        const next = new Set(previous);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }),
    allOpen,
    toggleAll: () => setClosed(allOpen ? new Set(keys) : new Set()),
  };
}

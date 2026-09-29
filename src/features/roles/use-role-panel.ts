'use client';
import { parseAsString, useQueryState } from 'nuqs';

export function useRolePanel() {
  const [selected, setSelected] = useQueryState(
    'rol',
    parseAsString.withOptions({ history: 'push' }),
  );
  return {
    selected,
    open: (id: string) => setSelected(id),
    close: () => setSelected(null),
  };
}

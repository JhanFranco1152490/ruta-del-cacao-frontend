'use client';
import { parseAsString, useQueryState } from 'nuqs';
export function useAccountPanel() {
  const [selected, setSelected] = useQueryState(
    'cuenta',
    parseAsString.withOptions({ history: 'push' }),
  );
  return {
    selected,
    open: (id: string) => setSelected(id),
    close: () => setSelected(null),
  };
}

export type ItemGroup<T> = { key: string; title: string; items: T[] };

// Agrupa sin reordenar: cada grupo queda donde aparece su primer elemento, y dentro de él, los
// elementos en el orden en que llegaron. El título sale del primero de cada grupo.
export function groupInOrder<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  titleOf: (first: T, key: string) => string,
): ItemGroup<T>[] {
  const groups = new Map<string, ItemGroup<T>>();
  for (const item of items) {
    const key = keyOf(item);
    let group = groups.get(key);
    if (!group) {
      group = { key, title: titleOf(item, key), items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return [...groups.values()];
}

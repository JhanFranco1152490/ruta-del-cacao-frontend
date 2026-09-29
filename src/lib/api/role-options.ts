import { useQuery } from '@tanstack/react-query';
import { fetchRoles, PAGE_SIZE, type Role } from './roles';
import { queryKeys } from './query-keys';

// Los selectores necesitan todas las páginas, no solo los primeros roles visibles.
export async function fetchRoleOptions(signal?: AbortSignal) {
  const first = await fetchRoles({}, signal);
  const roles: Role[] = [...first.results];
  for (let page = 2; page <= Math.ceil(first.count / PAGE_SIZE); page++) {
    const result = await fetchRoles({ page }, signal);
    roles.push(...result.results);
  }
  return roles;
}
export const useRoleOptions = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.roles.options(),
    queryFn: ({ signal }) => fetchRoleOptions(signal),
    enabled,
  });

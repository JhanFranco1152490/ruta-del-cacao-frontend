import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { LIST_REFETCH_INTERVAL_MS } from '@/lib/query-client';

type Schemas = components['schemas'];
export type Role = Schemas['Role'];
export type PermissionItem = Schemas['Permission'];
export type RoleCreate = Schemas['RoleCreateRequest'];
export type RoleUpdate = Schemas['PatchedRoleUpdateRequest'];
export type RoleQuery = {
  search?: string;
  kind?: Role['kind'];
  producer?: string;
  // Con `producer`: sus roles propios y también los del sistema.
  include_system?: boolean;
  // Con la vista agrupada por productor: `producer,name`.
  ordering?: string;
  page?: number;
};
export const PAGE_SIZE = 20;

export const fetchRoles = (query: RoleQuery, signal?: AbortSignal) => {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(PAGE_SIZE),
  });
  if (query.search) params.set('search', query.search);
  if (query.kind) params.set('kind', query.kind);
  if (query.producer) params.set('producer', query.producer);
  if (query.include_system) params.set('include_system', 'true');
  if (query.ordering) params.set('ordering', query.ordering);
  return apiFetch<Schemas['PaginatedRoleList']>(`/api/roles?${params}`, {
    signal,
  });
};
export const fetchRole = (id: string, signal?: AbortSignal) =>
  apiFetch<Role>(`/api/roles/${encodeURIComponent(id)}`, { signal });
export const fetchPermissionCatalog = (signal?: AbortSignal) =>
  apiFetch<Schemas['PermissionList']>('/api/permissions', { signal }).then(
    (data) => data.results,
  );

export const useRoles = (query: RoleQuery) =>
  useQuery({
    queryKey: queryKeys.roles.list(query),
    queryFn: ({ signal }) => fetchRoles(query, signal),
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
export const useRole = (id: string) =>
  useQuery({
    queryKey: queryKeys.roles.detail(id),
    queryFn: ({ signal }) => fetchRole(id, signal),
  });
export const usePermissionCatalog = () =>
  useQuery({
    queryKey: queryKeys.permissions(),
    queryFn: ({ signal }) => fetchPermissionCatalog(signal),
    staleTime: 0,
  });

function useCacheRole() {
  const client = useQueryClient();
  return (role: Role) => {
    client.setQueryData(queryKeys.roles.detail(role.id), role);
    void client.invalidateQueries({ queryKey: queryKeys.roles.lists() });
    void client.invalidateQueries({ queryKey: queryKeys.accounts.all() });
    void client.invalidateQueries({ queryKey: queryKeys.session() });
    void client.invalidateQueries({ queryKey: queryKeys.permissions() });
  };
}
export function useCreateRole() {
  const onSuccess = useCacheRole();
  return useMutation({
    mutationFn: (body: RoleCreate) =>
      apiFetch<Role>('/api/roles', { method: 'POST', body }),
    onSuccess,
  });
}
export function useUpdateRole() {
  const onSuccess = useCacheRole();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RoleUpdate }) =>
      apiFetch<Role>(`/api/roles/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess,
  });
}
export function useDeleteRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/roles/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: queryKeys.roles.detail(id) });
      void client.invalidateQueries({ queryKey: queryKeys.roles.lists() });
    },
  });
}

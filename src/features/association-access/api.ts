import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';

export type AssociationAccess = components['schemas']['AssociationAccess'];

const PATH = '/api/association-access';

export const useAssociationAccess = () =>
  useQuery({
    queryKey: queryKeys.associationAccess(),
    queryFn: ({ signal }) => apiFetch<AssociationAccess>(PATH, { signal }),
  });

export function useSetAssociationAccess() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      apiFetch<AssociationAccess>(PATH, { method: 'PUT', body: { enabled } }),
    onSuccess: (access) =>
      client.setQueryData(queryKeys.associationAccess(), access),
  });
}

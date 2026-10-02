import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { LIST_REFETCH_INTERVAL_MS } from '@/lib/query-client';

type Schemas = components['schemas'];
export type Account = Schemas['Account'];
export type AccountCreated = Schemas['AccountCreated'];
export type AccountCreate = Schemas['AccountCreateRequest'];
export type AccountQuery = {
  search?: string;
  status?: 'active' | 'inactive';
  activation_pending?: boolean;
  role?: string;
  producer?: string;
  municipality?: string;
  page?: number;
};
export const PAGE_SIZE = 20;
export const fetchAccounts = (query: AccountQuery, signal?: AbortSignal) => {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    page_size: String(PAGE_SIZE),
  });
  for (const key of [
    'search',
    'status',
    'role',
    'producer',
    'municipality',
  ] as const)
    if (query[key]) params.set(key, query[key]);
  if (query.activation_pending !== undefined)
    params.set('activation_pending', String(query.activation_pending));
  return apiFetch<Schemas['PaginatedAccountList']>(`/api/users?${params}`, {
    signal,
  });
};
export const fetchAccount = (id: string, signal?: AbortSignal) =>
  apiFetch<Account>(`/api/users/${encodeURIComponent(id)}`, { signal });
export const useAccounts = (query: AccountQuery) =>
  useQuery({
    queryKey: queryKeys.accounts.list(query),
    queryFn: ({ signal }) => fetchAccounts(query, signal),
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });
export const useAccount = (id: string) =>
  useQuery({
    queryKey: queryKeys.accounts.detail(id),
    queryFn: ({ signal }) => fetchAccount(id, signal),
  });
export function useCreateAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AccountCreate) =>
      apiFetch<AccountCreated>('/api/users', { method: 'POST', body }),
    onSuccess: (account) => {
      client.setQueryData(queryKeys.accounts.detail(account.id), account);
      void client.invalidateQueries({ queryKey: queryKeys.accounts.lists() });
    },
  });
}
export type AccountUpdate = Schemas['PatchedAccountUpdateRequest'];
export type AccountStatus = Schemas['StatusEnum'];
// La respuesta de cada cambio es la cuenta completa: reemplaza el detalle y refresca las listas.
function useAccountMutation<T>(send: (value: T) => Promise<Account>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: (account) => {
      client.setQueryData(queryKeys.accounts.detail(account.id), account);
      void client.invalidateQueries({ queryKey: queryKeys.accounts.lists() });
    },
  });
}
export const useUpdateAccount = (id: string) =>
  useAccountMutation((body: AccountUpdate) =>
    apiFetch<Account>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    }),
  );
export const useSetAccountRoles = (id: string) =>
  useAccountMutation((roleIds: string[]) =>
    apiFetch<Account>(`/api/users/${encodeURIComponent(id)}/roles`, {
      method: 'PUT',
      body: { role_ids: roleIds },
    }),
  );
export const useSetAccountStatus = (id: string) =>
  useAccountMutation((status: AccountStatus) =>
    apiFetch<Account>(`/api/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    }),
  );
export function useResendActivation() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Schemas['ActivationEmailSent']>(
        `/api/users/${encodeURIComponent(id)}/resend-activation`,
        { method: 'POST' },
      ),
  });
}

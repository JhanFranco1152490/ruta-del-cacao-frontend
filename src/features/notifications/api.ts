import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';
import { LIST_REFETCH_INTERVAL_MS } from '@/lib/query-client';

type Schemas = components['schemas'];
export type Notification = Schemas['Notification'];
type NotificationList = Schemas['PaginatedNotificationList'];

export const NOTIFICATIONS_PAGE_SIZE = 20;
export const NOTIFICATIONS_FIRST_PAGE_CACHE_KEY = 'notifications:first-page';
export const UNREAD_COUNT_CACHE_KEY = 'notifications:unread-count';

// Una página de la bandeja. `savedAt` solo en la primera leída de la copia del dispositivo.
export type NotificationPage = {
  results: Notification[];
  // Cuántas hay en total en la bandeja, leídas y sin leer.
  total: number;
  hasNext: boolean;
  savedAt?: number;
};

const fetchPage = (page: number, signal?: AbortSignal) => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(NOTIFICATIONS_PAGE_SIZE),
  });
  return apiFetch<NotificationList>(`/api/notifications?${params}`, {
    signal,
  });
};

const toPage = (
  { results, next, count }: NotificationList,
  savedAt?: number,
) => ({
  results,
  total: count,
  hasNext: !!next,
  savedAt,
});

// La bandeja de la cuenta, en el orden del servidor (las críticas sin leer primero), de a 20. Solo
// la primera página tiene copia: sin conexión se ve lo último que se cargó y no se ofrece más,
// porque la página siguiente de esa copia ya no corresponde a lo que hay en el servidor.
export const useNotifications = (
  userId: string | undefined,
  { enabled = true } = {},
) =>
  useInfiniteQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: async ({ pageParam, signal }): Promise<NotificationPage> => {
      if (pageParam > 1) return toPage(await fetchPage(pageParam, signal));
      const { data, savedAt } = await readThroughCache(
        userId!,
        NOTIFICATIONS_FIRST_PAGE_CACHE_KEY,
        () => fetchPage(1, signal),
      );
      return toPage(data, savedAt);
    },
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      last.hasNext && last.savedAt === undefined ? pages.length + 1 : undefined,
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

// El número de la campana. Se pide aparte, que es poco, cada 2 minutos mientras la pestaña está
// visible, al volver a ella y al recuperar la conexión; sin conexión, el último que se cargó.
export const useUnreadCount = (
  userId: string | undefined,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, UNREAD_COUNT_CACHE_KEY, () =>
        apiFetch<Schemas['UnreadCount']>('/api/notifications/unread-count', {
          signal,
        }),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
  });

// Leer y eliminar son solo con conexión: sin red fallan en el acto, y la pantalla ya los deshabilita.
// Después se vuelven a pedir la bandeja y el número, que cambian juntos.
function useNotificationChange<T>(
  mutationFn: (variables: T) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all(),
      }),
  });
}

export const useMarkNotificationRead = () =>
  useNotificationChange((id: string) =>
    apiFetch<void>(`/api/notifications/${id}/read`, { method: 'POST' }),
  );

export const useMarkAllNotificationsRead = () =>
  useNotificationChange(() =>
    apiFetch<Schemas['UpdatedCount']>('/api/notifications/read-all', {
      method: 'POST',
    }),
  );

export const useDismissNotification = () =>
  useNotificationChange((id: string) =>
    apiFetch<void>(`/api/notifications/${id}`, { method: 'DELETE' }),
  );

export const useRestoreNotification = () =>
  useNotificationChange((id: string) =>
    apiFetch<void>(`/api/notifications/${id}/restore`, { method: 'POST' }),
  );

export const useDismissReadNotifications = () =>
  useNotificationChange(() =>
    apiFetch<Schemas['DismissedCount']>('/api/notifications/dismiss-read', {
      method: 'POST',
    }),
  );

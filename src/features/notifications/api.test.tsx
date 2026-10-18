import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { buildNotification } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import {
  NOTIFICATIONS_FIRST_PAGE_CACHE_KEY,
  UNREAD_COUNT_CACHE_KEY,
  useDismissNotification,
  useDismissReadNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useRestoreNotification,
  useUnreadCount,
} from './api';

const newUser = () => `notifications-${crypto.randomUUID()}`;

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  const view = renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { ...view, client };
};

// Dos páginas: la primera dice que hay más.
const pagesHandler = (requests: URLSearchParams[] = []) =>
  http.get(apiUrl('/api/notifications'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    requests.push(params);
    return params.get('page') === '2'
      ? HttpResponse.json({
          count: 2,
          next: null,
          results: [buildNotification({ id: 'n2' })],
        })
      : HttpResponse.json({
          count: 2,
          next: apiUrl('/api/notifications?page=2'),
          results: [buildNotification({ id: 'n1' })],
        });
  });

const ids = (pages: { results: { id: string }[] }[] | undefined) =>
  pages?.flatMap(({ results }) => results.map(({ id }) => id));

describe('useNotifications', () => {
  it('reads the first page, keeps a copy and asks for the next one when asked', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(pagesHandler(requests));

    const { result } = render(() => useNotifications(userId));

    await waitFor(() =>
      expect(ids(result.current.data?.pages)).toEqual(['n1']),
    );
    expect(requests[0].get('page')).toBe('1');
    expect(requests[0].get('page_size')).toBe('20');
    expect(
      await getOfflineDb(userId).cache.get(NOTIFICATIONS_FIRST_PAGE_CACHE_KEY),
    ).toBeDefined();
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());

    await waitFor(() =>
      expect(ids(result.current.data?.pages)).toEqual(['n1', 'n2']),
    );
    expect(result.current.hasNextPage).toBe(false);
  });

  it('shows the saved first page without a connection and offers no more', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: NOTIFICATIONS_FIRST_PAGE_CACHE_KEY,
      value: {
        count: 2,
        next: apiUrl('/api/notifications?page=2'),
        results: [buildNotification({ id: 'saved' })],
      },
      fetchedAt: Date.parse('2026-10-18T07:00:00Z'),
    });
    server.use(
      http.get(apiUrl('/api/notifications'), () => HttpResponse.error()),
    );

    const { result } = render(() => useNotifications(userId));

    await waitFor(() =>
      expect(ids(result.current.data?.pages)).toEqual(['saved']),
    );
    expect(result.current.data?.pages[0].savedAt).toBe(
      Date.parse('2026-10-18T07:00:00Z'),
    );
    expect(result.current.hasNextPage).toBe(false);
  });

  it('asks for nothing while it is turned off', () => {
    const requests: URLSearchParams[] = [];
    server.use(pagesHandler(requests));

    render(() => useNotifications(newUser(), { enabled: false }));

    expect(requests).toHaveLength(0);
  });
});

describe('useUnreadCount', () => {
  it('reads the count and keeps a copy', async () => {
    const userId = newUser();
    server.use(
      http.get(apiUrl('/api/notifications/unread-count'), () =>
        HttpResponse.json({ count: 3 }),
      ),
    );

    const { result } = render(() => useUnreadCount(userId));

    await waitFor(() => expect(result.current.data?.data.count).toBe(3));
    expect(
      await getOfflineDb(userId).cache.get(UNREAD_COUNT_CACHE_KEY),
    ).toMatchObject({ value: { count: 3 } });
  });

  it('shows the saved count without a connection', async () => {
    const userId = newUser();
    await getOfflineDb(userId).cache.put({
      key: UNREAD_COUNT_CACHE_KEY,
      value: { count: 5 },
      fetchedAt: 1,
    });
    server.use(
      http.get(apiUrl('/api/notifications/unread-count'), () =>
        HttpResponse.error(),
      ),
    );

    const { result } = render(() => useUnreadCount(userId));

    await waitFor(() => expect(result.current.data?.data.count).toBe(5));
  });
});

describe('the changes to a notification', () => {
  const cases = [
    {
      name: 'marks one as read',
      method: 'post',
      path: '/api/notifications/n1/read',
      useRun: () => {
        const mutation = useMarkNotificationRead();
        return () => mutation.mutateAsync('n1');
      },
    },
    {
      name: 'marks all as read',
      method: 'post',
      path: '/api/notifications/read-all',
      useRun: () => {
        const mutation = useMarkAllNotificationsRead();
        return () => mutation.mutateAsync();
      },
    },
    {
      name: 'dismisses one',
      method: 'delete',
      path: '/api/notifications/n1',
      useRun: () => {
        const mutation = useDismissNotification();
        return () => mutation.mutateAsync('n1');
      },
    },
    {
      name: 'restores one',
      method: 'post',
      path: '/api/notifications/n1/restore',
      useRun: () => {
        const mutation = useRestoreNotification();
        return () => mutation.mutateAsync('n1');
      },
    },
    {
      name: 'dismisses the read ones',
      method: 'post',
      path: '/api/notifications/dismiss-read',
      useRun: () => {
        const mutation = useDismissReadNotifications();
        return () => mutation.mutateAsync();
      },
    },
  ] as const;

  it.each(cases)(
    '$name and refreshes the bell and the panel',
    async ({ method, path, useRun }) => {
      const sent: string[] = [];
      server.use(
        http[method](apiUrl(path), () => {
          sent.push(path);
          return path.endsWith('read-all')
            ? HttpResponse.json({ updated: 2 })
            : path.endsWith('dismiss-read')
              ? HttpResponse.json({ dismissed: 2 })
              : new HttpResponse(null, { status: 204 });
        }),
      );
      const { result, client } = render(useRun);
      client.setQueryData(queryKeys.notifications.unreadCount(), {
        data: { count: 3 },
      });

      await act(() => result.current());

      expect(sent).toEqual([path]);
      expect(
        client.getQueryState(queryKeys.notifications.unreadCount())
          ?.isInvalidated,
      ).toBe(true);
    },
  );
});

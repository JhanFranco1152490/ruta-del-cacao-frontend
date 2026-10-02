import { QueryObserver } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import {
  apiError,
  buildSession,
  sessionExpired as unauthorized,
} from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import { createQueryClient } from './query-client';

describe('createQueryClient', () => {
  it.each(['query', 'mutation'])(
    'invalidates permissions after a forbidden %s',
    async (kind) => {
      const client = createQueryClient();
      client.setQueryData(queryKeys.session(), buildSession());
      const fail = async () => {
        throw new ApiError(403, {
          code: 'permission_denied',
          detail: 'Sin permiso.',
          fields: {},
        });
      };

      const request =
        kind === 'query'
          ? client.fetchQuery({
              queryKey: ['probe'],
              queryFn: fail,
              retry: false,
            })
          : client
              .getMutationCache()
              .build(client, { mutationFn: fail })
              .execute(undefined);
      await expect(request).rejects.toMatchObject({
        code: 'permission_denied',
      });

      expect(client.getQueryState(queryKeys.session())?.isInvalidated).toBe(
        true,
      );
      client.clear();
    },
  );

  it('does not invalidate the session for a different forbidden code', async () => {
    const client = createQueryClient();
    client.setQueryData(queryKeys.session(), buildSession());
    await client
      .fetchQuery({
        queryKey: ['probe'],
        retry: false,
        queryFn: async () => {
          throw new ApiError(403, {
            code: 'self_modification',
            detail: 'No permitido.',
            fields: {},
          });
        },
      })
      .catch(() => undefined);
    expect(client.getQueryState(queryKeys.session())?.isInvalidated).toBe(
      false,
    );
    client.clear();
  });

  it('invalidates the session when any query ends in a 401', async () => {
    const client = createQueryClient();
    client.setQueryData(queryKeys.session(), buildSession());
    server.use(
      http.get(apiUrl('/api/producers'), unauthorized),
      http.post(apiUrl('/api/auth/refresh'), unauthorized),
    );

    await client
      .fetchQuery({
        queryKey: ['probe'],
        queryFn: () => apiFetch('/api/producers'),
        retry: false,
      })
      .catch(() => undefined);

    expect(client.getQueryState(queryKeys.session())?.isInvalidated).toBe(true);
  });

  it('invalidates the session when a mutation ends in a 401', async () => {
    const client = createQueryClient();
    client.setQueryData(queryKeys.session(), buildSession());
    server.use(
      http.post(apiUrl('/api/producers'), unauthorized),
      http.post(apiUrl('/api/auth/refresh'), unauthorized),
    );

    await client
      .getMutationCache()
      .build(client, {
        mutationFn: () =>
          apiFetch('/api/producers', { method: 'POST', body: {} }),
      })
      .execute(undefined)
      .catch(() => undefined);

    expect(client.getQueryState(queryKeys.session())?.isInvalidated).toBe(true);
  });

  it.each(['query', 'mutation'])(
    'asks for the session again when a %s gets no answer from the server',
    async (kind) => {
      const client = createQueryClient();
      client.setQueryData(queryKeys.session(), buildSession());
      server.use(
        http.get(apiUrl('/api/producers'), () => HttpResponse.error()),
        http.post(apiUrl('/api/producers'), () => HttpResponse.error()),
      );

      const request =
        kind === 'query'
          ? client.fetchQuery({
              queryKey: ['probe'],
              queryFn: () => apiFetch('/api/producers'),
              retry: false,
            })
          : client
              .getMutationCache()
              .build(client, {
                mutationFn: () =>
                  apiFetch('/api/producers', { method: 'POST', body: {} }),
              })
              .execute(undefined);
      await request.catch(() => undefined);

      expect(client.getQueryState(queryKeys.session())?.isInvalidated).toBe(
        true,
      );
      client.clear();
    },
  );

  it('does not ask again while the session already comes from the device copy', async () => {
    const client = createQueryClient();
    client.setQueryData(queryKeys.session(), {
      ...buildSession(),
      fromDevice: true,
    });
    server.use(http.get(apiUrl('/api/producers'), () => HttpResponse.error()));

    await client
      .fetchQuery({
        queryKey: ['probe'],
        queryFn: () => apiFetch('/api/producers'),
        retry: false,
      })
      .catch(() => undefined);

    expect(client.getQueryState(queryKeys.session())?.isInvalidated).toBe(
      false,
    );
  });

  it('does not touch the session for other errors', async () => {
    const client = createQueryClient();
    client.setQueryData(queryKeys.session(), buildSession());
    server.use(
      http.get(apiUrl('/api/producers'), () => apiError(404, 'not_found')),
    );

    await client
      .fetchQuery({
        queryKey: ['probe'],
        queryFn: () => apiFetch('/api/producers'),
        retry: false,
      })
      .catch(() => undefined);

    expect(client.getQueryState(queryKeys.session())?.isInvalidated).toBe(
      false,
    );
  });

  it.each([401, 403])(
    'does not ask again for a session that itself answered %s',
    async (status) => {
      const client = createQueryClient();
      let calls = 0;
      server.use(
        // Tras 5 intentos responde bien: si hubiera un ciclo, termina y se puede contar.
        http.get(apiUrl('/api/auth/me'), () =>
          ++calls <= 5
            ? apiError(
                status,
                status === 401 ? 'authentication_failed' : 'permission_denied',
              )
            : HttpResponse.json(buildSession()),
        ),
        http.post(apiUrl('/api/auth/refresh'), unauthorized),
      );
      const observer = new QueryObserver(client, {
        queryKey: queryKeys.session(),
        queryFn: () => apiFetch('/api/auth/me'),
        retry: false,
      });
      const unsubscribe = observer.subscribe(() => undefined);

      await waitFor(() =>
        expect(observer.getCurrentResult().isError).toBe(true),
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      unsubscribe();

      expect(calls).toBe(1);
    },
  );

  it('retries server and network failures once, but never client errors', () => {
    const retry = createQueryClient().getDefaultOptions().queries!.retry as (
      failures: number,
      error: unknown,
    ) => boolean;
    const serverError = new ApiError(500, {
      detail: 'x',
      code: 'internal_error',
      fields: {},
    });
    const clientError = new ApiError(404, {
      detail: 'x',
      code: 'not_found',
      fields: {},
    });

    expect(retry(0, serverError)).toBe(true);
    expect(retry(1, serverError)).toBe(false);
    expect(retry(0, new TypeError('Failed to fetch'))).toBe(true);
    expect(retry(0, clientError)).toBe(false);
  });
});

import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { syncActingProducer, writeActingProducer } from '@/lib/acting-producer';
import { apiError, buildProducer, buildSession } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useActingProducerSummary } from './use-acting-producer-summary';

const PRODUCER = '33333333-3333-4333-8333-333333333333';

function mockSuperuser(id: string) {
  server.use(
    http.get(apiUrl('/api/auth/me'), () =>
      HttpResponse.json(buildSession({ id, is_superuser: true })),
    ),
  );
}

function render() {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useActingProducerSummary(), { wrapper });
}

afterEach(() => {
  sessionStorage.clear();
  syncActingProducer(null);
});

describe('useActingProducerSummary', () => {
  it('does nothing without a chosen producer', async () => {
    const id = `su-${crypto.randomUUID()}`;
    mockSuperuser(id);

    const { result } = render();

    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('gives the name and code of the chosen producer', async () => {
    const id = `su-${crypto.randomUUID()}`;
    mockSuperuser(id);
    writeActingProducer(id, PRODUCER);
    server.use(
      http.get(apiUrl(`/api/producers/${PRODUCER}`), () =>
        HttpResponse.json(
          buildProducer({
            id: PRODUCER,
            first_name: 'Ana',
            last_name: 'Prueba',
            member_code: 'PROD-000007',
          }),
        ),
      ),
    );

    const { result } = render();

    await waitFor(() =>
      expect(result.current.data).toMatchObject({
        first_name: 'Ana',
        member_code: 'PROD-000007',
      }),
    );
  });

  it('uses the copy of the device when the server does not answer', async () => {
    const id = `su-${crypto.randomUUID()}`;
    mockSuperuser(id);
    writeActingProducer(id, PRODUCER);
    server.use(
      http.get(apiUrl(`/api/producers/${PRODUCER}`), () =>
        HttpResponse.json(buildProducer({ id: PRODUCER, first_name: 'Ana' })),
      ),
    );
    const online = render();
    await waitFor(() => expect(online.result.current.data).toBeDefined());

    server.use(
      http.get(apiUrl(`/api/producers/${PRODUCER}`), () =>
        HttpResponse.error(),
      ),
    );
    const offline = render();

    await waitFor(() =>
      expect(offline.result.current.data).toMatchObject({ first_name: 'Ana' }),
    );
  });

  it('reports a producer that no longer exists', async () => {
    const id = `su-${crypto.randomUUID()}`;
    mockSuperuser(id);
    writeActingProducer(id, PRODUCER);
    server.use(
      http.get(apiUrl(`/api/producers/${PRODUCER}`), () =>
        apiError(404, 'not_found'),
      ),
    );

    const { result } = render();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 404 });
  });
});

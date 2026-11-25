import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { AuditLogFilters } from '@/lib/api/query-keys';
import {
  buildAuditEntry,
  buildAuditOptions,
  buildPage,
} from '@/test/factories';
import { apiUrl, auditLogHandler, auditOptionsHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useAuditLog, useAuditOptions } from './queries';

const FILTERS: AuditLogFilters = {
  producer: null,
  actor: 'acc-2',
  recordType: 'harvest',
  from: '2026-11-01',
  to: null,
  page: 2,
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe('useAuditLog', () => {
  it('asks the log with only the filters that are set, and its page size', async () => {
    const requests: URLSearchParams[] = [];
    server.use(auditLogHandler(buildPage([buildAuditEntry()], 21), requests));

    const { result } = renderHook(() => useAuditLog(FILTERS, true), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data?.count).toBe(21));
    expect(result.current.data?.results[0].action_label).toBe(
      'Cosecha corregida',
    );
    expect(Object.fromEntries(requests[0])).toEqual({
      actor: 'acc-2',
      record_type: 'harvest',
      from: '2026-11-01',
      page: '2',
      page_size: '20',
    });
  });

  it('asks nothing while it is not enabled', async () => {
    const requests: URLSearchParams[] = [];
    server.use(auditLogHandler(undefined, requests));

    const { result } = renderHook(() => useAuditLog(FILTERS, false), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toHaveLength(0);
  });

  it('gives back the error the server answered', async () => {
    server.use(
      auditLogHandler(
        HttpResponse.json(
          {
            code: 'not_found',
            detail: 'No encontrado.',
            fields: { actor: ['La cuenta no es de este productor.'] },
          },
          { status: 404 },
        ),
      ),
    );

    const { result } = renderHook(() => useAuditLog(FILTERS, true), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({
      status: 404,
      fields: { actor: ['La cuenta no es de este productor.'] },
    });
  });
});

describe('useAuditLog while the next page comes', () => {
  // El servidor tarda: la consulta nueva queda pendiente y se ve qué se usa de relleno.
  const slowLog = () =>
    http.get(apiUrl('/api/audit-log'), () => delay('infinite'));

  async function firstPage(producer: string | null) {
    server.use(auditLogHandler());
    const hook = renderHook(
      (filters: AuditLogFilters) => useAuditLog(filters, true),
      { wrapper, initialProps: { ...FILTERS, producer, page: 1 } },
    );
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    return hook;
  }

  it('keeps the previous page in sight while the next one comes', async () => {
    const { result, rerender } = await firstPage('pr-1');
    server.use(slowLog());

    rerender({ ...FILTERS, producer: 'pr-1', page: 2 });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.results).toHaveLength(7);
  });

  it('never shows the log of another producer while the new one comes', async () => {
    const { result, rerender } = await firstPage('pr-1');
    server.use(slowLog());

    rerender({ ...FILTERS, producer: 'pr-2', page: 1 });

    expect(result.current.data).toBeUndefined();
  });
});

describe('useAuditOptions', () => {
  it('asks the users and record types, with the producer only when there is one', async () => {
    const requests: URLSearchParams[] = [];
    server.use(auditOptionsHandler(buildAuditOptions(), requests));

    const { result, rerender } = renderHook(
      ({ producer }) => useAuditOptions(producer, true),
      { wrapper, initialProps: { producer: null as string | null } },
    );

    await waitFor(() => expect(result.current.data?.actors).toHaveLength(3));
    expect(requests[0].toString()).toBe('');

    rerender({ producer: 'pr-1' });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1].get('producer')).toBe('pr-1');
  });
});

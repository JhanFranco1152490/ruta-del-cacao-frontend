import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { QualityFilters } from '@/lib/api/query-keys';
import {
  buildLotQuality,
  buildQualityEvaluation,
  buildQualitySummary,
} from '@/test/factories';
import {
  apiUrl,
  qualityDetailHandler,
  qualityListHandler,
  qualitySummaryHandler,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useQualityLot, useQualityLots, useQualitySummary } from './api';

const render = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

const newUser = () => `quality-${crypto.randomUUID()}`;

const NO_FILTERS: QualityFilters = {
  producer: null,
  farm: null,
  search: '',
  page: 1,
};

describe('useQualityLots', () => {
  it('asks for the tab with its filters, leaving out what is empty', async () => {
    const requests: URLSearchParams[] = [];
    server.use(qualityListHandler([buildLotQuality()], requests));

    const { result } = render(() =>
      useQualityLots(newUser(), 'evaluated', {
        ...NO_FILTERS,
        farm: 'f1',
        search: ' F02 ',
        page: 2,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe(
      'view=evaluated&farm=f1&search=F02&page=2',
    );
    expect(result.current.data?.data.results).toHaveLength(1);
  });

  it('shows the copy of the first page without a network', async () => {
    const userId = newUser();
    server.use(qualityListHandler([buildLotQuality()]));
    const first = render(() =>
      useQualityLots(userId, 'to_evaluate', NO_FILTERS),
    );
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    server.use(http.get(apiUrl('/api/quality'), () => HttpResponse.error()));
    const offline = render(() =>
      useQualityLots(userId, 'to_evaluate', NO_FILTERS),
    );

    await waitFor(() => expect(offline.result.current.isSuccess).toBe(true));
    expect(offline.result.current.data?.savedAt).toBeDefined();
    expect(offline.result.current.data?.data.results).toHaveLength(1);
  });

  it('keeps each tab apart in the copy', async () => {
    const userId = newUser();
    server.use(qualityListHandler([buildLotQuality()]));
    const first = render(() =>
      useQualityLots(userId, 'to_evaluate', NO_FILTERS),
    );
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    server.use(http.get(apiUrl('/api/quality'), () => HttpResponse.error()));
    const other = render(() => useQualityLots(userId, 'closed', NO_FILTERS));

    await waitFor(() => expect(other.result.current.isError).toBe(true));
  });

  it('keeps no copy of the next pages', async () => {
    const userId = newUser();
    const second = { ...NO_FILTERS, page: 2 };
    server.use(qualityListHandler([buildLotQuality()]));
    const first = render(() => useQualityLots(userId, 'to_evaluate', second));
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    server.use(http.get(apiUrl('/api/quality'), () => HttpResponse.error()));
    const offline = render(() => useQualityLots(userId, 'to_evaluate', second));

    await waitFor(() => expect(offline.result.current.isError).toBe(true));
  });
});

describe('useQualitySummary', () => {
  it('asks for the figures with the filters, and keeps a copy', async () => {
    const userId = newUser();
    const requests: URLSearchParams[] = [];
    server.use(
      qualitySummaryHandler(buildQualitySummary({ evaluated: 2 }), requests),
    );
    const filters = { producer: 'p1', farm: null, search: '' };
    const first = render(() => useQualitySummary(userId, filters));
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(requests[0].toString()).toBe('producer=p1');

    server.use(
      http.get(apiUrl('/api/quality/summary'), () => HttpResponse.error()),
    );
    const offline = render(() => useQualitySummary(userId, filters));

    await waitFor(() => expect(offline.result.current.isSuccess).toBe(true));
    expect(offline.result.current.data?.data.evaluated).toBe(2);
  });
});

describe('useQualityLot', () => {
  it('reads the quality of a lot', async () => {
    server.use(
      qualityDetailHandler(
        buildLotQuality({ evaluation: buildQualityEvaluation() }),
      ),
    );

    const { result } = render(() => useQualityLot('l1', true));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.evaluation?.evaluated_by.full_name).toBe(
      'Cuenta de prueba',
    );
  });

  it('asks for nothing without permission to evaluate', () => {
    let asked = false;
    server.use(
      http.get(apiUrl('/api/quality/:id'), () => {
        asked = true;
        return HttpResponse.json(buildLotQuality());
      }),
    );

    render(() => useQualityLot('l1', false));

    expect(asked).toBe(false);
  });
});

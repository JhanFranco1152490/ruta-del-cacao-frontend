import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { ReportFilters } from '@/lib/api/query-keys';
import { buildAssociationReport, buildReport } from '@/test/factories';
import {
  associationReportHandler,
  producerReportHandler,
} from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useReport } from './queries';

const FILTERS: ReportFilters = {
  type: 'production',
  from: '2026-01-01',
  to: '2026-03-31',
  producer: null,
  municipality: null,
  farm: 'f1',
  plot: null,
  lot: null,
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe('useReport', () => {
  it('asks the producer report with only the filters that are set', async () => {
    const requests: URLSearchParams[] = [];
    server.use(producerReportHandler(buildReport(), requests));

    const { result } = renderHook(() => useReport('producer', FILTERS, true), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data?.title).toBe('Producción'));
    expect(Object.fromEntries(requests[0])).toEqual({
      type: 'production',
      from: '2026-01-01',
      to: '2026-03-31',
      farm: 'f1',
    });
  });

  it('asks the association report at its own path', async () => {
    const requests: URLSearchParams[] = [];
    server.use(associationReportHandler(buildAssociationReport(), requests));

    const { result } = renderHook(
      () =>
        useReport('association', { ...FILTERS, municipality: '54001' }, true),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.data?.title).toBe('Comercialización'),
    );
    expect(requests[0].get('municipality')).toBe('54001');
  });

  // El reporte se genera al tocar Generar, no a cada cambio de un filtro.
  it('asks nothing until the report is generated', () => {
    const requests: URLSearchParams[] = [];
    server.use(producerReportHandler(buildReport(), requests));

    const { result } = renderHook(() => useReport('producer', FILTERS, false), {
      wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(requests).toEqual([]);
  });
});

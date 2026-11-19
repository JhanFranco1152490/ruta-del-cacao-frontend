import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { isNotFound } from '@/lib/api/errors';
import { apiError } from '@/test/factories';
import { lotHistoryHandler } from '@/test/handlers';
import { buildLotHistory } from '@/test/lot-history-factories';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useLotHistory } from './api';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe('useLotHistory', () => {
  it('reads the history of the lot it is given', async () => {
    const requested: string[] = [];
    server.use(lotHistoryHandler(buildLotHistory(), requested));

    const { result } = renderHook(() => useLotHistory('l1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requested).toEqual(['l1']);
    expect(result.current.data?.stages.map((stage) => stage.kind)).toEqual([
      'harvest',
      'lot_created',
      'fermentation',
      'drying',
      'evaluation',
      'classification',
      'stock_entry',
      'stock_move',
      'stock_exit',
      'sale',
    ]);
  });

  it('reports a lot that does not exist or is out of reach as not found', async () => {
    server.use(lotHistoryHandler(apiError(404, 'not_found')));

    const { result } = renderHook(() => useLotHistory('l9'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isNotFound(result.current.error)).toBe(true);
  });

  it('does not ask without a lot', () => {
    const requested: string[] = [];
    server.use(lotHistoryHandler(buildLotHistory(), requested));

    const { result } = renderHook(() => useLotHistory(''), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(requested).toEqual([]);
  });
});

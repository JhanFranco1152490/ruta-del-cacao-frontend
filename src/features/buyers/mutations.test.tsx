import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { apiError, buildBuyer } from '@/test/factories';
import { buyerWriteHandler, csrfHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useCreateBuyer, useDeleteBuyer, useUpdateBuyer } from './mutations';

function renderWithClient<T>(hook: () => T) {
  const queryClient = createTestQueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { invalidate, ...renderHook(hook, { wrapper }) };
}

const refreshed = { queryKey: queryKeys.buyers.all() };

describe('writing a buyer', () => {
  it('registers one and refreshes the list', async () => {
    const bodies: unknown[] = [];
    server.use(csrfHandler, buyerWriteHandler('create', buildBuyer(), bodies));
    const { result, invalidate } = renderWithClient(() => useCreateBuyer());

    const body = {
      name: 'Chocolates del Oriente S.A.S.',
      document_type: 'NIT',
      identity_document: '900000001',
      buyer_type: 'chocolate_industry',
      phone: '3000000001',
    } as const;
    await result.current.mutateAsync(body);

    expect(bodies).toEqual([body]);
    expect(invalidate).toHaveBeenCalledWith(refreshed);
  });

  it('edits one with the version read, and refreshes the list even when it fails', async () => {
    const bodies: unknown[] = [];
    server.use(
      csrfHandler,
      buyerWriteHandler('update', apiError(409, 'stale_version'), bodies),
    );
    const { result, invalidate } = renderWithClient(() => useUpdateBuyer());

    await expect(
      result.current.mutateAsync({
        id: 'b1',
        body: { is_active: false, expected_version: 3 },
      }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(bodies).toEqual([{ is_active: false, expected_version: 3 }]);
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith(refreshed));
  });

  it('deletes one with the version read in the address, and refreshes the list', async () => {
    const requests: URLSearchParams[] = [];
    server.use(csrfHandler, buyerWriteHandler('delete', null, requests));
    const { result, invalidate } = renderWithClient(() => useDeleteBuyer());

    await result.current.mutateAsync({ id: 'b1', expectedVersion: 3 });

    expect(requests[0].toString()).toBe('expected_version=3');
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith(refreshed));
  });
});

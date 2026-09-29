import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { municipalitiesHandler } from '@/test/handlers';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';

import { useMunicipalityName } from './api';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe('catalogs api', () => {
  it('resolves municipality names and falls back to a dash for unknown codes', async () => {
    server.use(municipalitiesHandler([{ code: '54001', name: 'Cúcuta' }]));
    const { result } = renderHook(() => useMunicipalityName(), { wrapper });

    await waitFor(() => expect(result.current('54001')).toBe('Cúcuta'));
    expect(result.current('99999')).toBe('—');
  });
});

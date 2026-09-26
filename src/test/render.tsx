import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing';
import type { ReactElement, ReactNode } from 'react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // gcTime infinito: con 0, los datos que un test escribe en la caché sin observadores se
      // borran antes de que la mutación termine y la aserción falla de forma intermitente.
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

type Options = Omit<RenderOptions, 'wrapper'> & {
  queryClient?: QueryClient;
  searchParams?: string | Record<string, string>;
  onUrlUpdate?: OnUrlUpdateFunction;
};

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    searchParams,
    onUrlUpdate,
    ...options
  }: Options = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NuqsTestingAdapter
          searchParams={searchParams}
          onUrlUpdate={onUrlUpdate}
          hasMemory
        >
          {children}
        </NuqsTestingAdapter>
      </QueryClientProvider>
    );
  }
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

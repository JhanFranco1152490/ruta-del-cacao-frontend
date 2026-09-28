'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useState, type ReactNode } from 'react';

import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { createQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <ServiceWorkerRegistration />
        {children}
      </NuqsAdapter>
    </QueryClientProvider>
  );
}

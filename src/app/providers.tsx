'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useState, type ReactNode } from 'react';

import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { SYNC_ADAPTERS } from '@/config/sync-adapters';
import { registerAdapter } from '@/lib/offline/sync-queue';
import { createQueryClient } from '@/lib/query-client';

// Se registran aquí, al cargar la app y antes de que la sesión arranque la cola: sin su adapter,
// un recurso pendiente no se envía. Hacerlo desde la pantalla de un dominio haría que ese
// dominio dependiera de todos los demás. Registrar dos veces el mismo recurso lo reemplaza, así
// que volver a cargar el módulo no duplica nada.
SYNC_ADAPTERS.forEach(registerAdapter);

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

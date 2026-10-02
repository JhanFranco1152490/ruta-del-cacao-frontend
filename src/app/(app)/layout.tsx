'use client';

// Del lado del cliente: entrega a la sesión las vistas de la bandeja, que son funciones y
// componentes, y eso no puede cruzar desde un componente de servidor.
import type { ReactNode } from 'react';

import { QUEUE_VIEWS } from '@/config/queue-views';
import { SessionGuard } from '@/features/auth/components/session-guard';
import { SessionShell } from '@/features/auth/components/session-shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGuard>
      <SessionShell queueViews={QUEUE_VIEWS}>{children}</SessionShell>
    </SessionGuard>
  );
}

'use client';

// Del lado del cliente: entrega a la sesión las vistas de la bandeja, que son funciones y
// componentes, y eso no puede cruzar desde un componente de servidor. También la campana de las
// notificaciones, que es de otro dominio que la sesión.
import type { ReactNode } from 'react';

import { QUEUE_VIEWS } from '@/config/queue-views';
import { SessionGuard } from '@/features/auth/components/session-guard';
import { SessionShell } from '@/features/auth/components/session-shell';
import { NotificationCenter } from '@/features/notifications/components/notification-center';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGuard>
      <SessionShell
        headerActions={<NotificationCenter />}
        queueViews={QUEUE_VIEWS}
      >
        {children}
      </SessionShell>
    </SessionGuard>
  );
}

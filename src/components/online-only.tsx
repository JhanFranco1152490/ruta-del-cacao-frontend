'use client';

import type { ReactNode } from 'react';

import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { PageNotice } from '@/components/page-notice';
import { useHasConnection } from '@/hooks/use-has-connection';

// Secciones de oficina: sin conexión no tienen datos guardados que mostrar, así que lo dicen en
// vez de fallar. Las capturas de campo no pasan por aquí.
export function OnlineOnly({ children }: { children: ReactNode }) {
  const hasConnection = useHasConnection();
  if (hasConnection) return children;
  return (
    <PageNotice
      illustration={OfflineCloud}
      title="Esta sección necesita conexión"
      description="Las fincas y sus capturas sí funcionan sin conexión."
    />
  );
}

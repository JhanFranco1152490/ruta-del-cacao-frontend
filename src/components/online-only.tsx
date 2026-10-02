'use client';

import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { useIsOnline } from '@/hooks/use-is-online';

// Secciones de oficina: sin conexión no tienen datos guardados que mostrar, así que lo dicen en
// vez de fallar. Las capturas de campo no pasan por aquí.
export function OnlineOnly({ children }: { children: ReactNode }) {
  const isOnline = useIsOnline();
  if (isOnline) return children;
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <EmptyState
        title="Esta sección necesita conexión"
        description="Las fincas y sus capturas sí funcionan sin conexión."
      />
    </div>
  );
}

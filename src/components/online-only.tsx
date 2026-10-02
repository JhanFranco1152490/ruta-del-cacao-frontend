'use client';

import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { useIsOnline } from '@/hooks/use-is-online';
import { useSessionSource } from '@/hooks/use-session';

// Secciones de oficina: sin conexión no tienen datos guardados que mostrar, así que lo dicen en
// vez de fallar. Las capturas de campo no pasan por aquí. El navegador puede decir que hay red
// sin que llegue nada (señal débil, wifi sin internet): también cuenta como sin conexión si el
// servidor no respondió al pedir la sesión.
export function OnlineOnly({ children }: { children: ReactNode }) {
  const isOnline = useIsOnline();
  const sessionSource = useSessionSource();
  if (isOnline && sessionSource !== 'device') return children;
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <EmptyState
        title="Esta sección necesita conexión"
        description="Las fincas y sus capturas sí funcionan sin conexión."
      />
    </div>
  );
}

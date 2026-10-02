'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { PageNotice } from '@/components/page-notice';
import { homeNavItem, NAV_ITEMS } from '@/config/navigation';
import { useHasConnection } from '@/hooks/use-has-connection';

import { useSession } from '../api';

// Puerta de entrada: lleva a la primera sección que la persona puede ver. Sigue siendo el
// destino del logo, del inicio de sesión y de la app instalada, así que ninguna dirección
// guardada se rompe.
export function HomeRedirect() {
  const router = useRouter();
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const home = user
    ? homeNavItem(NAV_ITEMS, user.permissions, hasConnection)
    : undefined;

  useEffect(() => {
    if (home) router.replace(home.href);
  }, [home, router]);

  if (user && !home) {
    return (
      <PageNotice
        title="Tu cuenta todavía no tiene secciones asignadas"
        description="Pide a quien administra tu cuenta que te asigne un rol."
      />
    );
  }
  return (
    <p role="status" className="sr-only">
      Abriendo tu sección…
    </p>
  );
}

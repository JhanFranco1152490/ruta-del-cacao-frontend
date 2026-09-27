'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppHeader } from '@/components/layout/app-header';
import { AppShell } from '@/components/layout/app-shell';
import { NavList } from '@/components/layout/nav-list';
import { NAV_ITEMS, visibleNavItems } from '@/config/navigation';

import { useLogout, useSession } from '../api';

// Conecta el marco con la sesión: correo, cierre de sesión y menú según los permisos.
export function SessionShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user } = useSession();
  const logout = useLogout();
  const items = visibleNavItems(NAV_ITEMS, user?.permissions);

  return (
    <AppShell
      header={
        <AppHeader
          email={user?.email}
          isLoggingOut={logout.isPending}
          logoutFailed={logout.isError}
          onLogout={() =>
            logout.mutate(undefined, { onSuccess: () => router.replace('/') })
          }
        />
      }
      sidebar={<NavList items={items} />}
    >
      {children}
    </AppShell>
  );
}

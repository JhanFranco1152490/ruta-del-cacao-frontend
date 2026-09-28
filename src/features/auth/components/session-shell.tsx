'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { AppHeader } from '@/components/layout/app-header';
import { AppShell } from '@/components/layout/app-shell';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NavList } from '@/components/layout/nav-list';
import { SidebarToggle } from '@/components/layout/sidebar-toggle';
import { useSidebarVisibility } from '@/components/layout/use-sidebar-visibility';
import { NAV_ITEMS, visibleNavItems } from '@/config/navigation';
import { runOfflineBootstrap } from '@/lib/offline/bootstrap';

import { useLogout, useSession } from '../api';

// Conecta el marco con la sesión: correo, cierre de sesión y menú según los permisos.
export function SessionShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user } = useSession();
  const logout = useLogout();
  const sidebar = useSidebarVisibility();
  const items = visibleNavItems(NAV_ITEMS, user?.permissions);

  // Arranca el motor offline con la sesión activa: purga lo huérfano, procesa lo pendiente y
  // vuelve a intentar cuando regresa la conexión o el Service Worker avisa que corrió una
  // sincronización en segundo plano.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    void runOfflineBootstrap(userId);

    const onOnline = () => void runOfflineBootstrap(userId);
    window.addEventListener('online', onOnline);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'cacao-sync') void runOfflineBootstrap(userId);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('online', onOnline);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [user?.id]);

  return (
    <AppShell
      header={
        <AppHeader
          email={user?.email}
          isLoggingOut={logout.isPending}
          logoutFailed={logout.isError}
          mobileNav={<MobileNav items={items} />}
          sidebarToggle={
            items.length > 0 && (
              <SidebarToggle
                hidden={sidebar.hidden}
                onToggle={sidebar.toggle}
              />
            )
          }
          onLogout={() =>
            logout.mutate(undefined, { onSuccess: () => router.replace('/') })
          }
        />
      }
      sidebar={<NavList items={items} />}
      sidebarHidden={sidebar.hidden}
    >
      {children}
    </AppShell>
  );
}

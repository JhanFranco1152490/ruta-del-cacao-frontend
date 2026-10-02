'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { AccountMenu } from '@/components/layout/account-menu';
import { AppHeader } from '@/components/layout/app-header';
import { AppShell } from '@/components/layout/app-shell';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NavList } from '@/components/layout/nav-list';
import { SidebarToggle } from '@/components/layout/sidebar-toggle';
import { useSidebarVisibility } from '@/components/layout/use-sidebar-visibility';
import { SectionGate } from '@/components/section-gate';
import type { QueueView } from '@/components/sync-tray/queue-view';
import { SyncTray } from '@/components/sync-tray/sync-tray';
import { NAV_ITEMS, visibleNavItems } from '@/config/navigation';
import { SIGN_IN_PATH } from '@/config/routes';
import { useQueueItems } from '@/hooks/use-queue-items';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { fullName } from '@/lib/format/person-name';
import { runOfflineBootstrap } from '@/lib/offline/bootstrap';
import { recordLogin } from '@/lib/offline/session-clock';
import { saveSessionSnapshot } from '@/lib/offline/session-snapshot';

import { useLogout, useSession, useSessionConfirmed } from '../api';
import { AccountDialog } from './account-dialog';

// Conecta el marco con la sesión: menú según los permisos, cuenta, bandeja del dispositivo y la
// comprobación de permiso y conexión de cada sección.
export function SessionShell({
  children,
  queueViews = [],
}: {
  children: ReactNode;
  // Cómo se ve cada recurso en la bandeja de registros del dispositivo.
  queueViews?: readonly QueueView[];
}) {
  const router = useRouter();
  const { data: user } = useSession();
  const confirmed = useSessionConfirmed();
  const logout = useLogout();
  const sidebar = useSidebarVisibility();
  const [accountOpen, setAccountOpen] = useState(false);
  const syncStatus = useSyncStatus(user?.id);
  const queueItems = useQueueItems(user?.id);
  const items = visibleNavItems(NAV_ITEMS, user?.permissions);

  // Toca el reloj de sesión y guarda la copia del dispositivo cada vez que el servidor confirma
  // la sesión (no solo cuando se escribe la contraseña): la sesión se renueva sola en segundo
  // plano, así que exigir un inicio de sesión explícito para seguir contando la ventana offline
  // purgaría el trabajo de alguien que sigue activo a diario. Con la copia del dispositivo no:
  // la copia no puede renovarse a sí misma.
  useEffect(() => {
    if (!user || !confirmed) return;
    void recordLogin(user.id);
    void saveSessionSnapshot(user);
  }, [user, confirmed]);

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
          actions={
            <>
              <SyncTray
                status={syncStatus}
                items={queueItems}
                views={queueViews}
              />
              <AccountMenu
                label={user && (fullName(user) || user.email)}
                isLoggingOut={logout.isPending}
                onOpenAccount={() => setAccountOpen(true)}
                onLogout={() =>
                  logout.mutate(undefined, {
                    onSuccess: () => router.replace(SIGN_IN_PATH),
                  })
                }
              />
            </>
          }
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
        />
      }
      sidebar={<NavList items={items} />}
      sidebarHidden={sidebar.hidden}
    >
      <SectionGate items={NAV_ITEMS}>{children}</SectionGate>
      {user && (
        <AccountDialog
          user={user}
          open={accountOpen}
          onOpenChange={setAccountOpen}
        />
      )}
    </AppShell>
  );
}

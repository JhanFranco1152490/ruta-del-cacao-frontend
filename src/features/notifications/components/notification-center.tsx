'use client';

import { useState } from 'react';

import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { useSession } from '@/hooks/use-session';

import { useUnreadCount } from '../api';
import { receivesNotifications } from '../notification-access';
import { useNotificationLink } from '../use-notification-link';
import { NotificationBell } from './notification-bell';
import { NotificationsPanel } from './notifications-panel';

// Lo que las notificaciones ponen en la cabecera: la campana y su panel, solo para quien recibe
// avisos. También atiende, en cualquier pantalla, los enlaces con que llega quien toca una push.
export function NotificationCenter() {
  const { data: user } = useSession();
  const [open, setOpen] = useState(false);
  const receives = receivesNotifications(user);
  const count = useUnreadCount(user?.id, { enabled: receives });
  useNotificationLink({
    enabled: receives,
    onOpenPanel: () => setOpen(true),
  });

  if (!receives) return null;
  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        render={<NotificationBell count={count.data?.data.count ?? 0} />}
      />
      {open && <NotificationsPanel onClose={() => setOpen(false)} />}
    </Sheet>
  );
}

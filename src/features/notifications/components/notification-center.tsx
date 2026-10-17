'use client';

import { useSession } from '@/hooks/use-session';

import { useUnreadCount } from '../api';
import { receivesNotifications } from '../notification-access';
import { NotificationBell } from './notification-bell';

// Lo que las notificaciones ponen en la cabecera: la campana, solo para quien recibe avisos.
export function NotificationCenter() {
  const { data: user } = useSession();
  const receives = receivesNotifications(user);
  const count = useUnreadCount(user?.id, { enabled: receives });

  if (!receives) return null;
  return <NotificationBell count={count.data?.data.count ?? 0} />;
}

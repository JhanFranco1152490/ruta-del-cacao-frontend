'use client';

import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { todayInBogota } from '@/lib/format/dates';

import { useNotifications, useUnreadCount } from '../api';
import { describeNotification } from '../notification-text';
import { receivedText } from '../received-text';
import { NotificationItem } from './notification-item';
import { NotificationsActions } from './notifications-actions';

// El contenido del panel de la campana. Solo pide la lista mientras está abierto.
export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { data: user } = useSession();
  const notifications = useNotifications(user?.id);
  const unread = useUnreadCount(user?.id).data?.data.count ?? 0;
  const items = notifications.data?.pages.flatMap(({ results }) => results);
  // Las leídas son las que hay menos las sin leer: la lista no las cuenta aparte.
  const total = notifications.data?.pages[0]?.total ?? 0;
  const read = Math.max(0, total - unread);
  const today = todayInBogota();
  const now = new Date();

  return (
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle className="font-serif text-xl text-selva">
          Notificaciones
        </SheetTitle>
        <SheetDescription>
          Los avisos de tus actividades y de los controles pendientes.
        </SheetDescription>
      </SheetHeader>
      <NotificationsActions read={read} unread={unread} />
      {notifications.isPending && (
        <div aria-label="Cargando notificaciones" role="status">
          <Skeleton className="h-48" />
        </div>
      )}
      {notifications.isError && (
        <ErrorState
          message="No fue posible cargar las notificaciones."
          onRetry={() => void notifications.refetch()}
        />
      )}
      {items?.length === 0 && (
        <p className="text-muted-foreground">No tienes notificaciones</p>
      )}
      {!!items?.length && (
        <ul aria-label="Notificaciones" className="space-y-2">
          {items.map((notification) => (
            <li key={notification.id}>
              <NotificationItem
                notification={notification}
                onClose={onClose}
                received={receivedText(notification.created_at, now)}
                view={describeNotification(notification, {
                  userId: user?.id,
                  today,
                })}
              />
            </li>
          ))}
        </ul>
      )}
      {notifications.hasNextPage && (
        <Button
          className="w-full"
          disabled={notifications.isFetchingNextPage}
          onClick={() => void notifications.fetchNextPage()}
          type="button"
          variant="outline"
        >
          {notifications.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
        </Button>
      )}
    </SheetContent>
  );
}

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

import { useMarkNotificationRead, useNotifications } from '../api';
import { describeNotification } from '../notification-text';
import { receivedText } from '../received-text';
import { NotificationRow } from './notification-row';

// El contenido del panel de la campana. Solo pide la lista mientras está abierto. Abrir una
// notificación la marca como leída, cierra el panel y lleva a su actividad.
export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { data: user } = useSession();
  const notifications = useNotifications(user?.id);
  const markRead = useMarkNotificationRead();
  const items = notifications.data?.pages.flatMap(({ results }) => results);
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
              <NotificationRow
                critical={notification.severity === 'critical'}
                onOpen={() => {
                  if (!notification.read_at) markRead.mutate(notification.id);
                  onClose();
                }}
                received={receivedText(notification.created_at, now)}
                unread={!notification.read_at}
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

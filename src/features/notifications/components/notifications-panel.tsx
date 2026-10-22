'use client';

import { CloudOff, Info } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { AllDone } from '@/components/illustrations/all-done';
import { PushNoticeCard } from '@/components/push/push-notice-card';
import { Button } from '@/components/ui/button';
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { todayInBogota } from '@/lib/format/dates';
import { LoadingBlock } from '@/components/loading-block';

import { useNotifications, useUnreadCount } from '../api';
import { describeNotification } from '../notification-text';
import { receivedText } from '../received-text';
import { NotificationItem } from './notification-item';
import {
  NEEDS_CONNECTION_ID,
  NotificationsActions,
} from './notifications-actions';

// El contenido del panel de la campana. Solo pide la lista mientras está abierto. Sin conexión
// muestra lo último que se cargó, abre las actividades sin marcarlas y no deja marcar ni eliminar:
// no hay cola para eso, porque leer un aviso se puede repetir sin costo cuando vuelva la red.
export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { data: user } = useSession();
  const notifications = useNotifications(user?.id);
  const unread = useUnreadCount(user?.id).data?.data.count ?? 0;
  const items = notifications.data?.pages.flatMap(({ results }) => results);
  // Las leídas son las que hay menos las sin leer: la lista no las cuenta aparte.
  const total = notifications.data?.pages[0]?.total ?? 0;
  const read = Math.max(0, total - unread);
  const offline = !useHasConnection();
  const saved = notifications.data?.pages[0]?.savedAt !== undefined;
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
      <PushNoticeCard place="panel" />
      {(offline || saved) && (
        <p className="flex items-center gap-2 rounded-md bg-info-bg px-3 py-2 text-sm font-bold text-info">
          <CloudOff aria-hidden="true" className="size-4 shrink-0" />
          Sin conexión · se muestran las notificaciones guardadas
        </p>
      )}
      <NotificationsActions offline={offline} read={read} unread={unread} />
      {offline && (
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          id={NEEDS_CONNECTION_ID}
        >
          <Info aria-hidden="true" className="size-4 shrink-0" />
          Marcar y eliminar notificaciones necesita conexión.
        </p>
      )}
      {notifications.isPending && (
        <LoadingBlock label="Cargando notificaciones" shapes={['h-48']} />
      )}
      {notifications.isError && offline && (
        <p className="text-muted-foreground">
          Sin conexión, y este dispositivo no tiene notificaciones guardadas.
        </p>
      )}
      {notifications.isError && !offline && (
        <ErrorState
          message="No fue posible cargar las notificaciones."
          onRetry={() => void notifications.refetch()}
        />
      )}
      {items?.length === 0 && (
        <EmptyState
          description="Cuando una actividad se acerque a su fecha o se pase, o un control quede pendiente, aparecerá aquí."
          illustration={AllDone}
          title="Estás al día"
        />
      )}
      {!!items?.length && (
        <ul aria-label="Notificaciones" className="space-y-2">
          {items.map((notification) => (
            <li key={notification.id}>
              <NotificationItem
                notification={notification}
                offline={offline}
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

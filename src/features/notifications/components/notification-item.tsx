'use client';

import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api/errors';
import { notify } from '@/lib/notify';

import {
  type Notification,
  useDismissNotification,
  useMarkNotificationRead,
  useRestoreNotification,
} from '../api';
import type { NotificationView } from '../notification-text';
import { NotificationRow } from './notification-row';

// Una notificación con lo que se hace con ella: abrirla la marca como leída; eliminarla no
// pregunta, porque es una sola, y se deshace desde el aviso.
export function NotificationItem({
  notification,
  view,
  received,
  onClose,
}: {
  notification: Notification;
  view: NotificationView;
  received: string;
  onClose: () => void;
}) {
  const markRead = useMarkNotificationRead();
  const dismiss = useDismissNotification();
  const restore = useRestoreNotification();
  const unread = !notification.read_at;

  const remove = () =>
    dismiss.mutate(notification.id, {
      onSuccess: () =>
        notify.success('Notificación eliminada', {
          action: {
            label: 'Deshacer',
            onClick: () =>
              restore.mutate(notification.id, {
                onError: () =>
                  notify.error('No fue posible recuperar la notificación.'),
              }),
          },
        }),
      onError: (error) =>
        notify.error(
          getErrorMessage(error, 'No fue posible eliminar la notificación.'),
        ),
    });

  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">
        <NotificationRow
          critical={notification.severity === 'critical'}
          onOpen={() => {
            if (unread) markRead.mutate(notification.id);
            onClose();
          }}
          received={received}
          unread={unread}
          view={view}
        />
      </div>
      <Button
        aria-label="Eliminar notificación"
        className="size-11 shrink-0 text-muted-foreground"
        disabled={dismiss.isPending}
        onClick={remove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}

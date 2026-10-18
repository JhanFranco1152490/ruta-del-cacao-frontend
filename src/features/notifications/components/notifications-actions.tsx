'use client';

import { CheckCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { Button } from '@/components/ui/button';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { getErrorMessage } from '@/lib/api/errors';
import { notify } from '@/lib/notify';

import {
  useDismissReadNotifications,
  useMarkAllNotificationsRead,
} from '../api';

const dismissReadAction = (read: number): StatusChangeAction => ({
  trigger: 'Eliminar las leídas',
  title:
    read === 1
      ? '¿Eliminar 1 notificación leída?'
      : `¿Eliminar ${read} notificaciones leídas?`,
  description:
    'Dejan de verse en la bandeja y no vuelven a llegar. Las que no has leído se quedan.',
  confirm: 'Eliminar',
  pending: 'Eliminando…',
  Icon: Trash2,
  variant: 'destructive',
});

// El motivo de que marcar y eliminar estén deshabilitados, que el panel muestra sin conexión.
export const NEEDS_CONNECTION_ID = 'notifications-needs-connection';

// Las acciones de toda la bandeja: cada una solo aparece si hay algo que marcar o eliminar.
// Eliminar las leídas pide confirmar, porque son varias de una vez.
export function NotificationsActions({
  unread,
  read,
  offline,
}: {
  unread: number;
  read: number;
  offline: boolean;
}) {
  const needsConnection = offline ? NEEDS_CONNECTION_ID : undefined;
  const markAll = useMarkAllNotificationsRead();
  const dismissRead = useDismissReadNotifications();
  const [confirming, setConfirming] = useState(false);
  const dialog = useConfirmAction(
    () => dismissRead.mutateAsync(),
    (error) =>
      getErrorMessage(error, 'No fue posible eliminar las notificaciones.'),
    { open: confirming, onOpenChange: setConfirming },
  );

  if (unread === 0 && read === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {unread > 0 && (
        <Button
          aria-describedby={needsConnection}
          disabled={offline || markAll.isPending}
          onClick={() =>
            markAll.mutate(undefined, {
              onError: (error) =>
                notify.error(
                  getErrorMessage(
                    error,
                    'No fue posible marcar las notificaciones como leídas.',
                  ),
                ),
            })
          }
          size="office"
          type="button"
          variant="action"
        >
          <CheckCheck aria-hidden="true" className="size-4" /> Marcar todas como
          leídas
        </Button>
      )}
      {read > 0 && (
        <Button
          aria-describedby={needsConnection}
          disabled={offline}
          onClick={() => setConfirming(true)}
          size="office"
          type="button"
          variant="action"
        >
          <Trash2 aria-hidden="true" className="size-4" /> Eliminar las leídas
        </Button>
      )}
      <StatusChangeDialog action={dismissReadAction(read)} {...dialog} />
    </div>
  );
}

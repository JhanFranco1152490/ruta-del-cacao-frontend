import { QueueDiscardDialog } from '@/components/sync-tray/queue-discard-dialog';
import type { QueueView } from '@/components/sync-tray/queue-view';
import type { QueueItem } from '@/lib/offline/db';

import { CONTROL_RESOURCE, controlPayloadOf } from './control-queue';
import { useDiscardControl } from './use-control-actions';

// Un control que espera conexión no ofrece nada: todavía puede llegar bien. El que el servidor
// rechazó solo se descarta: se vuelve a crear desde su detección, con lo que el servidor dijo.
function ControlQueueActions({ item }: { item: QueueItem }) {
  const discard = useDiscardControl();
  if (item.status !== 'error') return null;
  const { request, label } = controlPayloadOf(item);
  return (
    <QueueDiscardDialog
      description="Se borrará de este dispositivo y no se enviará al servidor. Puedes volver a crearlo desde la detección."
      onDiscard={() => discard.mutateAsync(request.id)}
      successMessage="Control pendiente descartado"
      title={`¿Descartar el control de ${label}?`}
    />
  );
}

export const controlQueueView: QueueView = {
  resource: CONTROL_RESOURCE,
  kind: 'Control fitosanitario',
  title: (item) => controlPayloadOf(item).label,
  Actions: ControlQueueActions,
};

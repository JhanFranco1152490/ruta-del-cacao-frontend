import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { QueueDiscardDialog } from '@/components/sync-tray/queue-discard-dialog';
import type { QueueView } from '@/components/sync-tray/queue-view';
import { buttonVariants } from '@/components/ui/button';
import type { QueueItem } from '@/lib/offline/db';

import { monitoringPath } from './health-paths';
import { MONITORING_RESOURCE, queuedMonitoringOf } from './monitoring-queue';
import { isCorrectableMonitoringError } from './monitoring-sync-adapter';
import { useDiscardMonitoring } from './use-monitoring-queue';

// Un resultado que espera conexión no ofrece nada: todavía puede llegar bien. El que el servidor
// rechazó se descarta, y se corrige solo si corregirlo sirve de algo.
function MonitoringQueueActions({
  item,
  onNavigate,
}: {
  item: QueueItem;
  onNavigate: () => void;
}) {
  const monitoring = queuedMonitoringOf(item);
  const discard = useDiscardMonitoring();
  if (monitoring.status !== 'error') return null;

  return (
    <div className="flex flex-wrap gap-3">
      {isCorrectableMonitoringError(monitoring.errorCode) && (
        <Link
          aria-label={`Corregir ${monitoring.label}`}
          className={buttonVariants({ variant: 'outline', className: 'h-11' })}
          href={monitoringPath(monitoring.activityId)}
          onClick={onNavigate}
        >
          <Pencil aria-hidden="true" className="size-4" /> Corregir
        </Link>
      )}
      <QueueDiscardDialog
        description="Se borrará de este dispositivo y no se enviará al servidor. El monitoreo queda como estaba."
        onDiscard={() => discard.mutateAsync(monitoring.activityId)}
        successMessage="Monitoreo pendiente descartado"
        title={`¿Descartar el monitoreo de ${monitoring.label}?`}
      />
    </div>
  );
}

// Los resultados de monitoreo en la bandeja, nombrados por su parcela y su fecha.
export const monitoringQueueView: QueueView = {
  resource: MONITORING_RESOURCE,
  kind: 'Monitoreo',
  title: (item) => queuedMonitoringOf(item).label,
  Actions: MonitoringQueueActions,
};

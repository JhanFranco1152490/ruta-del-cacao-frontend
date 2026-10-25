import { Pencil } from 'lucide-react';
import Link from 'next/link';

import type { QueueView } from '@/components/sync-tray/queue-view';
import { buttonVariants } from '@/components/ui/button';
import type { QueueItem } from '@/lib/offline/db';

import { LogDiscardDialog } from './components/log-discard-dialog';
import { queuedLogCorrectionPath } from './drying-paths';
import { LOG_RESOURCE, queuedLogOf } from './log-queue';
import { isCorrectableLogError } from './log-sync-adapter';

// Una bitácora que espera conexión no ofrece nada: todavía puede llegar bien. La que el servidor
// rechazó se descarta, y se corrige solo si corregirla sirve de algo.
function LogQueueActions({
  item,
  onNavigate,
}: {
  item: QueueItem;
  onNavigate: () => void;
}) {
  const log = queuedLogOf(item);
  if (log.status !== 'error') return null;

  return (
    <div className="flex flex-wrap gap-3">
      {isCorrectableLogError(log.errorCode) && (
        <Link
          aria-label={`Corregir ${log.label}`}
          className={buttonVariants({ variant: 'outline', className: 'h-11' })}
          href={queuedLogCorrectionPath(log.lotId, log.id)}
          onClick={onNavigate}
        >
          <Pencil aria-hidden="true" className="size-4" /> Corregir
        </Link>
      )}
      <LogDiscardDialog label={log.label} logId={log.id} />
    </div>
  );
}

// Las bitácoras en la bandeja, nombradas por su lote, su día y su fecha.
export const logQueueView: QueueView = {
  resource: LOG_RESOURCE,
  kind: 'Bitácora',
  title: (item) => queuedLogOf(item).label,
  Actions: LogQueueActions,
};

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import type { QueueView } from '@/components/sync-tray/queue-view';
import { buttonVariants } from '@/components/ui/button';
import type { QueueItem } from '@/lib/offline/db';

import { HarvestDiscardDialog } from './components/harvest-discard-dialog';
import { queuedHarvestCorrectionPath } from './harvest-paths';
import { HARVEST_RESOURCE, queuedHarvestOf } from './harvest-queue';
import { isCorrectableHarvestError } from './sync-adapter';

// Una cosecha que espera conexión no ofrece nada: todavía puede llegar bien. La que el servidor
// rechazó se descarta, y se corrige solo si corregirla sirve de algo.
function HarvestQueueActions({
  item,
  onNavigate,
}: {
  item: QueueItem;
  onNavigate: () => void;
}) {
  const harvest = queuedHarvestOf(item);
  if (harvest.status !== 'error') return null;

  return (
    <div className="flex flex-wrap gap-3">
      {isCorrectableHarvestError(harvest.errorCode) && (
        <Link
          aria-label={`Corregir ${harvest.label}`}
          className={buttonVariants({ variant: 'outline', className: 'h-11' })}
          href={queuedHarvestCorrectionPath(harvest.id)}
          onClick={onNavigate}
        >
          <Pencil aria-hidden="true" className="size-4" /> Corregir
        </Link>
      )}
      <HarvestDiscardDialog harvestId={harvest.id} label={harvest.label} />
    </div>
  );
}

// Las cosechas en la bandeja, nombradas por su parcela y su fecha.
export const harvestQueueView: QueueView = {
  resource: HARVEST_RESOURCE,
  kind: 'Cosecha',
  title: (item) => queuedHarvestOf(item).label,
  Actions: HarvestQueueActions,
};

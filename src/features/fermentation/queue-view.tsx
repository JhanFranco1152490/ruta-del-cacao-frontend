import { Pencil } from 'lucide-react';
import Link from 'next/link';

import type { QueueView } from '@/components/sync-tray/queue-view';
import { buttonVariants } from '@/components/ui/button';
import type { QueueItem } from '@/lib/offline/db';

import { TurnDiscardDialog } from './components/turn-discard-dialog';
import { queuedTurnCorrectionPath } from './fermentation-paths';
import { isCorrectableTurnError } from './sync-adapter';
import { queuedTurnOf, TURN_RESOURCE } from './turn-queue';

// Un volteo que espera conexión no ofrece nada: todavía puede llegar bien. El que el servidor
// rechazó se descarta, y se corrige solo si corregirlo sirve de algo.
function TurnQueueActions({
  item,
  onNavigate,
}: {
  item: QueueItem;
  onNavigate: () => void;
}) {
  const turn = queuedTurnOf(item);
  if (turn.status !== 'error') return null;

  return (
    <div className="flex flex-wrap gap-3">
      {isCorrectableTurnError(turn.errorCode) && (
        <Link
          aria-label={`Corregir ${turn.label}`}
          className={buttonVariants({ variant: 'outline', className: 'h-11' })}
          href={queuedTurnCorrectionPath(turn.lotId, turn.id)}
          onClick={onNavigate}
        >
          <Pencil aria-hidden="true" className="size-4" /> Corregir
        </Link>
      )}
      <TurnDiscardDialog label={turn.label} turnId={turn.id} />
    </div>
  );
}

// Los volteos en la bandeja, nombrados por su lote, su número y su hora.
export const turnQueueView: QueueView = {
  resource: TURN_RESOURCE,
  kind: 'Volteo',
  title: (item) => queuedTurnOf(item).label,
  Actions: TurnQueueActions,
};
